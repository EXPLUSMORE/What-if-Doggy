// ============================================================
// GameBoard – Das Spielgitter
//
// Interaktion:
//   1× Tippen/Klicken  → X sofort bei pointerdown (kein Delay!)
//   2× schnell (< 250ms, gleiche Zelle) → Hund
//   Wischen (> 8px Bewegung) → X auf allen überstrichenen Zellen
//   Wischen auf X-Zellen → X entfernen
//   Hunde werden nie durch Wischen verändert
// ============================================================

import { useRef, useState, useEffect, useCallback } from 'react';
import type { GridState, Puzzle } from '../../types';
import { Cell } from './Cell';
import { useKeyboard } from '../../hooks/useKeyboard';

const DBLCLICK_MS = 250; // max ms zwischen zwei Taps für Doppelklick/Hund
const SWIPE_PX    = 8;   // min px Bewegung um Wisch-Modus zu aktivieren

interface LastTap { row: number; col: number; time: number; }

interface GameBoardProps {
  grid:              GridState;
  puzzle:            Puzzle;
  won:               boolean;
  whatIfMode:        boolean;
  onClickCell:       (row: number, col: number) => void;
  onDoubleClickCell: (row: number, col: number, autoX?: boolean) => void;
  autoX?:            boolean;
  onUndo:            () => void;
  onRedo:            () => void;
  onToggleWhatIf:    () => void;
  onHint:            () => void;
  onRestart:         () => void;
}

export function GameBoard({
  grid, puzzle, won,
  onClickCell, onDoubleClickCell,
  autoX = false,
  onUndo, onRedo, onToggleWhatIf, onHint, onRestart,
}: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);

  // Letzter Tap für Doppelklick-Erkennung (kein Timeout nötig)
  const lastTapRef = useRef<LastTap | null>(null);

  // Aktuelles Grid als Ref → Swipe-Handler ohne Stale-Closure
  const gridRef = useRef(grid);
  useEffect(() => { gridRef.current = grid; }, [grid]);

  // Swipe-State
  const pointerDownRef = useRef<{ x: number; y: number; row: number; col: number } | null>(null);
  const isSwiping      = useRef(false);
  const swipeAction    = useRef<'mark' | 'unmark'>('mark');
  const swipedCells    = useRef(new Set<string>());

  // Zelle unter Pointer via data-row / data-col ermitteln
  const cellAtPoint = useCallback((x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return null;
    const c = el.closest('[data-row]') as HTMLElement | null;
    if (!c) return null;
    const row = parseInt(c.dataset.row ?? '', 10);
    const col = parseInt(c.dataset.col ?? '', 10);
    if (isNaN(row) || isNaN(col)) return null;
    return { row, col };
  }, []);

  // Swipe: X auf einer Zelle setzen/entfernen
  const applySwipeCell = useCallback((row: number, col: number) => {
    const key = `${row},${col}`;
    if (swipedCells.current.has(key)) return;
    swipedCells.current.add(key);
    const state = gridRef.current[row]?.[col]?.state;
    if (state === 'dog') return;
    if (swipeAction.current === 'mark'   && state === 'empty') onClickCell(row, col);
    if (swipeAction.current === 'unmark' && state === 'mark' ) onClickCell(row, col);
  }, [onClickCell]);

  // ── Pointer Down: sofortiges X oder Doppelklick-Erkennung ───
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (won) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const pos = cellAtPoint(e.clientX, e.clientY);
    if (!pos) return;

    setFocusedCell({ row: pos.row, col: pos.col });

    // Swipe-Vorbereitung
    isSwiping.current = false;
    pointerDownRef.current = { x: e.clientX, y: e.clientY, ...pos };
    const cellState = gridRef.current[pos.row]?.[pos.col]?.state;
    swipeAction.current = cellState === 'mark' ? 'unmark' : 'mark';
    swipedCells.current = new Set([`${pos.row},${pos.col}`]);

    // Doppelklick-Erkennung: zweiter Tap auf gleicher Zelle?
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.row === pos.row && last.col === pos.col && now - last.time < DBLCLICK_MS) {
      lastTapRef.current = null;
      // Zelle ist jetzt 'mark' (vom ersten Tap) → Hund setzen
      onDoubleClickCell(pos.row, pos.col, autoX);
      return;
    }

    // Erster Tap: X sofort setzen (kein Warten!)
    lastTapRef.current = { row: pos.row, col: pos.col, time: now };
    if (cellState !== 'dog') {
      onClickCell(pos.row, pos.col); // empty→mark oder mark→empty
    }
  }, [won, autoX, cellAtPoint, onClickCell, onDoubleClickCell]);

  // ── Pointer Move: Wisch-Modus aktivieren ────────────────────
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const pd = pointerDownRef.current;
    if (!pd || won) return;

    if (!isSwiping.current && Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > SWIPE_PX) {
      isSwiping.current = true;
      lastTapRef.current = null; // Swipe bricht Doppelklick-Sequenz ab
    }

    if (isSwiping.current) {
      const pos = cellAtPoint(e.clientX, e.clientY);
      if (pos) applySwipeCell(pos.row, pos.col);
    }
  }, [won, applySwipeCell, cellAtPoint]);

  // ── Pointer Up: Swipe beenden ────────────────────────────────
  const handlePointerUp = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownRef.current = null;
    isSwiping.current      = false;
    swipedCells.current    = new Set();
  }, []);

  // ── Fokus & Tastatursteuerung ────────────────────────────────
  useEffect(() => { if (!focusedCell) setFocusedCell({ row: 0, col: 0 }); }, [focusedCell]);

  useKeyboard({
    size: puzzle.size,
    focusedCell,
    setFocusedCell,
    onClickCell,
    onDoubleClickCell,
    onUndo, onRedo, onToggleWhatIf, onHint, onRestart,
    disabled: won,
  });

  return (
    <div
      ref={boardRef}
      className="board"
      style={{
        gridTemplateColumns: `repeat(${puzzle.size}, var(--cell-size))`,
        gridTemplateRows:    `repeat(${puzzle.size}, var(--cell-size))`,
        touchAction:         'none',
        userSelect:          'none',
      }}
      role="grid"
      aria-label="What if Doggy Spielfeld"
      tabIndex={0}
      onFocus={() => { if (!focusedCell) setFocusedCell({ row: 0, col: 0 }); }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => { isSwiping.current = false; pointerDownRef.current = null; }}
    >
      {grid.flatMap(row =>
        row.map(cell => (
          <Cell
            key={`${cell.row}-${cell.col}`}
            cell={cell}
            puzzle={puzzle}
            focused={focusedCell?.row === cell.row && focusedCell?.col === cell.col}
            onFocus={() => setFocusedCell({ row: cell.row, col: cell.col })}
          />
        )),
      )}
    </div>
  );
}
