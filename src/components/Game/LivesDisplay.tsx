// ============================================================
// LivesDisplay – Zeigt Leben (🐕) und Knochen (🦴) an
// ============================================================

import { MAX_LIVES, MAX_BONES } from '../../hooks/useGame';

interface LivesDisplayProps {
  lives: number;
  bones: number;
}

export function LivesDisplay({ lives, bones }: LivesDisplayProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius)',
        userSelect: 'none',
      }}
      aria-label={`${lives} Leben, ${bones} Knochen`}
    >
      {/* Leben */}
      <div style={{ display: 'flex', gap: '4px', fontSize: '1.1rem' }}>
        {Array.from({ length: MAX_LIVES }, (_, i) => (
          <span
            key={i}
            style={{
              opacity: i < lives ? 1 : 0.2,
              filter: i < lives ? 'none' : 'grayscale(1)',
              transition: 'opacity .3s, filter .3s',
              lineHeight: 1,
            }}
          >
            🐕
          </span>
        ))}
      </div>

      {/* Knochen */}
      <div style={{ display: 'flex', gap: '4px', fontSize: '.85rem' }}>
        {Array.from({ length: MAX_BONES }, (_, i) => (
          <span
            key={i}
            style={{
              opacity: i < bones ? 1 : 0.2,
              filter: i < bones ? 'none' : 'grayscale(1)',
              transition: 'opacity .3s, filter .3s',
              lineHeight: 1,
            }}
          >
            🦴
          </span>
        ))}
      </div>
    </div>
  );
}
