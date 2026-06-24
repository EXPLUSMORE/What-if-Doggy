// ============================================================
// GameBoard -- Das Spielgitter
//
// Klick-Logik:
//   Einfachklick  -> X-Markierung setzen/entfernen  (onClickCell)
//   Doppelklick   -> Hund setzen/entfernen          (onDoubleClickCell)
//
// Doppelklick-Erkennung ist CUSTOM (kein natives onDoubleClick-Event),
// weil Browser-dblclick auch auf verschiedenen Zellen feuert wenn man
// schnell klickt. Stattdessen: Doppelklick = gleiche Zelle < 280 ms.
//
// Ablauf:
//  1. Klick auf Zelle A -> pending (Timeout 280 ms)
//  2a. Klick auf Zelle A (< 280 ms) -> Doppelklick -> Hund, kein X
//  2b. Klick auf Zelle B (< 280 ms) -> Zelle A feuert sofort als X,
//                                       Zelle B startet neu pending
//  3.  Kein zweiter Klick -> Timeout feuert -> X
// ============================================================

import { useRef, useState, useEffect, useCallback } from 'react';
import type { GridState, Puzzle } from '../../types';
import { Cell } from './Cell';
import { useKeyboard } from '../../hooks/useKeyboard';

/** Maximale Zeit zwischen zwei Klicks damit ein Doppelklick erkannt wird (ms). */
const DBLCLICK_THRESHOLD = 280;

interface PendingClick {
  row: number;
  col: number;
  time: number;
  timerId: ReturnType<typeof setTimeout>;
}

interface GameBoardProps {
  grid: GridState;
  puzzle: Puzzle;
  won: boolean;
  whatIfMode: boolean;
  onClickCell: (row: number, col: number) => void;
  onDoubleClickCell: (row: number, col: number, autoX?: boolean) => void;
  autoX?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleWhatIf: () => void;
  onHint: () => void;
  onRestart: () => void;
}

export function GameBoard({
  grid,
  puzzle,
  won,
  onClickCell,
  onDoubleClickCell,
  autoX = false,
  onUndo,
  onRedo,
  onToggleWhatIf,
  onHint,
  onRestart,
}: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);

  // Ref statt State -> kein Re-Render beim Tracking
  const pendingRef = useRef<PendingClick | null>(null);

  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current.timerId);
    };
  }, []);

  // Einheitlicher Klick-Handler fuer alle Zellen.
  // Erkennt Doppelklick nur wenn dieselbe Zelle < DBLCLICK_THRESHOLD ms
  // zweimal angeklickt wird.
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (won) return;

      const now = Date.now();
      const pending = pendingRef.current;

      if (
        pending &&
        pending.row === row &&
        pending.col === col &&
        now - pending.time < DBLCLICK_THRESHOLD
      ) {
        // Doppelklick auf dieselbe Zelle -> Hund
        clearTimeout(pending.timerId);
        pendingRef.current = null;
        onDoubleClickCell(row, col, autoX);
      } else {
        // Anderer Klick: vorherigen als X feuern
        if (pending) {
          clearTimeout(pending.timerId);
          onClickCell(pending.row, pending.col);
        }

        // Neuen Klick in Wartestellung setzen
        const timerId = setTimeout(() => {
          pendingRef.current = null;
          onClickCell(row, col);
        }, DBLCLICK_THRESHOLD);

        pendingRef.current = { row, col, time: now, timerId };
      }
    },
    [won, autoX, onClickCell, onDoubleClickCell],
  );

  // Initialen Fokus setzen
  useEffect(() => {
    if (!focusedCell) setFocusedCell({ row: 0, col: 0 });
  }, [focusedCell]);

  useKeyboard({
    size: puzzle.size,
    focusedCell,
    setFocusedCell,
    onClickCell,
    onDoubleClickCell,
    onUndo,
    onRedo,
    onToggleWhatIf,
    onHint,
    onRestart,
    disabled: won,
  });

  return (
    <div
      ref={boardRef}
      className="board"
      style={{
        gridTemplateColumns: `repeat(${puzzle.size}, var(--cell-size))`,
        gridTemplateRows: `repeat(${puzzle.size}, var(--cell-size))`,
      }}
      role="grid"
      aria-label="What if Doggy Spielfeld"
      tabIndex={0}
      onFocus={() => {
        if (!focusedCell) setFocusedCell({ row: 0, col: 0 });
      }}
    >
      {grid.flatMap(row =>
        row.map(cell => (
          <Cell
            key={`${cell.row}-${cell.col}`}
            cell={cell}
            puzzle={puzzle}
            focused={focusedCell?.row === cell.row && focusedCell?.col === cell.col}
            onClick={() => handleCellClick(cell.row, cell.col)}
            onFocus={() => setFocusedCell({ row: cell.row, col: cell.col })}
          />
        )),
      )}
    </div>
  );
}
