import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from '../../src/hooks/useGame';
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

describe('Spielablauf – useGame Integration', () => {
  it('startet mit leerem Gitter', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    const dogs = result.current.state.grid.flat().filter(c => c.state === 'dog');
    expect(dogs).toHaveLength(0);
    expect(result.current.state.won).toBe(false);
  });

  it('Klick auf Zelle setzt Hund', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.clickCell(0, 0); });
    expect(result.current.state.grid[0][0].state).toBe('dog');
  });

  it('zweiter Klick setzt Markierung', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.clickCell(0, 0); });
    act(() => { result.current.clickCell(0, 0); });
    expect(result.current.state.grid[0][0].state).toBe('mark');
  });

  it('dritter Klick leert die Zelle', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.clickCell(0, 0); });
    act(() => { result.current.clickCell(0, 0); });
    act(() => { result.current.clickCell(0, 0); });
    expect(result.current.state.grid[0][0].state).toBe('empty');
  });

  it('Undo macht letzten Klick rückgängig', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.clickCell(0, 0); });
    expect(result.current.state.grid[0][0].state).toBe('dog');
    act(() => { result.current.undo(); });
    expect(result.current.state.grid[0][0].state).toBe('empty');
  });

  it('Redo wiederholt Zug nach Undo', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.clickCell(0, 0); });
    act(() => { result.current.undo(); });
    act(() => { result.current.redo(); });
    expect(result.current.state.grid[0][0].state).toBe('dog');
  });

  it('canUndo ist false zu Spielbeginn', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    expect(result.current.canUndo).toBe(false);
  });

  it('canUndo ist true nach erstem Klick', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.clickCell(0, 0); });
    expect(result.current.canUndo).toBe(true);
  });

  it('What-if-Modus markiert Züge als whatif', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.toggleWhatIf(); });
    act(() => { result.current.clickCell(0, 0); });
    expect(result.current.state.grid[0][0].source).toBe('whatif');
  });

  it('Deaktivieren von What-if löscht whatif-Züge', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.toggleWhatIf(); });
    act(() => { result.current.clickCell(0, 0); });
    expect(result.current.state.grid[0][0].state).toBe('dog');
    act(() => { result.current.toggleWhatIf(); });
    expect(result.current.state.grid[0][0].state).toBe('empty');
  });

  it('normale Züge bleiben nach What-if Toggle erhalten', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    // Normalen Zug
    act(() => { result.current.clickCell(1, 1); });
    // What-if aktivieren und Zug machen
    act(() => { result.current.toggleWhatIf(); });
    act(() => { result.current.clickCell(0, 0); });
    // What-if deaktivieren
    act(() => { result.current.toggleWhatIf(); });
    // Normaler Zug muss noch da sein
    expect(result.current.state.grid[1][1].state).toBe('dog');
    // What-if Zug weg
    expect(result.current.state.grid[0][0].state).toBe('empty');
  });

  it('Restart leert das gesamte Gitter', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    act(() => { result.current.clickCell(0, 0); });
    act(() => { result.current.clickCell(1, 1); });
    act(() => { result.current.restart(); });
    const dogs = result.current.state.grid.flat().filter(c => c.state !== 'empty');
    expect(dogs).toHaveLength(0);
  });

  it('erkennt Sieg nach korrekter Platzierung', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));

    // Korrekte Lösung aus puzzle.solution eintragen
    act(() => {
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.solution[r][c]) {
            result.current.clickCell(r, c);
          }
        }
      }
    });

    expect(result.current.state.won).toBe(true);
  });

  it('Konfliktzellen werden markiert', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    // Zwei Hunde in dieselbe Zeile
    act(() => { result.current.clickCell(0, 0); });
    act(() => { result.current.clickCell(0, 2); });
    const conflicts = result.current.state.grid.flat().filter(c => c.conflict);
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it('newPuzzle lädt ein neues Puzzle', () => {
    const puzzle = getTestPuzzle();
    const { result } = renderHook(() => useGame(puzzle));
    const oldId = result.current.state.puzzle.id;
    act(() => { result.current.newPuzzle('medium'); });
    expect(result.current.state.puzzle.id).not.toBe(oldId);
  });
});
