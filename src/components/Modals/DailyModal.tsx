// ============================================================
// DailyModal – Tagesrätsel-Auswahl
// ============================================================

import { useState } from 'react';
import { useLang } from '../../i18n/LanguageContext';
import { todayKey } from '../../engine/generator';
import type { Difficulty } from '../../types';

interface DailyModalProps {
  onSelect: (difficulty: Difficulty) => void;
  onClose: () => void;
}

const DIFFICULTIES: { difficulty: Difficulty; emoji: string }[] = [
  { difficulty: 'easy',   emoji: '🐾' },
  { difficulty: 'medium', emoji: '🦴' },
  { difficulty: 'hard',   emoji: '🏆' },
];

export function DailyModal({ onSelect, onClose }: DailyModalProps) {
  const [selected, setSelected] = useState<Difficulty>('medium');
  const { t } = useLang();
  const dateKey = todayKey();

  return (
    <div className="modal-backdrop" role="dialog" aria-modal aria-labelledby="daily-title">
      <div className="modal">
        <p className="modal__title" id="daily-title">{t.daily.title}</p>
        <p className="modal__subtitle">{dateKey}</p>

        <div className="daily-modal__options">
          {DIFFICULTIES.map(({ difficulty, emoji }, i) => (
            <button
              key={difficulty}
              className={`daily-modal__option ${selected === difficulty ? 'daily-modal__option--selected' : ''}`}
              onClick={() => setSelected(difficulty)}
            >
              <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{t.daily.options[i].label}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                  {t.daily.options[i].desc}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="modal__actions">
          <button className="btn btn--primary" onClick={() => onSelect(selected)}>
            {t.daily.start}
          </button>
          <button className="btn" onClick={onClose}>
            {t.daily.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
