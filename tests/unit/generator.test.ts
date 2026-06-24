import { describe, it, expect } from 'vitest';
import { generatePuzzle, getDailyPuzzle, todayKey } from '../../src/engine/generator';
import { hasUniqueSolution } from '../../src/engine/solver';

describe('Generator – generatePuzzle', () => {
  it('erzeugt ein Puzzle mit korrekter Größe (easy=6)', () => {
    const p = generatePuzzle({ difficulty: 'easy', seed: 'test-easy-1' });
    expect(p.size).toBe(6);
    expect(p.regions).toHaveLength(6);
    expect(p.regionMap.length).toBe(6);
    expect(p.regionMap[0].length).toBe(6);
  });

  it('erzeugt ein Puzzle mit korrekter Größe (medium=8)', () => {
    const p = generatePuzzle({ difficulty: 'medium', seed: 'test-medium-1' });
    expect(p.size).toBe(8);
    expect(p.regions).toHaveLength(8);
  });

  it('erzeugt ein Puzzle mit korrekter Größe (hard=10)', () => {
    const p = generatePuzzle({ difficulty: 'hard', seed: 'test-hard-1' });
    expect(p.size).toBe(10);
    expect(p.regions).toHaveLength(10);
  });

  it('erzeugte Puzzles haben eindeutige Lösungen', () => {
    const seeds = ['alpha', 'beta', 'gamma', 'delta'];
    for (const seed of seeds) {
      const p = generatePuzzle({ difficulty: 'medium', seed });
      expect(hasUniqueSolution(p.size, p.regionMap)).toBe(true);
    }
  });

  it('jede Zelle gehört genau einer Region', () => {
    const p = generatePuzzle({ difficulty: 'easy', seed: 'coverage-test' });
    const regionIds = new Set(p.regions.map(r => r.id));
    for (let r = 0; r < p.size; r++) {
      for (let c = 0; c < p.size; c++) {
        expect(regionIds.has(p.regionMap[r][c])).toBe(true);
      }
    }
  });

  it('jede Region hat mindestens 1 Zelle', () => {
    const p = generatePuzzle({ difficulty: 'easy', seed: 'region-size' });
    for (const region of p.regions) {
      expect(region.cells.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('alle Zellen zusammen entsprechen N×N', () => {
    const p = generatePuzzle({ difficulty: 'easy', seed: 'total-cells' });
    const totalCells = p.regions.reduce((sum, r) => sum + r.cells.length, 0);
    expect(totalCells).toBe(p.size * p.size);
  });

  it('Puzzle mit gleichem Seed ist reproduzierbar', () => {
    const p1 = generatePuzzle({ difficulty: 'medium', seed: 'deterministic' });
    const p2 = generatePuzzle({ difficulty: 'medium', seed: 'deterministic' });
    expect(p1.regionMap).toEqual(p2.regionMap);
    expect(p1.solution).toEqual(p2.solution);
  });

  it('Lösung enthält exakt N Hunde', () => {
    const p = generatePuzzle({ difficulty: 'easy', seed: 'count-dogs' });
    const dogCount = p.solution.flat().filter(Boolean).length;
    expect(dogCount).toBe(p.size);
  });

  it('Lösung-Hunde sind alle in verschiedenen Regionen', () => {
    const p = generatePuzzle({ difficulty: 'medium', seed: 'unique-regions' });
    const usedRegions = new Set<number>();
    for (let r = 0; r < p.size; r++) {
      for (let c = 0; c < p.size; c++) {
        if (p.solution[r][c]) {
          usedRegions.add(p.regionMap[r][c]);
        }
      }
    }
    expect(usedRegions.size).toBe(p.size);
  });
});

describe('Generator – getDailyPuzzle', () => {
  it('gibt ein Puzzle für das aktuelle Datum zurück', () => {
    const p = getDailyPuzzle(new Date('2024-06-15'), 'medium');
    expect(p.size).toBe(8);
    expect(p.id).toContain('daily-2024-06-15');
  });

  it('ist deterministisch für dasselbe Datum', () => {
    const d = new Date('2024-01-01');
    const p1 = getDailyPuzzle(d, 'easy');
    const p2 = getDailyPuzzle(d, 'easy');
    expect(p1.regionMap).toEqual(p2.regionMap);
  });

  it('verschiedene Tage geben verschiedene Puzzles', () => {
    const p1 = getDailyPuzzle(new Date('2024-01-01'), 'medium');
    const p2 = getDailyPuzzle(new Date('2024-01-02'), 'medium');
    expect(p1.regionMap).not.toEqual(p2.regionMap);
  });
});

describe('Generator – todayKey', () => {
  it('gibt einen String im Format YYYY-MM-DD zurück', () => {
    const key = todayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
