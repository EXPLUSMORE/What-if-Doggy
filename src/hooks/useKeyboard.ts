// ============================================================
// useKeyboard – Tastatursteuerung
//
// Tasten:
//   Arrow / WASD  → Fokus bewegen
//   Enter / Space → Zelle anklicken
//   Z             → Undo  (Ctrl+Z ebenfalls)
//   Y / Ctrl+Y    → Redo
//   W             → What-if Toggle (nur ohne Ctrl)
//   H             → Hint
//   R             → Restart (mit Confirm)
// ============================================================

import { useEffect, useCallback } from 'react';

interface UseKeyboardOptions {
  size: number;
  focusedCell: { row: number; col: number } | null;
  setFocusedCell: (cell: { row: number; col: number }) => void;
  onClickCell: (row: number, col: number) => void;       // X (Markierung)
  onDoubleClickCell: (row: number, col: number) => void; // Hund
  onUndo: () => void;
  onRedo: () => void;
  onToggleWhatIf: () => void;
  onHint: () => void;
  onRestart: () => void;
  disabled?: boolean;
}

export function useKeyboard({
  size,
  focusedCell,
  setFocusedCell,
  onClickCell,
  onDoubleClickCell,
  onUndo,
  onRedo,
  onToggleWhatIf,
  onHint,
  onRestart,
  disabled = false,
}: UseKeyboardOptions): void {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      const focused = focusedCell ?? { row: 0, col: 0 };

      const move = (dr: number, dc: number) => {
        e.preventDefault();
        setFocusedCell({
          row: Math.max(0, Math.min(size - 1, focused.row + dr)),
          col: Math.max(0, Math.min(size - 1, focused.col + dc)),
        });
      };

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (!e.ctrlKey && !e.metaKey) move(-1, 0);
          break;
        case 'ArrowDown':
        case 's':
          if (!e.ctrlKey && !e.metaKey) move(1, 0);
          break;
        case 'ArrowLeft':
        case 'a':
          if (!e.ctrlKey && !e.metaKey) move(0, -1);
          break;
        case 'ArrowRight':
        case 'd':
          if (!e.ctrlKey && !e.metaKey) move(0, 1);
          break;
        case 'Enter':
          // Enter → Hund (Doppelklick-Äquivalent)
          e.preventDefault();
          onDoubleClickCell(focused.row, focused.col);
          break;
        case ' ':
          // Space → X (Einfachklick-Äquivalent)
          e.preventDefault();
          onClickCell(focused.row, focused.col);
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onUndo();
          }
          break;
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.shiftKey ? onRedo() : onUndo();
          }
          break;
        case 'y':
        case 'Y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onRedo();
          }
          break;
        case 'i':
        case 'I':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onToggleWhatIf();
          }
          break;
        case 'h':
        case 'H':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onHint();
          }
          break;
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onRestart();
          }
          break;
      }
    },
    [disabled, focusedCell, size, setFocusedCell, onClickCell, onDoubleClickCell, onUndo, onRedo, onToggleWhatIf, onHint, onRestart],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);
}
