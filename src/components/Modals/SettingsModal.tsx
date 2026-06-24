const TIMER_OPTIONS: { label: string; seconds: number }[] = [
  { label: '1 Min', seconds: 60 },
  { label: '2 Min', seconds: 120 },
  { label: '3 Min', seconds: 180 },
  { label: '4 Min', seconds: 240 },
  { label: '5 Min', seconds: 300 },
];

// ============================================================
// SettingsModal – Einstellungen (Darstellung / Kampagne / Spielhilfe)
// ============================================================

import { useLang } from '../../i18n/LanguageContext';
import type { ColorPalette } from '../../types';

interface SettingsModalProps {
  darkMode: boolean;
  onToggleDark: () => void;
  countdownEnabled: boolean;
  onToggleCountdown: () => void;
  timerDuration: number;
  onSetTimerDuration: (s: number) => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  musicTrilogy: number;
  onSetMusicTrilogy: (idx: number) => void;
  autoXEnabled: boolean;
  onToggleAutoX: () => void;
  colorPalette: ColorPalette;
  onSetColorPalette: (p: ColorPalette) => void;
  onClose: () => void;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{
        width: 40,
        height: 22,
        borderRadius: 99,
        border: 'none',
        cursor: 'pointer',
        background: on ? 'var(--accent)' : 'var(--surface-2)',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 200ms',
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: on ? 21 : 3,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 200ms',
        display: 'block',
      }} />
    </button>
  );
}

function Row({ label, sub, on, onToggle }: { label: string; sub?: string; on: boolean; onToggle: () => void }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      padding: '.6rem 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: '.875rem', color: 'var(--text)' }}>{label}</div>
        {sub && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: '.7rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.07em',
      color: 'var(--text-muted)',
      marginTop: '1rem',
      marginBottom: '.25rem',
    }}>
      {label}
    </div>
  );
}

const PALETTES: { id: string; swatches: string[] }[] = [
  { id: 'default', swatches: ['hsl(215,90%,60%)', 'hsl(142,72%,50%)', 'hsl(38,95%,58%)', 'hsl(4,86%,62%)'] },
  { id: 'candy',   swatches: ['#FF6B6B', '#6BCB77', '#FF9F1C', '#4D96FF'] },
  { id: 'jewel',   swatches: ['#A8C8E8', '#A0E5C5', '#C8A8E0', '#F5A8A8'] },
  { id: 'neon',    swatches: ['#7B8BFF', '#45E5B4', '#FF9F45', '#FF6B9D'] },
];

export function SettingsModal({
  darkMode,
  onToggleDark,
  countdownEnabled,
  onToggleCountdown,
  timerDuration,
  onSetTimerDuration,
  musicEnabled,
  onToggleMusic,
  musicTrilogy,
  onSetMusicTrilogy,
  autoXEnabled,
  onToggleAutoX,
  colorPalette,
  onSetColorPalette,
  onClose,
}: SettingsModalProps) {
  const { lang, t, toggleLang } = useLang();

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal
      aria-labelledby="settings-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: 380, textAlign: 'left' }}>
        <p className="modal__title" id="settings-title" style={{ textAlign: 'center' }}>
          {t.settings.title}
        </p>

        {/* ── Darstellung ── */}
        <SectionHead label={t.settings.sectionDisplay} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '.6rem 0',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '.875rem', color: 'var(--text)' }}>{t.settings.darkMode}</div>
          <Toggle on={darkMode} onToggle={onToggleDark} />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '.6rem 0',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '.875rem', color: 'var(--text)' }}>{t.settings.language}</div>
          <button
            className="btn btn--pill"
            onClick={toggleLang}
            style={{ fontSize: '.8rem', padding: '.25em .75em' }}
          >
            {lang === 'de' ? 'DE → EN' : 'EN → DE'}
          </button>
        </div>

        {/* ── Farbpalette ── */}
        <SectionHead label={t.settings.sectionPalette} />
        <div style={{ padding: '.5rem 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PALETTES.map(p => {
              const active = colorPalette === p.id;
              const label = (t.settings.palette as Record<string, string>)[p.id] ?? p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSetColorPalette(p.id as ColorPalette)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '.45rem .75rem',
                    borderRadius: 99,
                    border: active ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: active ? 'var(--accent)' : 'var(--surface)',
                    color: active ? '#fff' : 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '.825rem',
                    fontWeight: active ? 600 : 400,
                    transition: 'all 150ms',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {p.swatches.map((c, i) => (
                      <span key={i} style={{
                        width: 14, height: 14,
                        borderRadius: '50%',
                        background: c,
                        display: 'inline-block',
                        border: '1px solid rgba(0,0,0,.12)',
                      }} />
                    ))}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Kampagne ── */}
        <SectionHead label={t.settings.sectionCampaign} />
        <Row label={t.settings.countdown} sub={t.settings.countdownSub} on={countdownEnabled} onToggle={onToggleCountdown} />
        {/* Timer-Dauer Selector */}
        {countdownEnabled && (
          <div style={{ padding: '.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>
              {t.settings.timerDuration}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TIMER_OPTIONS.map(opt => (
                <button
                  key={opt.seconds}
                  className={`btn btn--pill${timerDuration === opt.seconds ? ' btn--active' : ''}`}
                  style={{ fontSize: '.75rem', padding: '.25em .75em' }}
                  onClick={() => onSetTimerDuration(opt.seconds)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Row label={t.settings.music} sub={t.settings.musicSub} on={musicEnabled} onToggle={onToggleMusic} />
        {musicEnabled && (
          <div style={{ padding: '.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>
              {t.settings.musicStyle}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                className={`btn btn--pill${musicTrilogy === -1 ? ' btn--active' : ''}`}
                style={{ fontSize: '.75rem', padding: '.25em .75em' }}
                onClick={() => onSetMusicTrilogy(-1)}
              >
                {t.settings.musicAuto}
              </button>
              {(t.settings.musicTrilogy as readonly string[]).map((name, idx) => (
                <button
                  key={idx}
                  className={`btn btn--pill${musicTrilogy === idx ? ' btn--active' : ''}`}
                  style={{ fontSize: '.75rem', padding: '.25em .75em' }}
                  onClick={() => onSetMusicTrilogy(idx)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Spielhilfe ── */}
        <SectionHead label={t.settings.sectionHelp} />
        <Row label={t.settings.autoX} sub={t.settings.autoXSub} on={autoXEnabled} onToggle={onToggleAutoX} />

        <div className="modal__actions" style={{ marginTop: '1.25rem' }}>
          <button className="btn btn--primary" onClick={onClose} style={{ minWidth: 120 }}>
            {t.settings.close}
          </button>
        </div>
      </div>
    </div>
  );
}
