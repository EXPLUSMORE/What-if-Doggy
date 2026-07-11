// ============================================================
// Cell – Einzelne Spielfeldzelle
// Pointer-Events werden vom GameBoard verwaltet (Swipe-Support).
// data-row / data-col erlauben elementFromPoint-Lookup.
// ============================================================

import type { Cell as CellType, Puzzle } from '../../types';

interface CellProps {
  cell: CellType;
  puzzle: Puzzle;
  focused: boolean;
  onFocus: () => void;
}

function getRegionBorders(
  row: number, col: number, puzzle: Puzzle,
): { top: boolean; right: boolean; bottom: boolean; left: boolean } {
  const id = puzzle.regionMap[row][col];
  const size = puzzle.size;
  return {
    top:    row === 0 || puzzle.regionMap[row - 1][col] !== id,
    right:  col === size - 1 || puzzle.regionMap[row][col + 1] !== id,
    bottom: row === size - 1 || puzzle.regionMap[row + 1][col] !== id,
    left:   col === 0 || puzzle.regionMap[row][col - 1] !== id,
  };
}

export function Cell({ cell, puzzle, focused, onFocus }: CellProps) {
  const { row, col, state, source, conflict } = cell;
  const regionId = puzzle.regionMap[row][col];
  const region = puzzle.regions.find(r => r.id === regionId);
  const borders = getRegionBorders(row, col, puzzle);

  const classNames = [
    'cell',
    conflict   ? 'cell--conflict' : '',
    focused    ? 'cell--focused'  : '',
    source === 'whatif' ? 'cell--whatif' : '',
    borders.top    ? 'cell--border-top'    : '',
    borders.right  ? 'cell--border-right'  : '',
    borders.bottom ? 'cell--border-bottom' : '',
    borders.left   ? 'cell--border-left'   : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      style={{ background: region?.color ?? '#ccc' }}
      // Pointer-Events werden im Board-Container verarbeitet
      onMouseEnter={onFocus}
      // data-Attribute für elementFromPoint-Lookup im Swipe-Handler
      data-row={row}
      data-col={col}
      role="button"
      tabIndex={focused ? 0 : -1}
      aria-label={`Zelle ${row + 1},${col + 1}: ${state}`}
      aria-pressed={state === 'dog'}
    >
      {state === 'dog' && (
        <span className="cell__dog cell__dog--placed" aria-hidden>&#x1F415;</span>
      )}
      {state === 'mark' && (
        <span className="cell__mark" aria-hidden>&#x2715;</span>
      )}
    </div>
  );
}
