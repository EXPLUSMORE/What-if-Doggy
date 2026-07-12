// ============================================================
// HintModal – Verbaler Tipp mit Knochen-Kostenwarnung
//
// Phase 1: Bestaetigungsfrage ("Tipp kostet 1 Knochen")
// Phase 2: Verbaler Hinweis anzeigen (nach Bestaetigung)
// ============================================================

import { useState } from 'react';
import { useLang } from '../../i18n/LanguageContext';

export interface HintData {
  row: number;       // 0-basiert
  col: number;
  regionLabel: string;
  puzzleSize: number;
}

interface HintModalProps {
  hintData: HintData;
  bones: number;
  onConfirm: () => void;   // zahlt Knochen, zeigt Hinweis
  onClose: () => void;
}

export function HintModal({ hintData, bones, onConfirm, onClose }: HintModalProps) {
  const { t, lang } = useLang();
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    onConfirm();       // Knochen abziehen
    setConfirmed(true);
  };

  const hintText = lang === 'de'
    ? `Der Hund der ${hintData.regionLabel} steht in Zeile ${hintData.row + 1}.`
    : `The ${hintData.regionLabel} dog is in row ${hintData.row + 1}.`;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal
      aria-labelledby="hint-modal-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ textAlign: 'center', maxWidth: 340 }}>
        <p className="modal__title" id="hint-modal-title">
          {t.hint.title}
        </p>

        {!confirmed ? (
          <>
            <p style={{ margin: '0.6rem 0 0.3rem', fontSize: '.95rem' }}>
              {t.hint.costWarning}
            </p>
            <p style={{ fontSize: '1.6rem', margin: '0.4rem 0 1rem' }}>
              {'🦴'.repeat(bones)}
              <span style={{ opacity: 0.25 }}>{'🦴'.repeat(Math.max(0, 3 - bones))}</span>
            </p>
            {bones <= 0 ? (
              <>
                <p style={{ color: 'var(--error)', fontWeight: 600, marginBottom: '1rem' }}>
                  {t.hint.noBones}
                </p>
                <div className="modal__actions">
                  <button className="btn btn--primary" onClick={onClose}>
                    {t.hint.cancel}
                  </button>
                </div>
              </>
            ) : (
              <div className="modal__actions">
                <button className="btn btn--primary" onClick={handleConfirm}>
                  {t.hint.confirm}
                </button>
                <button className="btn" onClick={onClose}>
                  {t.hint.cancel}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: '1.5rem', margin: '0.4rem 0' }}>{'💡'}</p>
            <p style={{ fontSize: '1rem', fontWeight: 600, margin: '0.4rem 0 1.2rem', lineHeight: 1.4 }}>
              {hintText}
            </p>
            <div className="modal__actions">
              <button className="btn btn--primary" onClick={onClose}>
                {t.hint.close}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
