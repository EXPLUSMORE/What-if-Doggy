// ============================================================
// What if Doggy – Constraint Solver (optimiert)
//
// Strategie: Backtracking mit Bitmask-Optimierung
//
// 1. Wir iterieren Zeile für Zeile (garantiert "genau 1 Hund/Zeile").
// 2. colMask, regMask: 32-Bit-Bitmasks statt Set<number> → ~3× schneller.
// 3. adjMask: Bitmask der in der aktuellen Zeile durch Diagonalen
//    verbotenen Spalten – wird pro Schritt in O(1) propagiert;
//    ersetzt den O(n)-Loop über alle platzierten Hunde.
// 4. Wir zählen Lösungen; bei > 1 brechen wir ab (→ nicht eindeutig).
// ============================================================

import type { Puzzle } from '../types';

/** Ergebnis des Solvers */
export interface SolverResult {
  /** Gefundene Lösungen (max. 2, um Eindeutigkeit zu prüfen) */
  solutions: boolean[][][];
  /** true ↔ genau eine Lösung existiert */
  unique: boolean;
}

// ── Interne schnelle Lösung (speichert nur col-per-row) ──────

/**
 * Bitmask-Backtracking: schnellste Variante für den Generator.
 * solutions[i] = Int8Array der Länge size mit solutions[i][row] = col.
 */
function solveFast(
  size: number,
  regionMap: ReadonlyArray<ReadonlyArray<number>>,
  row: number,
  colMask: number,   // Bitmask belegter Spalten
  regMask: number,   // Bitmask belegter Regionen
  adjMask: number,   // Bitmask der durch Diagonalen verbotenen Spalten dieser Zeile
  current: Int8Array,
  solutions: Int8Array[],
  limit: number,
): void {
  if (solutions.length >= limit) return;

  if (row === size) {
    solutions.push(current.slice());
    return;
  }

  const forbidden = colMask | adjMask;
  for (let col = 0; col < size; col++) {
    const colBit = 1 << col;
    if (forbidden & colBit) continue;

    const region = regionMap[row][col];
    const regBit = 1 << region;
    if (regMask & regBit) continue;

    current[row] = col;

    // Adjazenz-Propagation: nächste Zeile sperrt col-1, col, col+1
    const newAdj =
      colBit |
      (col > 0 ? (1 << (col - 1)) : 0) |
      (col < size - 1 ? (1 << (col + 1)) : 0);

    solveFast(
      size, regionMap, row + 1,
      colMask | colBit,
      regMask | regBit,
      newAdj,
      current, solutions, limit,
    );

    if (solutions.length >= limit) return;
  }
}

// ── Interne Hilfsfunktionen ──────────────────────────────────

/** Konvertiert Int8Array (col-per-row) in boolean[][] */
function colsToGrid(cols: Int8Array, size: number): boolean[][] {
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  for (let r = 0; r < size; r++) grid[r][cols[r]] = true;
  return grid;
}

// ── Öffentliche Solver-API ───────────────────────────────────

/**
 * Öffentliche Solver-API.
 * Gibt bis zu 2 Lösungen zurück; `unique` ist true ↔ genau 1 Lösung.
 */
export function solvePuzzle(puzzle: Pick<Puzzle, 'size' | 'regionMap'>): SolverResult {
  const { size, regionMap } = puzzle;
  const rawSolutions: Int8Array[] = [];
  solveFast(size, regionMap, 0, 0, 0, 0, new Int8Array(size), rawSolutions, 2);

  const solutions = rawSolutions.map(cols => colsToGrid(cols, size));
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
  const rawSolutions: Int8Array[] = [];
  solveFast(size, regionMap, 0, 0, 0, 0, new Int8Array(size), rawSolutions, 2);
  return rawSolutions.length === 1;
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
  const rawSolutions: Int8Array[] = [];
  solveFast(size, regionMap, 0, 0, 0, 0, new Int8Array(size), rawSolutions, limit);
  return rawSolutions.map(cols => colsToGrid(cols, size));
}

/**
 * Gibt die eindeutige Lösung zurück oder null wenn keine/mehrere existieren.
 */
export function getUniqueSolution(
  size: number,
  regionMap: ReadonlyArray<ReadonlyArray<number>>,
): boolean[][] | null {
  const rawSolutions: Int8Array[] = [];
  solveFast(size, regionMap, 0, 0, 0, 0, new Int8Array(size), rawSolutions, 2);
  if (rawSolutions.length !== 1) return null;
  return colsToGrid(rawSolutions[0], size);
}

/**
 * Interne Funktion für den Generator: gibt col-per-row zurück (kein bool[][]).
 * Signifikant schneller als solvePuzzle, da keine Konvertierung.
 */
export function solveForGenerator(
  size: number,
  regionMap: ReadonlyArray<ReadonlyArray<number>>,
): Int8Array[] {
  const rawSolutions: Int8Array[] = [];
  solveFast(size, regionMap, 0, 0, 0, 0, new Int8Array(size), rawSolutions, 2);
  return rawSolutions;
}
