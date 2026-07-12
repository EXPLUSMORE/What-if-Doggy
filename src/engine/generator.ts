// ============================================================
// What if Doggy – Puzzle-Generator (optimiert)
//
// Algorithmus:
// 1. Seed-basierter PRNG (mulberry32)
// 2. Gültige Lösung via Backtracking mit Bitmask (schnell)
// 3. Initiale Regionen via Manhattan-Voronoi
// 4. pruneToUnique: Grenzzellen werden iterativ verschoben,
//    bis der Solver genau 1 Lösung findet.
//    Konnektivität der Regionen wird per BFS geprüft.
//    Intern: solveForGenerator (col-per-row, kein bool[][]) +
//    stark reduziertes maxIter → Expert/Master < 3 Sekunden.
// ============================================================

import type { Puzzle, Region, Difficulty } from '../types';
import { REGION_COLORS } from '../types';
import { getUniqueSolution, solveForGenerator } from './solver';

// ── PRNG ──────────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedToNumber(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Lösung erzeugen (Bitmask-optimiert) ───────────────────────
/**
 * Generiert eine gültige Platzierung (1 Hund/Zeile, Spalte, keine Adj.)
 * Bitmask-Optimierung: colMask + adjMask ersetzen Set und placed.some()
 */
function generateSolution(size: number, rand: () => number): number[] | null {
  const cols = Array.from({ length: size }, (_, i) => i);
  const placed: number[] = [];

  function bt(row: number, colMask: number, adjMask: number): boolean {
    if (row === size) return true;
    for (const col of shuffle([...cols], rand)) {
      const colBit = 1 << col;
      if (colMask & colBit) continue;
      if (adjMask & colBit) continue;

      placed.push(col);
      const newAdj =
        colBit |
        (col > 0 ? (1 << (col - 1)) : 0) |
        (col < size - 1 ? (1 << (col + 1)) : 0);

      if (bt(row + 1, colMask | colBit, newAdj)) return true;
      placed.pop();
    }
    return false;
  }

  return bt(0, 0, 0) ? placed : null;
}

// ── Voronoi-Startregionen ─────────────────────────────────────
function voronoiRegions(size: number, seeds: Array<{ row: number; col: number }>): number[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      let best = 0, bestDist = Infinity;
      for (let id = 0; id < seeds.length; id++) {
        const d = Math.abs(r - seeds[id].row) + Math.abs(c - seeds[id].col);
        if (d < bestDist) { bestDist = d; best = id; }
      }
      return best;
    }),
  );
}

// ── Konnektivitätsprüfung (optimiert: kein Array.shift) ──────
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

function isConnected(size: number, map: number[][], regionId: number): boolean {
  // BFS mit Index-Pointer statt shift() → O(1) amortisiert
  let startIdx = -1, count = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (map[r][c] === regionId) { count++; if (startIdx < 0) startIdx = r * size + c; }

  if (count <= 1) return true;

  const visited = new Uint8Array(size * size);
  visited[startIdx] = 1;
  const queue: number[] = [startIdx];
  let head = 0, visitCount = 1;

  while (head < queue.length) {
    const key = queue[head++];
    const r = (key / size) | 0, c = key % size;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (map[nr][nc] !== regionId) continue;
      const k = nr * size + nc;
      if (!visited[k]) { visited[k] = 1; visitCount++; queue.push(k); }
    }
  }
  return visitCount === count;
}

// ── Iterative Grenzbereinigung ────────────────────────────────
/**
 * Verschiebt Grenzzellen zwischen Regionen, bis der Solver genau
 * eine Lösung findet. Seed-Zellen werden niemals verschoben.
 * Konnektivität wird nach jeder Verschiebung geprüft.
 *
 * Optimierungen gegenüber V1:
 * - Nutzt solveForGenerator (col-per-row Int8Array, kein bool[][])
 * - Stark reduziertes maxIter (300-400 statt 6480): verhindert, dass
 *   nicht-konvergente Seeds Sekunden verbrauchen; Neustart mit
 *   neuem Seed ist immer günstiger als unbegrenztes Iterieren.
 */
function pruneToUnique(
  size: number,
  initialMap: number[][],
  seeds: Array<{ row: number; col: number }>,
): number[][] | null {
  const seedSet = new Set(seeds.map(s => s.row * size + s.col));
  const map = initialMap.map(r => [...r]);

  // KRITISCH: maxIter niedrig halten → misslungene Versuche enden schnell.
  // Erfolgreiche Versuche konvergieren typisch in 30-165 Iterationen.
  // Für size ≥ 11 bewusst 250 statt 350: jeder Fehlschlag kostet ~875 ms
  // statt ~1250 ms; das hält die Gesamtzeit verlässlich unter 5 Sekunden.
  const maxIter = size <= 8 ? 200 : size <= 10 ? 250 : 250;

  for (let iter = 0; iter < maxIter; iter++) {
    const result = solveForGenerator(size, map as ReadonlyArray<ReadonlyArray<number>>);

    if (result.length === 1) return map;   // eindeutig → fertig
    if (result.length === 0) return null;  // keine Lösung

    // Zelle aus Lösung 2, die in Lösung 1 nicht vorkommt, verschieben
    const s2 = result[1]; // Int8Array: s2[row] = col

    // Rotierende Startreihe verhindert 2-Zyklen:
    // iter 0 wählt row 0 zuerst, iter 1 wählt row 1 zuerst usw. →
    // dieselbe Zelle wird nie zwei Mal in Folge verschoben.
    let moved = false;
    outer: for (let ri = 0; ri < size; ri++) {
      const r = (ri + iter) % size;
      const c = s2[r];
      if (seedSet.has(r * size + c)) continue;

      const srcId = map[r][c];
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const dstId = map[nr][nc];
        if (dstId === srcId) continue;

        map[r][c] = dstId;
        if (isConnected(size, map, srcId)) { moved = true; break outer; }
        map[r][c] = srcId; // rückgängig
      }
    }

    if (!moved) {
      // Deadlock → Grenzzelle verschieben (Prim-Schrittweite für Abwechslung)
      const borderMoves: Array<[number, number, number, number]> = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (seedSet.has(r * size + c)) continue;
          const srcId = map[r][c];
          for (const [dr, dc] of DIRS) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
            if (map[nr][nc] !== srcId) borderMoves.push([r, c, nr, nc]);
          }
        }
      }
      if (borderMoves.length === 0) return null;
      const [r, c, nr, nc] = borderMoves[(iter * 37 + 13) % borderMoves.length];
      const dstId = map[nr][nc], srcId = map[r][c];
      map[r][c] = dstId;
      if (!isConnected(size, map, srcId)) map[r][c] = srcId;
    }
  }

  return null; // maxIter überschritten → mit neuem Seed versuchen
}

// ── Öffentliche API ───────────────────────────────────────────
export interface GeneratorOptions {
  size?: number;
  difficulty?: Difficulty;
  seed?: string;
}

const SIZE_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy:   6,
  medium: 8,
  hard:   10,
  expert: 11,
  master: 12,
};

export function generatePuzzle(options: GeneratorOptions = {}): Puzzle {
  const difficulty: Difficulty = options.difficulty ?? 'medium';
  const size = options.size ?? SIZE_BY_DIFFICULTY[difficulty];
  const baseSeed = options.seed ?? `${Date.now()}-${Math.random()}`;

  // Viele kurze Versuche sind besser als wenige lange (dank niedrigem maxIter).
  const maxAttempts = size <= 6 ? 30 : size <= 8 ? 80 : size <= 10 ? 200 : 500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = `${baseSeed}-${attempt}`;
    const rand = mulberry32(seedToNumber(seed));

    const sol = generateSolution(size, rand);
    if (!sol) continue;

    const seeds = sol.map((col, row) => ({ row, col }));

    // Initiale Voronoi-Regionen
    const initial = voronoiRegions(size, seeds);

    // Zur Eindeutigkeit beschneiden
    const regionMap = pruneToUnique(size, initial, seeds);
    if (!regionMap) continue;

    // Lösung vom Solver (kanonisch)
    const solutionGrid = getUniqueSolution(size, regionMap as ReadonlyArray<ReadonlyArray<number>>);
    if (!solutionGrid) continue;

    // Region-Objekte aufbauen
    const regions: Region[] = seeds.map((_, id) => ({
      id,
      color: REGION_COLORS[id % REGION_COLORS.length],
      label: `Region ${String.fromCharCode(65 + id)}`,
      cells: [] as Array<{ row: number; col: number }>,
    }));

    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        (regions[regionMap[r][c]].cells as Array<{ row: number; col: number }>)
          .push({ row: r, col: c });

    return {
      id: `${seed}-${difficulty}`,
      size,
      regions,
      regionMap: regionMap as ReadonlyArray<ReadonlyArray<number>>,
      solution: solutionGrid as ReadonlyArray<ReadonlyArray<boolean>>,
      difficulty,
      seed,
      createdAt: Date.now(),
    };
  }

  throw new Error(`Could not generate puzzle (size=${size}, difficulty=${difficulty})`);
}

export function getDailyPuzzle(date: Date = new Date(), difficulty: Difficulty = 'medium'): Puzzle {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return generatePuzzle({ difficulty, seed: `daily-${y}-${m}-${d}-${difficulty}` });
}

export function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Kampagnen-Level ───────────────────────────────────────────

/** Gesamtanzahl der Kampagnen-Level */
export const MAX_CAMPAIGN_LEVEL = 50;

export function getLevelDifficulty(level: number): Difficulty {
  if (level <= 8)  return 'easy';
  if (level <= 20) return 'medium';
  if (level <= 30) return 'hard';
  if (level <= 40) return 'expert';
  return 'master'; // 41-50
}

/** Modul-level Cache: einmal generiert, nie wieder neu berechnet */
const levelPuzzleCache = new Map<number, Puzzle>();

/** Gibt gecachtes Level-Puzzle zurück, falls vorhanden */
export function getCachedLevelPuzzle(level: number): Puzzle | undefined {
  return levelPuzzleCache.get(level);
}

export function generateLevelPuzzle(level: number): Puzzle {
  if (level <= MAX_CAMPAIGN_LEVEL) {
    const cached = levelPuzzleCache.get(level);
    if (cached) return cached;
    const difficulty = getLevelDifficulty(level);
    const puzzle = generatePuzzle({ difficulty, seed: `campaign-level-${level}-v1` });
    levelPuzzleCache.set(level, puzzle);
    return puzzle;
  }
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert', 'master'];
  const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
  return generatePuzzle({ difficulty });
}

/**
 * Vorgenerierung aller Kampagnen-Level im Hintergrund.
 * Easy-Level zuerst (schnell), Hard zuletzt.
 * Expert/Master werden NICHT prefetched (on-demand mit Worker).
 */
export function prefetchLevelPuzzles(): void {
  const order = [
    ...Array.from({ length: 8  }, (_, i) => i + 1),   // easy   1-8
    ...Array.from({ length: 12 }, (_, i) => i + 9),   // medium 9-20
    ...Array.from({ length: 10 }, (_, i) => i + 21),  // hard   21-30
  ];
  let i = 0;
  const next = () => {
    if (i >= order.length) return;
    const level = order[i++];
    if (!levelPuzzleCache.has(level)) generateLevelPuzzle(level);
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(next, { timeout: 1000 });
    } else {
      setTimeout(next, 50);
    }
  };
  setTimeout(next, 300);
}
