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
  if (level <= 8)  return 'easy';
  if (level <= 20) return 'medium';
  if (level <= 30) return 'hard';
  if (level <= 40) return 'expert';
  return 'master';
}

function MiniPuzzle({ puzzle }: { puzzle: Puzzle }) {
  const { size, regions } = puzzle;
  const colorMap = new Map<string, string>();
  for (const region of regions)
    for (const cell of region.cells)
      colorMap.set(`${cell.row},${cell.col}`, region.color);
  return (
    <svg viewBox={`0 0 ${size} ${size}`}
      style={{ width: 44, height: 44, display: 'block', borderRadius: 3 }}
      aria-hidden="true">
      {Array.from({ length: size }, (_, row) =>
        Array.from({ length: size }, (_, col) => (
          <rect key={`${row},${col}`} x={col} y={row} width={0.97} height={0.97}
            fill={colorMap.get(`${row},${col}`) ?? '#ccc'} />
        ))
      )}
    </svg>
  );
}

function MiniSkeleton({ size }: { size: number }) {
  return (
    <svg viewBox={`0 0 ${size} ${size}`}
      style={{ width: 44, height: 44, display: 'block', borderRadius: 3, opacity: 0.18 }}
      aria-hidden="true">
      <rect x={0} y={0} width={size} height={size} fill="var(--surface-2)" />
    </svg>
  );
}

const DIFF_DOT: Record<Difficulty, string> = {
  easy: '#22c55e', medium: '#eab308', hard: '#ef4444',
  expert: '#8b5cf6', master: '#0ea5e9',
};

export function LevelSelectModal({ currentLevel, onSelectLevel, onClose }: LevelSelectModalProps) {
  const { t } = useLang();
  const [puzzles, setPuzzles] = useState<(Puzzle | null)[]>(
    () => Array(MAX_CAMPAIGN_LEVEL).fill(null)
  );

  useEffect(() => {
    let cancelled = false;
    // Delay je nach Schwierigkeit: Cache-Hits (Level 1-30) sind sofort,
    // Expert/Master brauchen Luft damit die UI nicht einfriert.
    const delayFor = (level: number) =>
      level <= 20 ? 0 : level <= 30 ? 20 : level <= 40 ? 120 : 250;

    // Sequenziell: jedes Level wartet auf das vorherige
    let i = 0;
    const launchNext = () => {
      if (cancelled || i >= MAX_CAMPAIGN_LEVEL) return;
      const idx = i++;
      const level = idx + 1;
      setTimeout(() => {
        if (cancelled) return;
        const puzzle = generateLevelPuzzle(level);
        setPuzzles(prev => { const a = [...prev]; a[idx] = puzzle; return a; });
        launchNext();
      }, delayFor(level));
    };
    // Erste 3 Level sofort parallel starten (sind gecacht)
    for (let b = 0; b < 3 && i < MAX_CAMPAIGN_LEVEL; b++) launchNext();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal
      aria-labelledby="levelselect-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal level-select-modal">
        <p className="modal__title" id="levelselect-title" style={{ marginBottom: '.15rem' }}>
          {t.levelSelect.title}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '.75rem', marginBottom: '.8rem' }}>
          {t.levelSelect.subtitle}
        </p>
        <div className="level-select-grid">
          {Array.from({ length: MAX_CAMPAIGN_LEVEL }, (_, i) => {
            const level = i + 1;
            const diff = getLevelDifficulty(level);
            const size = level <= 8 ? 6 : level <= 20 ? 8 : level <= 30 ? 10 : level <= 40 ? 12 : 13;
            const puzzle = puzzles[i];
            const isCurrent = level === currentLevel;
            return (
              <button key={level}
                className={`level-card${isCurrent ? ' level-card--current' : ''}`}
                onClick={() => { onSelectLevel(level); onClose(); }}
                title={`Level ${level} – ${t.difficulty[diff]} (${size}\xd7${size})`}>
                <span className="level-card__dot" style={{ background: DIFF_DOT[diff] }} />
                <span className="level-card__num">{level}</span>
                {puzzle ? <MiniPuzzle puzzle={puzzle} /> : <MiniSkeleton size={size} />}
              </button>
            );
          })}
        </div>
        {/* Legende */}
        <div className="level-select-legend">
          {(['easy','medium','hard','expert','master'] as const).map(d => (
            <span key={d} className="level-select-legend__item">
              <span className="level-select-legend__dot" style={{ background: DIFF_DOT[d] }} />
              {t.difficulty[d]}
            </span>
          ))}
        </div>
        <div className="modal__actions" style={{ marginTop: '.8rem' }}>
          <button className="btn" onClick={onClose}>{t.levelSelect.cancel}</button>
        </div>
      </div>
    </div>
  );
}
