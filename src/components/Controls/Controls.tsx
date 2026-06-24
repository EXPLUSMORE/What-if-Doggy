// ============================================================
// Controls – TopControls (ueber Board) und BottomControls (unter Board)
//
// Jeder Button-Text wird in <span className="btn__icon"> + <span className="btn__label">
// aufgeteilt, damit auf Mobile (CSS) nur das Icon sichtbar bleibt.
// ============================================================

import { useLang } from '../../i18n/LanguageContext';
import type { Difficulty } from '../../types';

export interface ControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  whatIfMode: boolean;
  won: boolean;
  difficulty: Difficulty;
  campaignMode?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleWhatIf: () => void;
  onRestart: () => void;
  onHint: () => void;
  onNewPuzzle: (difficulty: Difficulty) => void;
  onOpenDaily: () => void;
  onOpenRules: () => void;
  onOpenSolution: () => void;
  onStartCampaign: () => void;
  onOpenLevelSelect?: () => void;
}

// Icon + Label trennen: "🎲 Neu" → <span icon>🎲</span><span label> Neu</span>
// Auf Mobile blendet CSS .btn__label aus.
function BtnContent({ label }: { label: string }) {
  const sp = label.indexOf(' ');
  if (sp === -1) return <>{label}</>;
  return (
    <>
      <span className="btn__icon" aria-hidden="true">{label.slice(0, sp)}</span>
      <span className="btn__label">{label.slice(sp)}</span>
    </>
  );
}

// ── Obere Buttons: Puzzle-Auswahl & Info ───────────────────────
export function TopControls({
  won,
  difficulty,
  campaignMode,
  onHint,
  onNewPuzzle,
  onOpenRules,
  onOpenSolution,
  onStartCampaign,
  onOpenLevelSelect,
}: Pick<ControlsProps, 'won' | 'difficulty' | 'campaignMode' | 'onHint' | 'onNewPuzzle' | 'onOpenRules' | 'onOpenSolution' | 'onStartCampaign' | 'onOpenLevelSelect'>) {
  const { t } = useLang();

  return (
    <div className="controls controls--top">
      <button
        className="btn btn--pill btn--primary"
        onClick={() => onNewPuzzle(difficulty)}
        title={t.controls.newPuzzle}
      >
        <BtnContent label={t.controls.newPuzzle} />
      </button>

      {!campaignMode && (
        <button
          className="btn btn--pill"
          onClick={onStartCampaign}
          title={t.controls.campaign}
        >
          <BtnContent label={t.controls.campaign} />
        </button>
      )}

      {campaignMode && (
        <button
          className="btn btn--pill"
          onClick={onOpenLevelSelect}
          title={t.levelSelect.button}
        >
          <BtnContent label={t.levelSelect.button} />
        </button>
      )}

      <button className="btn btn--pill" onClick={onHint} disabled={won} title={t.controls.hintTitle}>
        <BtnContent label={t.controls.hint} />
      </button>

      <button className="btn btn--pill" onClick={onOpenSolution}>
        <BtnContent label={t.solution.button} />
      </button>

      <button className="btn btn--pill" onClick={onOpenRules}>
        <BtnContent label={t.controls.rules} />
      </button>
    </div>
  );
}

// ── Untere Buttons: Spielsteuerung ────────────────────────────
export function BottomControls({
  canUndo,
  canRedo,
  whatIfMode,
  won,
  onUndo,
  onRedo,
  onToggleWhatIf,
  onRestart,
}: Pick<ControlsProps, 'canUndo' | 'canRedo' | 'whatIfMode' | 'won' | 'onUndo' | 'onRedo' | 'onToggleWhatIf' | 'onRestart'>) {
  const { t } = useLang();

  const handleRestart = () => {
    if (confirm(t.restartConfirm)) onRestart();
  };

  return (
    <div className="controls controls--bottom">
      <button className="btn btn--pill" onClick={onUndo} disabled={!canUndo || won} title={t.controls.undoTitle}>
        <BtnContent label={t.controls.undo} />
      </button>

      <button className="btn btn--pill" onClick={onRedo} disabled={!canRedo || won} title={t.controls.redoTitle}>
        <BtnContent label={t.controls.redo} />
      </button>

      <button
        className={`btn btn--pill${whatIfMode ? ' btn--whatif' : ''}`}
        onClick={onToggleWhatIf}
        disabled={won}
        title={t.controls.whatifTitle}
      >
        <BtnContent label={t.controls.whatif} />
      </button>

      <button className="btn btn--pill" onClick={handleRestart} title={t.controls.restartTitle}>
        <BtnContent label={t.controls.restart} />
      </button>
    </div>
  );
}

// Legacy-Export fuer Tests/Compat
export function Controls(props: ControlsProps) {
  return (
    <>
      <TopControls {...props} />
      <BottomControls {...props} />
    </>
  );
}
