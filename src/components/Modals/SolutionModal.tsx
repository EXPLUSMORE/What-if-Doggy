// ============================================================
// SolutionModal – Zeigt alle Lösungen des aktuellen Puzzles
// ============================================================

import { useState, useEffect } from 'react';
import { useLang } from '../../i18n/LanguageContext';
import { getAllSolutions } from '../../engine/solver';
import type { Puzzle } from '../../types';

interface SolutionModalProps {
  puzzle: Puzzle;
  onClose: () => void;
}

/** Mini-Gitter einer einzelnen Lösung */
function SolutionGrid({
  puzzle,
  solution,
}: {
  puzzle: Puzzle;
  solution: boolean[][];
}) {
  const { size, regionMap, regions } = puzzle;
  const cellPx = Math.min(38, Math.floor(280 / size));

  return (
    <div style={{
      display: 'inline-grid',
      gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
      gridTemplateRows: `repeat(${size}, ${cellPx}px)`,
      gap: '2px',
      background: 'var(--border)',
      border: '3px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {Array.from({ length: size }, (_, row) =>
        Array.from({ length: size }, (_, col) => {
          const regionId = regionMap[row][col];
          const region   = regions[regionId];
          const hasDog   = solution[row][col];

          const bT = row === 0           || regionMap[row - 1][col] !== regionId ? '2px solid rgba(0,0,0,0.35)' : 'none';
          const bB = row === size - 1    || regionMap[row + 1][col] !== regionId ? '2px solid rgba(0,0,0,0.35)' : 'none';
          const bL = col === 0           || regionMap[row][col - 1] !== regionId ? '2px solid rgba(0,0,0,0.35)' : 'none';
          const bR = col === size - 1    || regionMap[row][col + 1] !== regionId ? '2px solid rgba(0,0,0,0.35)' : 'none';

          return (
            <div
              key={`${row}-${col}`}
              style={{
                width: cellPx, height: cellPx,
                background: region.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: cellPx * 0.55,
                borderTop: bT, borderBottom: bB, borderLeft: bL, borderRight: bR,
                boxSizing: 'border-box',
              }}
            >
              {hasDog ? '🐕' : null}
            </div>
          );
        })
      )}
    </div>
  );
}

export function SolutionModal({ puzzle, onClose }: SolutionModalProps) {
  const { t } = useLang();
  const [solutions, setSolutions] = useState<boolean[][][] | null>(null);
  const [index, setIndex] = useState(0);

  // Solver asynchron aufrufen um UI nicht zu blockieren
  useEffect(() => {
    const timer = setTimeout(() => {
      const found = getAllSolutions(puzzle.size, puzzle.regionMap, 10);
      setSolutions(found);
      setIndex(0);
    }, 30);
    return () => clearTimeout(timer);
  }, [puzzle]);

  const isUnique = solutions !== null && solutions.length === 1;
  const count    = solutions?.length ?? 0;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal
      aria-labelledby="solution-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: 420, textAlign: 'center' }}>
        <p className="modal__title" id="solution-title">{t.solution.title}</p>

        {/* Ladeindikator */}
        {solutions === null && (
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {t.solution.searching}
          </p>
        )}

        {/* Eindeutigkeitsstatus */}
        {solutions !== null && (
          <p style={{
            fontSize: '.85rem',
            color: isUnique ? 'var(--success)' : 'var(--warning)',
            marginBottom: '1rem',
            fontWeight: 600,
          }}>
            {isUnique
              ? `✓ ${t.solution.unique}`
              : `⚠ ${t.solution.multiple(count)}`}
          </p>
        )}

        {/* Lösungsgitter */}
        {solutions !== null && solutions.length > 0 && (
          <>
            {solutions.length > 1 && (
              <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>
                {t.solution.solutionN(index + 1, count)}
              </p>
            )}

            <SolutionGrid puzzle={puzzle} solution={solutions[index]} />

            {/* Navigation bei mehreren Lösungen */}
            {solutions.length > 1 && (
              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', marginTop: '.75rem' }}>
                <button
                  className="btn"
                  onClick={() => setIndex(i => Math.max(0, i - 1))}
                  disabled={index === 0}
                >
                  ←
                </button>
                {Array.from({ length: count }, (_, i) => (
                  <button
                    key={i}
                    className={`btn ${i === index ? 'btn--active' : ''}`}
                    onClick={() => setIndex(i)}
                    style={{ minWidth: 36, padding: '.35em .5em' }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="btn"
                  onClick={() => setIndex(i => Math.min(count - 1, i + 1))}
                  disabled={index === count - 1}
                >
                  →
                </button>
              </div>
            )}
          </>
        )}

        <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', margin: '1rem 0 .5rem' }}>
          {t.solution.hint}
        </p>

        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onClose} style={{ minWidth: 120 }}>
            {t.solution.close}
          </button>
        </div>
      </div>
    </div>
  );
}
