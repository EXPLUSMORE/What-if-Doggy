// ============================================================
// Header – Titel + Meta-Zeile
// ============================================================

import { useLang } from '../../i18n/LanguageContext';
import { MAX_BONES } from '../../hooks/useGame';
import { MAX_CAMPAIGN_LEVEL } from '../../engine/generator';
import type { Difficulty } from '../../types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert', 'master'];

interface HeaderProps {
  difficulty: Difficulty;
  onSelectDifficulty: (d: Difficulty) => void;
  onOpenSettings: () => void;
  dogsPlaced: number;
  puzzleSize: number;
  bones: number;
  campaignMode?: boolean;
  level?: number;
  countdownEnabled?: boolean;
  countdownSeconds?: number;
  timerDuration?: number;
}

export function Header({
  difficulty,
  onSelectDifficulty,
  dogsPlaced,
  puzzleSize,
  bones,
  campaignMode = false,
  level = 0,
  countdownEnabled = false,
  countdownSeconds = 300,
  timerDuration = 180,
  onOpenSettings,
}: HeaderProps) {
  const { t } = useLang();

  return (
    <header className="header header--stacked">
      {/* Zeile 1: Titel zentriert */}
      <div className="header__top">
        <h1 className="header__title">
          <span className="header__title-dog">🐕</span>
          <span className="header__title-name">Doggy</span>
          <span className="header__title-sub">What if...?</span>
        </h1>
      </div>

      {/* Zeile 2: Lives | Bones | [Level] | sep | Difficulty Dropdown | sep | Settings */}
      <div className="header__meta">

        {/* Hund-Fortschritt-Pill */}
        <div className="header__stat-pill" aria-label={`${dogsPlaced} von ${puzzleSize} Hunden platziert`}>
          <div className="header__stat-icons">
            <span className="header__life-icon">🐕</span>
            <span className="header__dog-counter">{dogsPlaced}/{puzzleSize}</span>
          </div>
          <span className="header__stat-label">{t.header.dogsLabel}</span>
        </div>

        {/* Fehler-Pill */}
        <div className="header__stat-pill" aria-label={`${bones} ${t.header.errorsLabel}`}>
          <div className="header__stat-icons">
            {Array.from({ length: MAX_BONES }, (_, i) => (
              <span
                key={i}
                className="header__bone-icon"
                style={{ opacity: i < bones ? 1 : 0.2, filter: i < bones ? 'none' : 'grayscale(1)' }}
              >
                🦴
              </span>
            ))}
          </div>
          <span className="header__stat-label">{t.header.errorsLabel}</span>
        </div>

        {/* Level-Pill – nur im Kampagnenmodus */}
        {campaignMode && level > 0 && (() => {
          const mins = Math.floor(countdownSeconds / 60);
          const secs = countdownSeconds % 60;
          const ratio = countdownSeconds / timerDuration;
          const phase = ratio <= 0.10 ? 'critical'
                      : ratio <= 0.25 ? 'warning'
                      : ratio <= 0.50 ? 'urgent'
                      : '';
          return (
            <div className="header__stat-pill" aria-label={`Level ${level} von ${MAX_CAMPAIGN_LEVEL}`}>
              <div className="header__stat-icons">
                <span className="header__level-num">
                  {level}<span className="header__level-total">/{MAX_CAMPAIGN_LEVEL}</span>
                </span>
                {countdownEnabled && (
                  <>
                    <span className="header__level-timer-sep">·</span>
                    <span className={`header__level-time${phase ? ` header__level-time--${phase}` : ''}`}>
                      {mins}:{String(secs).padStart(2, '0')}
                    </span>
                  </>
                )}
              </div>
              <span className="header__stat-label">{t.header.levelLabel ?? 'Level'}</span>
            </div>
          );
        })()}

        <span className="header__meta-sep" aria-hidden="true" />

        {/* Difficulty Dropdown */}
        <div className={`header__diff-wrap difficulty--${difficulty}`}>
          <select
            className="header__diff-select"
            value={difficulty}
            disabled={campaignMode}
            title={t.header.changeDifficulty}
            aria-label={t.header.changeDifficulty}
            onChange={e => onSelectDifficulty(e.target.value as Difficulty)}
          >
            {DIFFICULTIES.map(d => (
              <option key={d} value={d}>
                {t.header.difficultyBtn[d]}
              </option>
            ))}
          </select>
        </div>

        <span className="header__meta-sep" aria-hidden="true" />

        {/* Settings-Button */}
        <button
          className="btn header__meta-btn"
          onClick={onOpenSettings}
          aria-label={t.settings.title}
          title={t.settings.title}
        >
          {t.settings.button}
        </button>

      </div>
    </header>
  );
}
