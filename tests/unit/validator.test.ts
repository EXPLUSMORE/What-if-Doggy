import { describe, it, expect } from 'vitest';
import { validateGrid, isWon, getHint, getAutoExcluded, getDogPositions } from '../../src/engine/validator';
import type { Puzzle, GridState, Cell } from '../../src/types';

// ── Test-Hilfsfunktionen ──────────────────────────────────────

function makeCell(row: number, col: number, state: Cell['state'] = 'empty'): Cell {
  return { row, col, state, source: 'normal', conflict: false };
}

function makeGrid(size: number, dogs: Array<[number, number]> = []): GridState {
  const grid: GridState = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => makeCell(r, c)),
  );
  for (const [r, c] of dogs) {
    grid[r][c] = { ...grid[r][c], state: 'dog' };
  }
  return grid;
}

// 4×4 Puzzle mit bekannter Lösung
const regionMap4: number[][] = [
  [0, 0, 1, 1],
  [0, 2, 2, 1],
  [3, 2, 3, 3],
  [3, 3, 3, 3],
];

function makePuzzle4(): Puzzle {
  return {
    id: 'test-4x4',
    size: 4,
    difficulty: 'easy',
    seed: 'test',
    createdAt: 0,
    regionMap: regionMap4,
    solution: [
      [false, false, true,  false],
      [true,  false, false, false],
      [false, false, false, true ],
      [false, true,  false, false],
    ],
    regions: [
      { id: 0, color: 'red',    label: 'A', cells: [{row:0,col:0},{row:0,col:1},{row:1,col:0}] },
      { id: 1, color: 'blue',   label: 'B', cells: [{row:0,col:2},{row:0,col:3},{row:1,col:3}] },
      { id: 2, color: 'green',  label: 'C', cells: [{row:1,col:1},{row:1,col:2},{row:2,col:1}] },
      { id: 3, color: 'yellow', label: 'D', cells: [{row:2,col:0},{row:2,col:2},{row:2,col:3},{row:3,col:0},{row:3,col:1},{row:3,col:2},{row:3,col:3}] },
    ],
  };
}

describe('Validator – getDogPositions', () => {
  it('gibt alle Positionen mit Hunden zurück', () => {
    const grid = makeGrid(4, [[0,2],[2,3]]);
    const pos = getDogPositions(grid);
    expect(pos).toHaveLength(2);
    expect(pos).toContainEqual({ row: 0, col: 2 });
    expect(pos).toContainEqual({ row: 2, col: 3 });
  });

  it('gibt leere Liste zurück wenn kein Hund', () => {
    const grid = makeGrid(4);
    expect(getDogPositions(grid)).toHaveLength(0);
  });
});

describe('Validator – validateGrid', () => {
  const puzzle = makePuzzle4();

  it('gibt keine Fehler für leeres Gitter', () => {
    const grid = makeGrid(4);
    const result = validateGrid(grid, puzzle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it('erkennt Doppel in derselben Zeile', () => {
    const grid = makeGrid(4, [[0, 0], [0, 2]]);
    const result = validateGrid(grid, puzzle);
    expect(result.valid).toBe(false);
    const rowErr = result.errors.find(e => e.type === 'row_duplicate');
    expect(rowErr).toBeDefined();
  });

  it('erkennt Doppel in derselben Spalte', () => {
    const grid = makeGrid(4, [[0, 2], [2, 2]]);
    const result = validateGrid(grid, puzzle);
    expect(result.valid).toBe(false);
    const colErr = result.errors.find(e => e.type === 'col_duplicate');
    expect(colErr).toBeDefined();
  });

  it('erkennt zwei Hunde in derselben Region', () => {
    // Region 3 enthält (2,0), (2,2), (2,3), ...
    const grid = makeGrid(4, [[2, 0], [3, 3]]);
    const result = validateGrid(grid, puzzle);
    const regErr = result.errors.find(e => e.type === 'region_duplicate');
    expect(regErr).toBeDefined();
  });

  it('erkennt diagonal benachbarte Hunde', () => {
    const grid = makeGrid(4, [[0, 2], [1, 3]]);
    const result = validateGrid(grid, puzzle);
    const adjErr = result.errors.find(e => e.type === 'adjacency');
    expect(adjErr).toBeDefined();
  });

  it('erkennt horizontal benachbarte Hunde', () => {
    const grid = makeGrid(4, [[1, 0], [1, 1]]);
    const result = validateGrid(grid, puzzle);
    const adjErr = result.errors.find(e => e.type === 'adjacency');
    expect(adjErr).toBeDefined();
  });

  it('gibt Konfliktzellen zurück', () => {
    const grid = makeGrid(4, [[0, 0], [0, 2]]);
    const result = validateGrid(grid, puzzle);
    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  it('gibt keine Fehler für die korrekte Lösung', () => {
    const grid = makeGrid(4, [[0,2],[1,0],[2,3],[3,1]]);
    const result = validateGrid(grid, puzzle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('Validator – isWon', () => {
  const puzzle = makePuzzle4();

  it('gibt false zurück bei leerem Gitter', () => {
    expect(isWon(makeGrid(4), puzzle)).toBe(false);
  });

  it('gibt false zurück wenn zu wenige Hunde', () => {
    const grid = makeGrid(4, [[0,2],[1,0]]);
    expect(isWon(grid, puzzle)).toBe(false);
  });

  it('gibt true zurück bei korrekter vollständiger Lösung', () => {
    const grid = makeGrid(4, [[0,2],[1,0],[2,3],[3,1]]);
    expect(isWon(grid, puzzle)).toBe(true);
  });

  it('gibt false zurück bei regelwidriger Komplettierung', () => {
    // 4 Hunde aber Konflikte
    const grid = makeGrid(4, [[0,0],[1,2],[2,2],[3,3]]);
    expect(isWon(grid, puzzle)).toBe(false);
  });
});

describe('Validator – getHint', () => {
  const puzzle = makePuzzle4();

  it('gibt eine Lösung-Zelle zurück wenn noch nicht platziert', () => {
    const grid = makeGrid(4);
    const hint = getHint(grid, puzzle);
    expect(hint).not.toBeNull();
    expect(puzzle.solution[hint!.row][hint!.col]).toBe(true);
  });

  it('gibt null zurück wenn alle Lösung-Zellen bereits Hunde sind', () => {
    const grid = makeGrid(4, [[0,2],[1,0],[2,3],[3,1]]);
    const hint = getHint(grid, puzzle);
    expect(hint).toBeNull();
  });
});

describe('Validator – getAutoExcluded', () => {
  const puzzle = makePuzzle4();

  it('schließt gleiche Zeile, Spalte und Region aus', () => {
    // Hund bei (0,2): Region 1 = {(0,2),(0,3),(1,3)}
    const grid = makeGrid(4, [[0,2]]);
    const excluded = getAutoExcluded(grid, puzzle);

    // Gleiche Zeile
    expect(excluded.has('0,0')).toBe(true);
    expect(excluded.has('0,1')).toBe(true);
    expect(excluded.has('0,3')).toBe(true);

    // Gleiche Spalte
    expect(excluded.has('1,2')).toBe(true);
    expect(excluded.has('2,2')).toBe(true);

    // Benachbart
    expect(excluded.has('1,1')).toBe(true);
    expect(excluded.has('1,3')).toBe(true);
  });

  it('schließt die Hund-Zelle selbst nicht aus', () => {
    const grid = makeGrid(4, [[0,2]]);
    const excluded = getAutoExcluded(grid, puzzle);
    expect(excluded.has('0,2')).toBe(false);
  });

  it('ist leer bei leerem Gitter', () => {
    const grid = makeGrid(4);
    expect(getAutoExcluded(grid, puzzle).size).toBe(0);
  });
});
