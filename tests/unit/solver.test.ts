import { describe, it, expect } from 'vitest';
import { solvePuzzle, hasUniqueSolution, getUniqueSolution } from '../../src/engine/solver';
import type { Puzzle } from '../../src/types';

// ── Hilfsfunktion: minimales Puzzle-Objekt ────────────────────
function makePuzzle(size: number, regionMap: number[][]): Pick<Puzzle, 'size' | 'regionMap'> {
  return { size, regionMap };
}

// ── 4×4 Beispiel mit bekannter eindeutiger Lösung ─────────────
// Regionen:
//   0 0 1 1
//   0 2 2 1
//   3 2 3 3
//   3 3 3 3
// Eindeutige Lösung: (0,2), (1,0), (2,3), (3,1)  ← row→col
const map4: number[][] = [
  [0, 0, 1, 1],
  [0, 2, 2, 1],
  [3, 2, 3, 3],
  [3, 3, 3, 3],
];

describe('Solver – solvePuzzle', () => {
  it('findet genau eine Lösung für ein eindeutiges 4×4 Puzzle', () => {
    const result = solvePuzzle(makePuzzle(4, map4));
    expect(result.unique).toBe(true);
    expect(result.solutions).toHaveLength(1);
  });

  it('Lösung enthält genau 1 Hund pro Zeile', () => {
    const { solutions } = solvePuzzle(makePuzzle(4, map4));
    const grid = solutions[0];
    for (let r = 0; r < 4; r++) {
      const dogsInRow = grid[r].filter(Boolean).length;
      expect(dogsInRow).toBe(1);
    }
  });

  it('Lösung enthält genau 1 Hund pro Spalte', () => {
    const { solutions } = solvePuzzle(makePuzzle(4, map4));
    const grid = solutions[0];
    for (let c = 0; c < 4; c++) {
      const dogsInCol = grid.map(row => row[c]).filter(Boolean).length;
      expect(dogsInCol).toBe(1);
    }
  });

  it('Keine zwei Hunde sind benachbart in der Lösung', () => {
    const { solutions } = solvePuzzle(makePuzzle(4, map4));
    const grid = solutions[0];
    const dogs: Array<[number, number]> = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c]) dogs.push([r, c]);
      }
    }
    for (let i = 0; i < dogs.length; i++) {
      for (let j = i + 1; j < dogs.length; j++) {
        const [r1, c1] = dogs[i];
        const [r2, c2] = dogs[j];
        expect(Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1).toBe(false);
      }
    }
  });

  it('erkennt wenn kein Puzzle lösbar ist (alle gleiche Region)', () => {
    // 3×3, alles in Region 0 → nur 3 Hunde, aber 3 in gleicher Region → keine Lösung
    const allSame: number[][] = [[0,0,0],[0,0,0],[0,0,0]];
    const result = solvePuzzle(makePuzzle(3, allSame));
    expect(result.solutions).toHaveLength(0);
    expect(result.unique).toBe(false);
  });
});

describe('Solver – hasUniqueSolution', () => {
  it('gibt true zurück für eindeutiges Puzzle', () => {
    expect(hasUniqueSolution(4, map4)).toBe(true);
  });

  it('gibt false zurück wenn keine Lösung existiert', () => {
    const allSame: number[][] = [[0,0,0],[0,0,0],[0,0,0]];
    expect(hasUniqueSolution(3, allSame)).toBe(false);
  });

  it('gibt false zurück wenn mehrere Lösungen existieren', () => {
    // 2×2, jede Zelle eigene Region → 2 symmetrische Lösungen
    const sym: number[][] = [[0,1],[2,3]];
    // Beide (0,0)+(1,1) und (0,1)+(1,0) sind gültig → nicht eindeutig
    expect(hasUniqueSolution(2, sym)).toBe(false);
  });
});

describe('Solver – getUniqueSolution', () => {
  it('gibt die korrekte Lösung als 2D-Boolean-Array zurück', () => {
    const sol = getUniqueSolution(4, map4);
    expect(sol).not.toBeNull();
    expect(sol!.length).toBe(4);
    expect(sol![0].length).toBe(4);
    // Genau 4 Hunde total
    const total = sol!.flat().filter(Boolean).length;
    expect(total).toBe(4);
  });

  it('gibt null zurück wenn keine eindeutige Lösung', () => {
    const allSame: number[][] = [[0,0,0],[0,0,0],[0,0,0]];
    expect(getUniqueSolution(3, allSame)).toBeNull();
  });
});
