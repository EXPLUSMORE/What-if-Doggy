import { useState, useEffect } from 'react';
import { useLang } from '../../i18n/LanguageContext';
import { MAX_CAMPAIGN_LEVEL } from '../../engine/generator';
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
    // Eigener Worker – wird beim Schließen des Modals sofort terminiert.
    // Der Kampagnen-Worker bleibt dadurch immer frei für Gameplay-Anfragen.
    const worker = new Worker(
      new URL('../../workers/puzzle.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent<{ id: string; puzzle: Puzzle | null; level: number }>) => {
      const { puzzle, level } = e.data;
      if (puzzle) {
        setPuzzles(prev => {
          const a = [...prev];
          a[level - 1] = puzzle;
          return a;
        });
      }
    };

    // Nur Easy/Medium (Level 1–20) sofort laden – sind schnell (<100ms je).
    // Hard (21–30) mit kleiner Verzögerung, Expert/Master (31–50) gar nicht
    // vorladen: Thumbnails bleiben Skeleton. Modal-Worker würde sonst den
    // Kampagnen-Worker blockieren wenn der User zwischenzeitlich Level auswählt.
    for (let lvl = 1; lvl <= Math.min(MAX_CAMPAIGN_LEVEL, 20); lvl++) {
      worker.postMessage({ id: String(lvl), type: 'level', level: lvl });
    }
    // Hard-Level mit 200ms Verzögerung, damit Easy/Medium zuerst erscheinen
    setTimeout(() => {
      for (let lvl = 21; lvl <= Math.min(MAX_CAMPAIGN_LEVEL, 30); lvl++) {
        worker.postMessage({ id: String(lvl), type: 'level', level: lvl });
      }
    }, 200);

    return () => {
      // Modal geschlossen → alle laufenden/ausstehenden Generierungen sofort abbrechen
      worker.terminate();
    };
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
            const size = level <= 8 ? 6 : level <= 20 ? 8 : level <= 30 ? 10 : level <= 40 ? 11 : 12;
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
