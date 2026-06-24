// ============================================================
// What if Doggy – Validierungslogik
//
// Prüft ob der aktuelle Spielstand Regelverletzungen enthält:
//   1. Genau 1 Hund pro Zeile
//   2. Genau 1 Hund pro Spalte
//   3. Genau 1 Hund pro Region
//   4. Keine zwei Hunde benachbart (auch diagonal)
//
// Gibt für jede Verletzung die beteiligten Zellen zurück,
// damit sie im UI rot markiert werden können.
// ============================================================

import type { GridState, Puzzle, ValidationResult, ValidationError } from '../types';

/** Gibt alle Zellen zurück, in denen ein Hund platziert ist. */
export function getDogPositions(grid: GridState): Array<{ row: number; col: number }> {
  const positions: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c].state === 'dog') {
        positions.push({ row: r, col: c });
      }
    }
  }
  return positions;
}

/**
 * Führt die vollständige Regelprüfung durch.
 * Gibt alle Konfliktzellen und -fehler zurück.
 */
export function validateGrid(grid: GridState, puzzle: Puzzle): ValidationResult {
  const errors: ValidationError[] = [];
  const conflictSet = new Set<string>();

  const key = (r: number, c: number) => `${r},${c}`;
  const addConflicts = (cells: Array<{ row: number; col: number }>) =>
    cells.forEach(({ row, col }) => conflictSet.add(key(row, col)));

  const dogs = getDogPositions(grid);

  // ── 1. Zeilen-Check ────────────────────────────────────────
  const rowMap = new Map<number, Array<{ row: number; col: number }>>();
  for (const pos of dogs) {
    const bucket = rowMap.get(pos.row) ?? [];
    bucket.push(pos);
    rowMap.set(pos.row, bucket);
  }
  for (const [row, cells] of rowMap) {
    if (cells.length > 1) {
      errors.push({
        type: 'row_duplicate',
        cells,
        message: `Zeile ${row + 1}: ${cells.length} Hunde (erlaubt: 1)`,
      });
      addConflicts(cells);
    }
  }

  // ── 2. Spalten-Check ───────────────────────────────────────
  const colMap = new Map<number, Array<{ row: number; col: number }>>();
  for (const pos of dogs) {
    const bucket = colMap.get(pos.col) ?? [];
    bucket.push(pos);
    colMap.set(pos.col, bucket);
  }
  for (const [col, cells] of colMap) {
    if (cells.length > 1) {
      errors.push({
        type: 'col_duplicate',
        cells,
        message: `Spalte ${col + 1}: ${cells.length} Hunde (erlaubt: 1)`,
      });
      addConflicts(cells);
    }
  }

  // ── 3. Regionen-Check ──────────────────────────────────────
  const regionMap = new Map<number, Array<{ row: number; col: number }>>();
  for (const pos of dogs) {
    const regionId = puzzle.regionMap[pos.row][pos.col];
    const bucket = regionMap.get(regionId) ?? [];
    bucket.push(pos);
    regionMap.set(regionId, bucket);
  }
  for (const [regionId, cells] of regionMap) {
    if (cells.length > 1) {
      const region = puzzle.regions.find(r => r.id === regionId);
      errors.push({
        type: 'region_duplicate',
        cells,
        message: `${region?.label ?? `Region ${regionId}`}: ${cells.length} Hunde (erlaubt: 1)`,
      });
      addConflicts(cells);
    }
  }

  // ── 4. Adjacenz-Check ──────────────────────────────────────
  for (let i = 0; i < dogs.length; i++) {
    for (let j = i + 1; j < dogs.length; j++) {
      const a = dogs[i];
      const b = dogs[j];
      if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1) {
        errors.push({
          type: 'adjacency',
          cells: [a, b],
          message: `Hunde bei (${a.row + 1},${a.col + 1}) und (${b.row + 1},${b.col + 1}) sind benachbart`,
        });
        addConflicts([a, b]);
      }
    }
  }

  const conflicts = Array.from(conflictSet).map(k => {
    const [r, c] = k.split(',').map(Number);
    return { row: r, col: c };
  });

  return {
    valid: errors.length === 0,
    conflicts,
    errors,
  };
}

/**
 * Prüft ob das Puzzle gewonnen ist:
 * - Keine Konflikte
 * - Genau N Hunde platziert (eine pro Zeile/Spalte/Region)
 */
export function isWon(grid: GridState, puzzle: Puzzle): boolean {
  const dogs = getDogPositions(grid);
  if (dogs.length !== puzzle.size) return false;

  const result = validateGrid(grid, puzzle);
  return result.valid;
}

/**
 * Gibt einen Hint zurück: die Zelle, die am sichersten korrekt ist
 * (aus der offiziellen Lösung), aber noch nicht korrekt platziert.
 */
export function getHint(grid: GridState, puzzle: Puzzle): { row: number; col: number } | null {
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (puzzle.solution[r][c] && grid[r][c].state !== 'dog') {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/**
 * Gibt eine Map zurück, welche Zellen definitiv kein Hund sein können
 * (basierend auf bereits platzierten Hunden).
 * Nützlich für automatische Markierungen.
 */
export function getAutoExcluded(grid: GridState, puzzle: Puzzle): Set<string> {
  const dogs = getDogPositions(grid);
  const excluded = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;

  for (const { row, col } of dogs) {
    const regionId = puzzle.regionMap[row][col];

    // Alle anderen Zellen in derselben Zeile, Spalte, Region und Nachbarschaft
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (r === row && c === col) continue;
        if (
          r === row ||                              // gleiche Zeile
          c === col ||                              // gleiche Spalte
          puzzle.regionMap[r][c] === regionId ||   // gleiche Region
          (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) // benachbart
        ) {
          excluded.add(key(r, c));
        }
      }
    }
  }

  return excluded;
}
