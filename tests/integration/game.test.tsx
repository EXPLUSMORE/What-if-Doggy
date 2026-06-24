import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame, MAX_LIVES, MAX_BONES } from '../../src/hooks/useGame';
import { generatePuzzle } from '../../src/engine/generator';
import type { Puzzle } from '../../src/types';

// localStorage mocken
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function getTestPuzzle(): Puzzle {
  return generatePuzzle({ difficulty: 'easy', seed: 'integration-test' });
}

// ── Hilfsfunktion: findet eine Zelle, die NICHT in der Lösung ist ──────────
function getWrongCell(puzzle: Puzzle): { row: number; col: number } {
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (!puzzle.solution[r][c]) return { row: r, col: c };
    }
  }
  throw new Error('Kein falsches Feld gefunden');
}

// ── Hilfsfunktion: findet eine Zelle, die in der Lösung ist ──────────────
function getCorrectCell(puzzle: Puzzle): { row: number; col: number } {
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (puzzle.solution[r][c]) return { row: r, col: c };
    }
  }
  throw new Error('Kein korrektes Feld gefunden');
}

// ============================================================
// Spielmechanik – Einfachklick (CLICK_CELL → Mark/X)
// ============================================================
describe('Einfachklick (clickCell)', () => {
  it('leere Zelle → Markierung (X)', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.clickCell(0, 0); });
    expect(result.current.state.grid[0][0].state).toBe('mark');
  });

  it('Markierung → leer', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.clickCell(0, 0); }); // empty → mark
    act(() => { result.current.clickCell(0, 0); }); // mark → empty
    expect(result.current.state.grid[0][0].state).toBe('empty');
  });

  it('Hund → leer (Einfachklick entfernt Hund)', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.doubleClickCell(0, 0); }); // empty → dog
    act(() => { result.current.clickCell(0, 0); });        // dog → empty
    expect(result.current.state.grid[0][0].state).toBe('empty');
  });
});

// ============================================================
// Spielmechanik – Doppelklick (DOUBLE_CLICK_CELL → Hund)
// ============================================================
describe('Doppelklick (doubleClickCell)', () => {
  it('leere Zelle → Hund', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.doubleClickCell(0, 0); });
    expect(result.current.state.grid[0][0].state).toBe('dog');
  });

  it('markierte Zelle → Hund', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.clickCell(0, 0); });        // mark
    act(() => { result.current.doubleClickCell(0, 0); }); // dog
    expect(result.current.state.grid[0][0].state).toBe('dog');
  });

  it('Hund → leer (Doppelklick entfernt Hund)', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.doubleClickCell(0, 0); }); // empty → dog
    act(() => { result.current.doubleClickCell(0, 0); }); // dog → empty
    expect(result.current.state.grid[0][0].state).toBe('empty');
  });
});

// ============================================================
// Solution-Check: Falscher Hund → Strafe
// ============================================================
describe('Solution-Check beim Hund setzen', () => {
  it('falscher Hund → Knochen wird abgezogen', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    const { row, col } = getWrongCell(puzzle);

    const bonesBefore = result.current.state.bones;
    act(() => { result.current.doubleClickCell(row, col); });
    expect(result.current.state.bones).toBeLessThan(bonesBefore);
  });

  it('richtiger Hund → keine Strafe', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    const { row, col } = getCorrectCell(puzzle);

    const bonesBefore = result.current.state.bones;
    const livesBefore = result.current.state.lives;
    act(() => { result.current.doubleClickCell(row, col); });
    expect(result.current.state.bones).toBe(bonesBefore);
    expect(result.current.state.lives).toBe(livesBefore);
  });

  it('falscher Hund im What-if-Modus → keine Strafe', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    const { row, col } = getWrongCell(puzzle);

    act(() => { result.current.toggleWhatIf(); });
    const bonesBefore = result.current.state.bones;
    act(() => { result.current.doubleClickCell(row, col); });
    expect(result.current.state.bones).toBe(bonesBefore);
  });

  it('mehrere falsche Hunde → Leben-Verlust', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));

    // Suche falsche Zellen in verschiedenen Zeilen (damit kein Constraint-Konflikt)
    const wrongCells: Array<{ row: number; col: number }> = [];
    for (let r = 0; r < puzzle.size && wrongCells.length < MAX_BONES + 1; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (!puzzle.solution[r][c]) {
          wrongCells.push({ row: r, col: c });
          break; // nur eine pro Zeile
        }
      }
    }

    const livesBefore = result.current.state.lives;

    // MAX_BONES falsche Hunde → alle Knochen verbraucht → Leben-Verlust
    for (let i = 0; i < MAX_BONES; i++) {
      if (i < wrongCells.length) {
        act(() => { result.current.doubleClickCell(wrongCells[i].row, wrongCells[i].col); });
      }
    }

    // Nach MAX_BONES Fehlern: ein Leben weniger, Knochen wieder voll
    expect(result.current.state.lives).toBeLessThan(livesBefore);
  });

  it('Hund entfernen via Doppelklick → keine Strafe', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    const { row, col } = getWrongCell(puzzle);

    act(() => { result.current.doubleClickCell(row, col); }); // falscher Hund → Strafe
    const bonesAfterFirst = result.current.state.bones;

    act(() => { result.current.doubleClickCell(row, col); }); // Hund entfernen → keine Strafe
    expect(result.current.state.bones).toBe(bonesAfterFirst);
  });
});

// ============================================================
// Undo / Redo
// ============================================================
describe('Undo / Redo', () => {
  it('canUndo ist false zu Spielbeginn', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    expect(result.current.canUndo).toBe(false);
  });

  it('canUndo ist true nach erstem Zug', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.doubleClickCell(0, 0); });
    expect(result.current.canUndo).toBe(true);
  });

  it('Undo macht Hund-Platzierung rückgängig', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.doubleClickCell(0, 0); });
    expect(result.current.state.grid[0][0].state).toBe('dog');
    act(() => { result.current.undo(); });
    expect(result.current.state.grid[0][0].state).toBe('empty');
  });

  it('Redo wiederholt Zug nach Undo', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.doubleClickCell(0, 0); });
    act(() => { result.current.undo(); });
    act(() => { result.current.redo(); });
    expect(result.current.state.grid[0][0].state).toBe('dog');
  });
});

// ============================================================
// What-if-Modus
// ============================================================
describe('What-if-Modus', () => {
  it('Züge im What-if bekommen source="whatif"', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.toggleWhatIf(); });
    act(() => { result.current.doubleClickCell(0, 0); });
    expect(result.current.state.grid[0][0].source).toBe('whatif');
  });

  it('Deaktivieren löscht alle whatif-Züge', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.toggleWhatIf(); });
    act(() => { result.current.doubleClickCell(0, 0); });
    act(() => { result.current.toggleWhatIf(); });
    expect(result.current.state.grid[0][0].state).toBe('empty');
  });

  it('normale Züge bleiben nach What-if-Toggle erhalten', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    // Normalen Hund setzen (an Stelle, die in der Lösung liegt)
    const { row: normalRow, col: normalCol } = getCorrectCell(puzzle);
    act(() => { result.current.doubleClickCell(normalRow, normalCol); });
    // What-if aktivieren und What-if-Zug machen
    act(() => { result.current.toggleWhatIf(); });
    act(() => { result.current.doubleClickCell(0, 0); });
    // What-if deaktivieren
    act(() => { result.current.toggleWhatIf(); });
    // Normaler Hund muss noch da sein
    expect(result.current.state.grid[normalRow][normalCol].state).toBe('dog');
    // What-if-Hund weg (sofern andere Zelle)
    if (normalRow !== 0 || normalCol !== 0) {
      expect(result.current.state.grid[0][0].state).toBe('empty');
    }
  });
});

// ============================================================
// Sieg
// ============================================================
describe('Sieg', () => {
  it('startet mit won=false', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    expect(result.current.state.won).toBe(false);
  });

  it('erkennt Sieg nach vollständiger korrekter Lösung', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));

    // Alle korrekten Hunde via doubleClickCell setzen
    act(() => {
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.solution[r][c]) {
            result.current.doubleClickCell(r, c);
          }
        }
      }
    });

    expect(result.current.state.won).toBe(true);
  });
});

// ============================================================
// Konflikte
// ============================================================
describe('Konflikte', () => {
  it('Konfliktzellen werden hervorgehoben', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    // Zwei Hunde in dieselbe Zeile
    act(() => { result.current.doubleClickCell(0, 0); });
    act(() => { result.current.doubleClickCell(0, 2); });
    const conflicts = result.current.state.grid.flat().filter(c => c.conflict);
    expect(conflicts.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Neustart / Neues Puzzle
// ============================================================
describe('Neustart', () => {
  it('Restart leert das gesamte Gitter', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.doubleClickCell(0, 0); });
    act(() => { result.current.clickCell(1, 1); });
    act(() => { result.current.restart(); });
    const nonEmpty = result.current.state.grid.flat().filter(c => c.state !== 'empty');
    expect(nonEmpty).toHaveLength(0);
  });

  it('newPuzzle lädt ein anderes Puzzle', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    const oldId = result.current.state.puzzle.id;
    act(() => { result.current.newPuzzle('medium'); });
    expect(result.current.state.puzzle.id).not.toBe(oldId);
  });
});
