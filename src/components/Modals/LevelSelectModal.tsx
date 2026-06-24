// ============================================================
// LevelSelectModal – Echte Miniaturbilder aller 20 Kampagnen-Level
//
// Generiert die Puzzles progressiv (eines pro Render-Tick) damit
// die UI nicht blockiert wird. Jedes Level zeigt ein SVG-Miniaturbild
// der farbigen Regionen.
// ============================================================

import { useState, useEffect } from 'react';
import { useLang } from '../../i18n/LanguageContext';
import { MAX_CAMPAIGN_LEVEL, generateLevelPuzzle } from '../../engine/generator';
import type { Puzzle, Difficulty } from '../../types';

interface LevelSelectModalProps {
  currentLevel: number;
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}

function getLevelDifficulty(level: number): Difficulty {
  if (level <= 5)  return 'easy';
  if (level <= 12) return 'medium';
  return 'hard';
}

/** SVG-Vorschau eines generierten Puzzles – zeigt alle Region-Farben */
function MiniPuzzle({ puzzle }: { puzzle: Puzzle }) {
  const { size, regions } = puzzle;
  // Zellen-Farb-Map aufbauen
  const colorMap = new Map<string, string>();
  for (const region of regions) {
    for (const cell of region.cells) {
      colorMap.set(`${cell.row},${cell.col}`, region.color);
    }
  }
  // SVG: viewBox 0 0 size size, jede Zelle = 1 Einheit
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: 60, height: 60, display: 'block', borderRadius: 4 }}
      aria-hidden="true"
    >
      {Array.from({ length: size }, (_, row) =>
        Array.from({ length: size }, (_, col) => (
          <rect
            key={`${row},${col}`}
            x={col}
            y={row}
            width={0.97}
            height={0.97}
            fill={colorMap.get(`${row},${col}`) ?? '#ccc'}
          />
        ))
      )}
    </svg>
  );
}

/** Lade-Platzhalter während das Puzzle generiert wird */
function MiniSkeleton({ size }: { size: number }) {
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: 60, height: 60, display: 'block', borderRadius: 4, opacity: 0.25 }}
      aria-hidden="true"
    >
      <rect x={0} y={0} width={size} height={size} fill="var(--surface-2)" />
    </svg>
  );
}

const DIFF_COLORS: Record<Difficulty, { bg: string; color: string }> = {
  easy:   { bg: '#dcfce7', color: '#166534' },
  medium: { bg: '#fef9c3', color: '#854d0e' },
  hard:   { bg: '#fee2e2', color: '#991b1b' },
};

export function LevelSelectModal({ currentLevel, onSelectLevel, onClose }: LevelSelectModalProps) {
  const { t } = useLang();
  const [puzzles, setPuzzles] = useState<(Puzzle | null)[]>(
    () => Array(MAX_CAMPAIGN_LEVEL).fill(null)
  );

  // Puzzles progressiv generieren – eines pro Tick um UI nicht zu blockieren
  useEffect(() => {
    let cancelled = false;
    const generateNext = (i: number) => {
      if (cancelled || i >= MAX_CAMPAIGN_LEVEL) return;
      // setTimeout(0) gibt dem Browser Zeit zum Rendern zwischen den Generierungen
      setTimeout(() => {
        if (cancelled) return;
        const puzzle = generateLevelPuzzle(i + 1);
        setPuzzles(prev => {
          const next = [...prev];
          next[i] = puzzle;
          return next;
        });
        generateNext(i + 1);
      }, 0);
    };
    generateNext(0);
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal
      aria-labelledby="levelselect-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal level-select-modal">
        <p className="modal__title" id="levelselect-title" style={{ marginBottom: '.2rem' }}>
          {t.levelSelect.title}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginBottom: '1.25rem' }}>
          {t.levelSelect.subtitle}
        </p>

        <div className="level-select-grid">
          {Array.from({ length: MAX_CAMPAIGN_LEVEL }, (_, i) => {
            const level = i + 1;
            const diff = getLevelDifficulty(level);
            const size = level <= 8 ? 6 : level <= 20 ? 8 : 10;
            const puzzle = puzzles[i];
            const isCurrent = level === currentLevel;
            const styles = DIFF_COLORS[diff];

            return (
              <button
                key={level}
                className={`level-card${isCurrent ? ' level-card--current' : ''}`}
                style={{
                  borderColor: isCurrent ? 'var(--accent)' : 'var(--border)',
                  outline: isCurrent ? '2.5px solid var(--accent)' : 'none',
                  outlineOffset: 2,
                }}
                onClick={() => { onSelectLevel(level); onClose(); }}
                title={`Level ${level} – ${t.difficulty[diff]} (${size}×${size})`}
              >
                <span className="level-card__num">{level}</span>
                {puzzle ? <MiniPuzzle puzzle={puzzle} /> : <MiniSkeleton size={size} />}
                <span
                  className="level-card__size"
                  style={{ background: styles.bg, color: styles.color }}
                >
                  {size}×{size}
                </span>
              </button>
            );
          })}
        </div>

        <div className="modal__actions" style={{ marginTop: '1.25rem' }}>
          <button className="btn" onClick={onClose}>
            {t.levelSelect.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
