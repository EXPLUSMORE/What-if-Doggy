// ============================================================
// App – Root-Komponente
// ============================================================

import { useState, useEffect } from 'react';
import { useGame } from './hooks/useGame';
import { useTimer } from './hooks/useTimer';
import { useMusic } from './hooks/useMusic';
import { useBoardSize } from './hooks/useBoardSize';
import { generatePuzzle, prefetchLevelPuzzles } from './engine/generator';

// Kampagnen-Puzzles sofort im Hintergrund vorgenerieren
prefetchLevelPuzzles();
import { Header } from './components/Header/Header';
import { GameBoard } from './components/Board/GameBoard';
import { TopControls, BottomControls } from './components/Controls/Controls';
import { WinModal } from './components/Modals/WinModal';
import { DailyModal } from './components/Modals/DailyModal';
import { RulesModal } from './components/Modals/RulesModal';
import { SolutionModal } from './components/Modals/SolutionModal';
import { GameOverModal } from './components/Modals/GameOverModal';
import { LevelSelectModal } from './components/Modals/LevelSelectModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { useLang } from './i18n/LanguageContext';
import type { Difficulty, ColorPalette } from './types';
import './styles/globals.css';

function getInitialDark(): boolean {
  try {
    const stored = localStorage.getItem('wif-doggy-dark');
    if (stored !== null) return stored === 'true';
  } catch { /* ignore */ }
  return true;
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDark);
  const [countdownEnabled, setCountdownEnabled] = useState<boolean>(() => {
    try { const v = localStorage.getItem('wif-doggy-countdown'); return v === null ? true : v === 'true'; } catch { return true; }
  });
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => {
    try { const v = localStorage.getItem('wif-doggy-music'); return v === null ? false : v === 'true'; } catch { return false; }
  });
  const [autoXEnabled, setAutoXEnabled] = useState<boolean>(() => {
    try { const v = localStorage.getItem('wif-doggy-autox'); return v === null ? true : v === 'true'; } catch { return true; }
  });
  const [timerDuration, setTimerDuration] = useState<number>(() => {
    try { const v = localStorage.getItem('wif-doggy-timer-duration-v2'); return v ? parseInt(v, 10) : 120; } catch { return 120; }
  });
  const [musicTrilogy, setMusicTrilogy] = useState<number>(() => {
    try { const v = localStorage.getItem('wif-doggy-music-trilogy'); return v !== null ? parseInt(v, 10) : 2; } catch { return 2; }
  });
  const [colorPalette, setColorPalette] = useState<ColorPalette>(() => {
    try { return (localStorage.getItem('wif-doggy-palette') as ColorPalette) || 'default'; } catch { return 'default'; }
  });

  const [showDaily, setShowDaily] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { t } = useLang();

  const [initialPuzzle] = useState(() => generatePuzzle({ difficulty: 'medium' }));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    try { localStorage.setItem('wif-doggy-dark', String(darkMode)); } catch { /* ignore */ }
  }, [darkMode]);

  useEffect(() => {
    if (colorPalette === 'default') {
      document.documentElement.removeAttribute('data-palette');
    } else {
      document.documentElement.setAttribute('data-palette', colorPalette);
    }
    try { localStorage.setItem('wif-doggy-palette', colorPalette); } catch { /* ignore */ }
  }, [colorPalette]);

  useEffect(() => {
    try { localStorage.setItem('wif-doggy-countdown', String(countdownEnabled)); } catch { /* ignore */ }
  }, [countdownEnabled]);

  useEffect(() => {
    try { localStorage.setItem('wif-doggy-music', String(musicEnabled)); } catch { /* ignore */ }
  }, [musicEnabled]);

  useEffect(() => {
    try { localStorage.setItem('wif-doggy-autox', String(autoXEnabled)); } catch { /* ignore */ }
  }, [autoXEnabled]);

  useEffect(() => {
    try { localStorage.setItem('wif-doggy-music-trilogy', String(musicTrilogy)); } catch { /* ignore */ }
  }, [musicTrilogy]);

  useEffect(() => {
    try { localStorage.setItem('wif-doggy-timer-duration-v2', String(timerDuration)); } catch { /* ignore */ }
  }, [timerDuration]);

  const {
    state,
    clickCell,
    doubleClickCell,
    undo,
    redo,
    toggleWhatIf,
    restart,
    applyHint,
    resetLives,
    tick,
    newPuzzle,
    loadDaily,
    startCampaign,
    nextLevel,
    restartCampaign,
    startCampaignFromLevel,
    tickCountdown,
    penalize,
    canUndo,
    canRedo,
  } = useGame(initialPuzzle);

  // Dynamische Zellgröße: passt --cell-size an Viewport + Puzzle-Größe an
  useBoardSize(state.puzzle.size);

  useTimer({
    startedAt: state.startedAt,
    frozen: state.won,
    onTick: tick,
  });

  // Countdown-Tick: läuft jede Sekunde wenn Kampagne + aktiv + nicht gewonnen
  useEffect(() => {
    if (!countdownEnabled || !state.campaignMode || state.won || state.gameOver) return;
    const id = setInterval(() => tickCountdown(), 1000);
    return () => clearInterval(id);
  }, [countdownEnabled, state.campaignMode, state.won, state.gameOver, tickCountdown]);

  // Puzzle-Generierung mit kurzem Delay, damit React zuerst re-rendern kann
  const generate = (fn: () => void) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setTimeout(() => {
      try { fn(); } catch (e) { console.error('Puzzle generation failed:', e); }
      setIsGenerating(false);
    }, 10);
  };

  const handleToggleCountdown = () => setCountdownEnabled(v => !v);
  const handleToggleMusic = () => setMusicEnabled(v => !v);
  const handleToggleAutoX = () => setAutoXEnabled(v => !v);
  const handleSetTimerDuration = (s: number) => setTimerDuration(s);

  useMusic({
    enabled: musicEnabled,
    campaignMode: state.campaignMode,
    won: state.won,
    gameOver: state.gameOver,
    countdownSeconds: state.countdownSeconds,
    level: state.level,
    trilogyOverride: musicTrilogy,
  });

  const handleSelectDifficulty = (difficulty: Difficulty) =>
    generate(() => newPuzzle(difficulty));

  const handleNewPuzzle = (difficulty: Difficulty) =>
    generate(() => newPuzzle(difficulty));

  const handleStartCampaign = () =>
    generate(() => startCampaign(timerDuration));

  const handleSelectLevel = (level: number) =>
    generate(() => startCampaignFromLevel(level, timerDuration));

  const handleNextLevel = () =>
    generate(() => nextLevel(timerDuration));

  const handleRestartCampaign = () =>
    generate(() => restartCampaign(timerDuration));

  const handleOpenDaily = () => setShowDaily(true);
  const handleSelectDaily = (difficulty: Difficulty) => {
    generate(() => loadDaily(difficulty));
    setShowDaily(false);
  };

  const controlProps = {
    canUndo,
    canRedo,
    whatIfMode: state.whatIfMode,
    won: state.won,
    difficulty: state.puzzle.difficulty,
    campaignMode: state.campaignMode,
    onUndo: undo,
    onRedo: redo,
    onToggleWhatIf: toggleWhatIf,
    onRestart: restart,
    onHint: applyHint,
    onNewPuzzle: handleNewPuzzle,
    onOpenDaily: handleOpenDaily,
    onOpenRules: () => setShowRules(true),
    onOpenSolution: () => {
      if (state.campaignMode && !state.won) {
        if (!confirm(t.solution.campaignWarning)) return;
        penalize();
      }
      setShowSolution(true);
    },
    onStartCampaign: handleStartCampaign,
    onOpenLevelSelect: () => setShowLevelSelect(true),

  };

  return (
    <>
      <Header
        difficulty={state.puzzle.difficulty}
        onSelectDifficulty={handleSelectDifficulty}
        lives={state.lives}
        bones={state.bones}
        campaignMode={state.campaignMode}
        level={state.level}
        countdownEnabled={countdownEnabled}
        countdownSeconds={state.countdownSeconds}
        timerDuration={state.countdownDuration}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="board-wrapper">
        <TopControls {...controlProps} />

        {state.whatIfMode && (
          <div className="whatif-banner" role="status">
            {t.whatifBanner}
          </div>
        )}

        {isGenerating && (
          <div className="generating-banner" role="status" aria-live="polite">
            🎲 Generating puzzle...
          </div>
        )}

        {/* Fortschrittsbalken – exakt so breit wie das Spielgitter */}
        {state.campaignMode && countdownEnabled && (() => {
          const ratio = state.countdownSeconds / state.countdownDuration;
          const pct = Math.max(0, Math.min(100, ratio * 100));
          const phase = ratio <= 0.10 ? 'critical'
                      : ratio <= 0.25 ? 'warning'
                      : ratio <= 0.50 ? 'urgent'
                      : '';
          // Gleiche Breiten-Berechnung wie das Board-Grid
          const boardWidth = `calc(${state.puzzle.size} * var(--cell-size) + ${state.puzzle.size - 1} * var(--cell-gap) + 2 * var(--border-thick))`;
          return (
            <div
              className="header__progress-bar"
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ width: boardWidth }}
            >
              <div
                className={`header__progress-fill${phase ? ` header__progress-fill--${phase}` : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          );
        })()}

        <GameBoard
          grid={state.grid}
          puzzle={state.puzzle}
          won={state.won}
          whatIfMode={state.whatIfMode}
          onClickCell={clickCell}
          onDoubleClickCell={doubleClickCell}
          autoX={autoXEnabled}
          onUndo={undo}
          onRedo={redo}
          onToggleWhatIf={toggleWhatIf}
          onHint={applyHint}
          onRestart={restart}
        />

        <BottomControls {...controlProps} />
      </div>

      {state.won && (
        <WinModal
          elapsedSeconds={state.elapsedSeconds}
          difficulty={state.puzzle.difficulty}
          onRestart={restart}
          onNewPuzzle={state.campaignMode ? handleRestartCampaign : () => handleNewPuzzle(state.puzzle.difficulty)}
          campaignMode={state.campaignMode}
          level={state.level}
          onNextLevel={handleNextLevel}
        />
      )}

      {showDaily && (
        <DailyModal
          onSelect={handleSelectDaily}
          onClose={() => setShowDaily(false)}
        />
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {showLevelSelect && (
        <LevelSelectModal
          currentLevel={state.level}
          onSelectLevel={handleSelectLevel}
          onClose={() => setShowLevelSelect(false)}
        />
      )}

      {showSolution && (
        <SolutionModal
          puzzle={state.puzzle}
          onClose={() => setShowSolution(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
          countdownEnabled={countdownEnabled}
          onToggleCountdown={handleToggleCountdown}
          musicEnabled={musicEnabled}
          onToggleMusic={handleToggleMusic}
          timerDuration={timerDuration}
          onSetTimerDuration={handleSetTimerDuration}
          musicTrilogy={musicTrilogy}
          onSetMusicTrilogy={setMusicTrilogy}
          autoXEnabled={autoXEnabled}
          onToggleAutoX={handleToggleAutoX}
          colorPalette={colorPalette}
          onSetColorPalette={setColorPalette}
          onClose={() => setShowSettings(false)}
        />
      )}

      {state.gameOver && (
        <GameOverModal
          onRestart={state.campaignMode ? handleRestartCampaign : resetLives}
          onNewPuzzle={() => handleNewPuzzle(state.puzzle.difficulty)}
        />
      )}
    </>
  );
}
