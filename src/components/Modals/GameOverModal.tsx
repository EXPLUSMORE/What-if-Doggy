// ============================================================
// GameOverModal – Alle Leben verloren
// ============================================================

import { useLang } from '../../i18n/LanguageContext';

interface GameOverModalProps {
  onRestart: () => void;
  onNewPuzzle: () => void;
}

export function GameOverModal({ onRestart, onNewPuzzle }: GameOverModalProps) {
  const { t } = useLang();

  return (
    <div className="modal-backdrop" role="dialog" aria-modal aria-labelledby="gameover-title">
      <div className="modal" style={{ textAlign: 'center' }}>
        <p className="modal__title" id="gameover-title" style={{ fontSize: '2.2rem' }}>
          {t.gameOver.title}
        </p>
        <p className="modal__subtitle">{t.gameOver.subtitle}</p>

        {/* Leere Knochen anzeigen */}
        <div style={{ fontSize: '2rem', margin: '1rem 0', opacity: 0.3 }}>
          🦴 🦴 🦴
        </div>

        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onRestart}>
            {t.gameOver.restart}
          </button>
          <button className="btn" onClick={onNewPuzzle}>
            {t.gameOver.newPuzzle}
          </button>
        </div>
      </div>
    </div>
  );
}
