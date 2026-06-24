// ============================================================
// RulesModal – Spielregeln / Anleitung
// ============================================================

import { useLang } from '../../i18n/LanguageContext';

interface RulesModalProps {
  onClose: () => void;
}

export function RulesModal({ onClose }: RulesModalProps) {
  const { t } = useLang();

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal
      aria-labelledby="rules-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: 440, textAlign: 'left' }}>
        <p className="modal__title" id="rules-title" style={{ textAlign: 'center' }}>
          {t.rules.title}
        </p>

        <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', marginBottom: '1.2rem' }}>
          {t.rules.intro}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '1.5rem' }}>
          {t.rules.items.map((item, i) => (
            <div key={i}>
              {(i === 3 || i === 6) && (
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '.25rem 0 .75rem' }} />
              )}
              <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '.15rem' }}>{item.heading}</div>
                  <div
                    style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}
                    dangerouslySetInnerHTML={{ __html: item.body }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onClose} style={{ minWidth: 120 }}>
            {t.rules.close}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.75rem', opacity: 0.6 }}>
          {'❖'} Design {'&'} Code: Claudine {'&'} Christian
        </p>
      </div>
    </div>
  );
}
