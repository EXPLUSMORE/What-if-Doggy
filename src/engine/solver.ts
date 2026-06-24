// ============================================================
// What if Doggy – Constraint Solver
//
// Strategie: Backtracking mit Constraint Propagation
//
// 1. Wir iterieren Zeile für Zeile (garantiert "genau 1 Hund/Zeile").
// 2. Pro Zeile testen wir alle Spalten als Kandidaten.
// 3. Für jeden Kandidaten prüfen wir sofort:
//    a) Spalte noch frei?
//    b) Region noch frei?
//    c) Kein adjazenter Hund (horizontal / vertikal / diagonal)?
// 4. Ist der Kandidat gültig, werden belegte Spalten/Regionen
//    weitergetragen (implizite Constraint Propagation).
// 5. Wir zählen Lösungen; bei > 1 brechen wir ab (→ nicht eindeutig).
// ============================================================

import type { Puzzle } from '../types';

/** Ergebnis des Solvers */
export interface SolverResult {
  /** Gefundene Lösungen (max. 2, um Eindeutigkeit zu prüfen) */
  solutions: boolean[][][];
  /** true ↔ genau eine Lösung existiert */
  unique: boolean;
}

/**
 * Prüft ob zwei Positionen diagonal, horizontal oder vertikal benachbart sind.
 */
function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
}

/**
 * Rekursiver Backtracking-Solver.
 *
 * @param size         Gittergröße
 * @param regionMap    regionMap[row][col] = regionId
 * @param row          Aktuelle Zeile
 * @param usedCols     Set belegter Spalten
 * @param usedRegions  Set belegter Regionen
 * @param placed       Bereits platzierte Hunde [{row,col}]
 * @param solutions    Gesammelte Lösungen (als flat col-Array, Länge = size)
 * @param limit        Wie viele Lösungen maximal gesucht werden (default 2)
 */
function solve(
  size: number,
  regionMap: ReadonlyArray<ReadonlyArray<number>>,
  row: number,
  usedCols: Set<number>,
  usedRegions: Set<number>,
  placed: Array<{ row: number; col: number }>,
  solutions: boolean[][],
  limit: number,
): void {
  // Abbruch: genug Lösungen gefunden
  if (solutions.length >= limit) return;

  // Alle Zeilen besetzt → Lösung gefunden
  if (row === size) {
    const grid = Array.from({ length: size }, () => Array(size).fill(false) as boolean[]);
    for (const { row: r, col: c } of placed) grid[r][c] = true;
    solutions.push(grid.flat() as boolean[]);
    return;
  }

  for (let col = 0; col < size; col++) {
    if (usedCols.has(col)) continue;

    const region = regionMap[row][col];
    if (usedRegions.has(region)) continue;

    // Adjazenzprüfung gegen alle bereits platzierten Hunde
    let adjacent = false;
    for (const p of placed) {
      if (isAdjacent(row, col, p.row, p.col)) {
        adjacent = true;
        break;
      }
    }
    if (adjacent) continue;

    // Kandidat gültig → rekursiv weiter
    usedCols.add(col);
    usedRegions.add(region);
    placed.push({ row, col });

    solve(size, regionMap, row + 1, usedCols, usedRegions, placed, solutions, limit);

    // Backtrack
    placed.pop();
    usedCols.delete(col);
    usedRegions.delete(region);

    if (solutions.length >= limit) return;
  }
}

/**
 * Öffentliche Solver-API.
 * Gibt bis zu 2 Lösungen zurück; `unique` ist true ↔ genau 1 Lösung.
 */
export function solvePuzzle(puzzle: Pick<Puzzle, 'size' | 'regionMap'>): SolverResult {
  const flatSolutions: boolean[][] = [];

  solve(
    puzzle.size,
    puzzle.regionMap,
    0,
    new Set<number>(),
    new Set<number>(),
    [],
    flatSolutions,
    2,
  );

  const solutions = flatSolutions.map(flat => {
    const grid: boolean[][] = [];
    for (let r = 0; r < puzzle.size; r++) {
      grid.push(flat.slice(r * puzzle.size, (r + 1) * puzzle.size) as boolean[]);
    }
    return grid;
  });

  return { solutions, unique: solutions.length === 1 };
}

/**
 * Prüft ob ein gegebenes regionMap eine eindeutige Lösung hat.
 * Schnelle Utility-Funktion für den Generator.
 */
export function hasUniqueSolution(
  size: number,
  regionMap: ReadonlyArray<ReadonlyArray<number>>,
): boolean {
  const flatSolutions: boolean[][] = [];
  solve(size, regionMap, 0, new Set(), new Set(), [], flatSolutions, 2);
  return flatSolutions.length === 1;
}

/**
 * Findet alle Lösungen bis zum angegebenen Limit.
 * Nützlich für das Lösungs-Modal, um mehrere Lösungen anzuzeigen.
 */
export function getAllSolutions(
  size: number,
  regionMap: ReadonlyArray<ReadonlyArray<number>>,
  limit = 10,
): boolean[][][] {
  const flatSolutions: boolean[][] = [];
  solve(size, regionMap, 0, new Set(), new Set(), [], flatSolutions, limit);
  return flatSolutions.map(flat => {
    const grid: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      grid.push(flat.slice(r * size, (r + 1) * size) as boolean[]);
    }
    return grid;
  });
}

/**
 * Gibt die eindeutige Lösung zurück oder null wenn keine/mehrere existieren.
 */
export function getUniqueSolution(
  size: number,
  regionMap: ReadonlyArray<ReadonlyArray<number>>,
): boolean[][] | null {
  const flatSolutions: boolean[][] = [];
  solve(size, regionMap, 0, new Set(), new Set(), [], flatSolutions, 2);
  if (flatSolutions.length !== 1) return null;

  const flat = flatSolutions[0];
  const grid: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    grid.push(flat.slice(r * size, (r + 1) * size) as boolean[]);
  }
  return grid;
}
