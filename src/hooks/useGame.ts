// ============================================================
// useGame – Zentraler Spielzustand
//
// Wichtig: Puzzle-Generierung findet IMMER in Callbacks statt,
// NIEMALS im Reducer (synchroner Main-Thread-Block).
// ============================================================

import { useReducer, useCallback, useEffect, useRef } from 'react';
import type { Puzzle, GridState, GameState, Move, CellState, CellSource, SavedGame } from '../types';
import { validateGrid, isWon, getHint } from '../engine/validator';
import { generatePuzzle, getDailyPuzzle, generateLevelPuzzle } from '../engine/generator';

// ── Hilfsfunktionen ──────────────────────────────────────────

function buildEmptyGrid(puzzle: Puzzle): GridState {
  return Array.from({ length: puzzle.size }, (_, row) =>
    Array.from({ length: puzzle.size }, (_, col) => ({
      row,
      col,
      state: 'empty' as CellState,
      source: 'normal' as CellSource,
      conflict: false,
    })),
  );
}

function applyConflicts(grid: GridState, puzzle: Puzzle): GridState {
  const result = validateGrid(grid, puzzle);
  const conflictSet = new Set(result.conflicts.map(c => `${c.row},${c.col}`));
  return grid.map(row =>
    row.map(cell => ({
      ...cell,
      conflict: conflictSet.has(`${cell.row},${cell.col}`),
    })),
  );
}

function nextStateSingle(current: CellState): CellState {
  if (current === 'mark') return 'empty';
  if (current === 'dog')  return 'empty';
  return 'mark';
}

function nextStateDouble(current: CellState): CellState {
  if (current === 'dog') return 'empty';
  return 'dog';
}

export const MAX_LIVES = 3;
export const MAX_BONES = 3;

function applyError(lives: number, bones: number): { lives: number; bones: number; gameOver: boolean } {
  if (bones > 1) return { lives, bones: bones - 1, gameOver: false };
  if (lives > 1) return { lives: lives - 1, bones: MAX_BONES, gameOver: false };
  return { lives: 0, bones: 0, gameOver: true };
}

const STORAGE_KEY_PREFIX = 'wif-doggy-save-';

function saveToStorage(state: GameState): void {
  try {
    const saved: SavedGame = {
      puzzleId: state.puzzle.id,
      gridSnapshot: state.grid.flatMap(row =>
        row
          .filter(c => c.state !== 'empty')
          .map(c => ({ row: c.row, col: c.col, state: c.state, source: c.source })),
      ),
      historySnapshot: state.history,
      historyIndex: state.historyIndex,
      startedAt: state.startedAt,
      elapsedSeconds: state.elapsedSeconds,
      savedAt: Date.now(),
      lives: state.lives,
      bones: state.bones,
      gameOver: state.gameOver,
      level: state.level,
      campaignMode: state.campaignMode,
    };
    localStorage.setItem(STORAGE_KEY_PREFIX + state.puzzle.id, JSON.stringify(saved));
  } catch { /* ignore */ }
}

function loadFromStorage(puzzleId: string): SavedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + puzzleId);
    return raw ? (JSON.parse(raw) as SavedGame) : null;
  } catch {
    return null;
  }
}

// ── Actions ──────────────────────────────────────────────────
// Puzzle-Generierung passiert IMMER im Callback, nie im Reducer.
// Aktionen, die ein neues Puzzle laden, bekommen das fertige Puzzle uebergeben.

type Action =
  | { type: 'CLICK_CELL'; row: number; col: number }
  | { type: 'DOUBLE_CLICK_CELL'; row: number; col: number; autoX?: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'TOGGLE_WHATIF' }
  | { type: 'RESTART' }
  | { type: 'LOAD_PUZZLE'; puzzle: Puzzle }
  | { type: 'LOAD_CAMPAIGN_LEVEL'; puzzle: Puzzle; level: number; resetLives: boolean; bonusReward?: boolean; countdownDuration?: number }
  | { type: 'APPLY_HINT' }
  | { type: 'TICK'; seconds: number }
  | { type: 'RESET_LIVES' }
  | { type: 'TICK_COUNTDOWN' }
  | { type: 'APPLY_PENALTY' };

// ── Reducer ──────────────────────────────────────────────────

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {

    case 'TICK':
      if (state.won || state.gameOver) return state;
      return { ...state, elapsedSeconds: action.seconds };

    case 'CLICK_CELL':
    case 'DOUBLE_CLICK_CELL': {
      if (state.won || state.gameOver) return state;

      const { row, col } = action;
      const cell = state.grid[row][col];
      const source: CellSource = state.whatIfMode ? 'whatif' : 'normal';
      const newState = action.type === 'DOUBLE_CLICK_CELL'
        ? nextStateDouble(cell.state)
        : nextStateSingle(cell.state);

      // Primärer Zug (Hund oder X auf der angeklickten Zelle)
      const primaryMove: Move = {
        row,
        col,
        prevState: cell.state,
        prevSource: cell.source,
        nextState: newState,
        nextSource: source,
      };

      let newGrid: GridState = state.grid.map(r =>
        r.map(c => c.row === row && c.col === col ? { ...c, state: newState, source } : c),
      );

      // ── Solution-Check VOR Auto-X ────────────────────────────────
      // Erst prüfen ob der Hund korrekt ist. Falscher Hund:
      //   • kein Auto-X (Zeile/Spalte/Region bleibt offen)
      //   • Zelle wird als Konflikt markiert (roter Rahmen + Shake)
      //   • Strafe: Knochen/Leben-Abzug
      const isPlacingDog = action.type === 'DOUBLE_CLICK_CELL'
        && newState === 'dog'
        && !state.whatIfMode;
      const isWrongDog = isPlacingDog && !state.puzzle.solution[row][col];

      // Auto-X: Beim Platzieren eines RICHTIGEN Hundes alle leeren Zellen in
      // gleicher Zeile, Spalte, farbiger Region UND diagonal-angrenzende Zellen
      // automatisch markieren (wenn autoX-Modus aktiv).
      // Bei falschem Hund wird Auto-X NICHT angewendet.
      // Alle Auto-Züge landen im selben History-Eintrag → ein einziges Undo.
      const autoMoves: Move[] = [];
      if (action.type === 'DOUBLE_CLICK_CELL' && newState === 'dog' && action.autoX && !isWrongDog) {
        const regionId = state.puzzle.regionMap[row][col];
        newGrid = newGrid.map(r =>
          r.map(c => {
            if (c.row === row && c.col === col) return c;   // Hund-Zelle selbst überspringen
            if (c.state !== 'empty') return c;              // Bereits belegt überspringen
            const sameRow    = c.row === row;
            const sameCol    = c.col === col;
            const sameRegion = state.puzzle.regionMap[c.row][c.col] === regionId;
            // Diagonal-Nachbarn: Abstand je 1 in Zeile UND Spalte
            const isDiag     = Math.abs(c.row - row) === 1 && Math.abs(c.col - col) === 1;
            if (sameRow || sameCol || sameRegion || isDiag) {
              autoMoves.push({
                row: c.row, col: c.col,
                prevState: c.state, prevSource: c.source,
                nextState: 'mark',  nextSource: source,
              });
              return { ...c, state: 'mark' as CellState, source };
            }
            return c;
          }),
        );
      }

      let resolvedGrid = applyConflicts(newGrid, state.puzzle);

      // Falscher Hund: Zelle zusätzlich als Konflikt markieren → roter Rahmen + Shake
      // (unabhängig davon ob Constraint-Konflikte vorliegen)
      if (isWrongDog) {
        resolvedGrid = resolvedGrid.map(r =>
          r.map(c => c.row === row && c.col === col ? { ...c, conflict: true } : c),
        );
      }

      let lives = state.lives;
      let bones = state.bones;
      let gameOver: boolean = state.gameOver;
      if (isWrongDog) {
        ({ lives, bones, gameOver } = applyError(lives, bones));
      }

      // Hund-Move + alle Auto-X-Moves als ein History-Eintrag
      const allMoves: Move[] = [primaryMove, ...autoMoves];
      const newHistory = [...state.history.slice(0, state.historyIndex + 1), allMoves];
      const won = !gameOver && isWon(resolvedGrid, state.puzzle);
      const next: GameState = {
        ...state,
        grid: resolvedGrid,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        won,
        gameOver,
        lives,
        bones,
        startedAt: state.startedAt === 0 ? Date.now() : state.startedAt,
      };
      saveToStorage(next);
      return next;
    }

    case 'UNDO': {
      if (state.historyIndex < 0) return state;
      const moves = state.history[state.historyIndex];
      let newGrid: GridState = state.grid.map(r => r.map(c => ({ ...c })));
      for (const move of [...moves].reverse()) {
        newGrid[move.row][move.col] = {
          ...newGrid[move.row][move.col],
          state: move.prevState,
          source: move.prevSource,
        };
      }
      newGrid = applyConflicts(newGrid, state.puzzle);
      const next: GameState = { ...state, grid: newGrid, historyIndex: state.historyIndex - 1, won: false };
      saveToStorage(next);
      return next;
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const moves = state.history[state.historyIndex + 1];
      let newGrid: GridState = state.grid.map(r => r.map(c => ({ ...c })));
      for (const move of moves) {
        newGrid[move.row][move.col] = {
          ...newGrid[move.row][move.col],
          state: move.nextState,
          source: move.nextSource,
        };
      }
      newGrid = applyConflicts(newGrid, state.puzzle);
      const won = isWon(newGrid, state.puzzle);
      const next: GameState = { ...state, grid: newGrid, historyIndex: state.historyIndex + 1, won };
      saveToStorage(next);
      return next;
    }

    case 'TOGGLE_WHATIF': {
      if (state.whatIfMode) {
        let newGrid: GridState = state.grid.map(row =>
          row.map(cell =>
            cell.source === 'whatif'
              ? { ...cell, state: 'empty' as CellState, source: 'normal' as CellSource }
              : cell,
          ),
        );
        newGrid = applyConflicts(newGrid, state.puzzle);
        return { ...state, whatIfMode: false, grid: newGrid };
      }
      return { ...state, whatIfMode: true };
    }

    case 'RESTART': {
      const freshGrid = applyConflicts(buildEmptyGrid(state.puzzle), state.puzzle);
      const next: GameState = {
        ...state,
        grid: freshGrid,
        won: false,
        gameOver: false,
        whatIfMode: false,
        history: [],
        historyIndex: -1,
        startedAt: 0,
        elapsedSeconds: 0,
        countdownSeconds: 180,
        // Im Kampagnen-Modus: Leben behalten; sonst resetten
        lives: state.campaignMode ? state.lives : MAX_LIVES,
        bones: state.campaignMode ? state.bones : MAX_BONES,
      };
      saveToStorage(next);
      return next;
    }

    case 'RESET_LIVES': {
      // Nach Game Over: Free Play neu mit frischen Leben
      const freshGrid = applyConflicts(buildEmptyGrid(state.puzzle), state.puzzle);
      const next: GameState = {
        ...state,
        grid: freshGrid,
        won: false,
        gameOver: false,
        lives: MAX_LIVES,
        bones: MAX_BONES,
        whatIfMode: false,
        history: [],
        historyIndex: -1,
        startedAt: 0,
        elapsedSeconds: 0,
        countdownDuration: 180,
        countdownSeconds: 180,
        campaignMode: false,
        level: 0,
      };
      saveToStorage(next);
      return next;
    }

    // Puzzle wechseln (Free Play – verlässt Kampagnen-Modus)
    case 'LOAD_PUZZLE': {
      const { puzzle } = action;
      const saved = loadFromStorage(puzzle.id);
      let grid = buildEmptyGrid(puzzle);
      let history: Move[][] = [];
      let historyIndex = -1;
      let startedAt = 0;
      let elapsedSeconds = 0;

      if (saved) {
        for (const snap of saved.gridSnapshot) {
          grid[snap.row][snap.col] = {
            row: snap.row, col: snap.col,
            state: snap.state, source: snap.source, conflict: false,
          };
        }
        history = saved.historySnapshot;
        historyIndex = saved.historyIndex;
        startedAt = saved.startedAt;
        elapsedSeconds = saved.elapsedSeconds;
      }

      grid = applyConflicts(grid, puzzle);
      return {
        puzzle,
        grid,
        whatIfMode: false,
        won: false,
        gameOver: saved?.gameOver ?? false,
        lives: saved?.lives ?? MAX_LIVES,
        bones: saved?.bones ?? MAX_BONES,
        history,
        historyIndex,
        startedAt,
        elapsedSeconds,
        level: 0,
        campaignMode: false,
        countdownDuration: 180,
        countdownSeconds: 180,
      };
    }

    // Kampagnen-Level laden (Puzzle wurde im Callback generiert)
    case 'LOAD_CAMPAIGN_LEVEL': {
      const { puzzle, level, resetLives, bonusReward, countdownDuration: dur } = action;
      const duration = dur ?? 180;
      const grid = applyConflicts(buildEmptyGrid(puzzle), puzzle);
      // Alle 5 abgeschlossenen Level: einen Knochen (oder Leben) zurückgeben
      let lives = resetLives ? MAX_LIVES : state.lives;
      let bones = resetLives ? MAX_BONES : state.bones;
      if (bonusReward && !resetLives) {
        if (bones < MAX_BONES) { bones = bones + 1; }
        else if (lives < MAX_LIVES) { lives = lives + 1; bones = MAX_BONES; }
      }
      const next: GameState = {
        ...state,
        puzzle,
        grid,
        won: false,
        gameOver: false,
        whatIfMode: false,
        history: [],
        historyIndex: -1,
        startedAt: 0,
        elapsedSeconds: 0,
        level,
        campaignMode: true,
        countdownDuration: duration,
        countdownSeconds: duration,
        lives,
        bones,
      };
      saveToStorage(next);
      return next;
    }

    case 'TICK_COUNTDOWN': {
      if (!state.campaignMode || state.won || state.gameOver) return state;
      const newSeconds = state.countdownSeconds - 1;
      if (newSeconds <= 0) {
        const { lives, bones, gameOver } = applyError(state.lives, state.bones);
        const next: GameState = { ...state, countdownSeconds: state.countdownDuration, lives, bones, gameOver };
        saveToStorage(next);
        return next;
      }
      return { ...state, countdownSeconds: newSeconds };
    }

    case 'APPLY_HINT': {
      const hint = getHint(state.grid, state.puzzle);
      if (!hint) return state;
      return gameReducer(state, { type: 'DOUBLE_CLICK_CELL', row: hint.row, col: hint.col });
    }

    case 'APPLY_PENALTY': {
      if (!state.campaignMode) return state;
      const { lives, bones, gameOver } = applyError(state.lives, state.bones);
      const next: GameState = { ...state, lives, bones, gameOver };
      saveToStorage(next);
      return next;
    }

    default:
      return state;
  }
}

// ── Initialer State ───────────────────────────────────────────

function buildInitialState(puzzle: Puzzle): GameState {
  const saved = loadFromStorage(puzzle.id);
  let grid = buildEmptyGrid(puzzle);
  let history: Move[][] = [];
  let historyIndex = -1;
  let startedAt = 0;
  let elapsedSeconds = 0;

  if (saved) {
    for (const snap of saved.gridSnapshot) {
      grid[snap.row][snap.col] = {
        row: snap.row, col: snap.col,
        state: snap.state, source: snap.source, conflict: false,
      };
    }
    history = saved.historySnapshot;
    historyIndex = saved.historyIndex;
    startedAt = saved.startedAt;
    elapsedSeconds = saved.elapsedSeconds;
  }

  grid = applyConflicts(grid, puzzle);
  return {
    puzzle,
    grid,
    whatIfMode: false,
    won: isWon(grid, puzzle),
    gameOver: saved?.gameOver ?? false,
    lives: saved?.lives ?? MAX_LIVES,
    bones: saved?.bones ?? MAX_BONES,
    history,
    historyIndex,
    startedAt,
    elapsedSeconds,
    level: saved?.level ?? 0,
    campaignMode: saved?.campaignMode ?? false,
    countdownDuration: 180,
    countdownSeconds: 180,
  };
}

// ── Hook ─────────────────────────────────────────────────────

export function useGame(initialPuzzle?: Puzzle) {
  const puzzle = initialPuzzle ?? generatePuzzle({ difficulty: 'medium' });
  const [state, dispatch] = useReducer(gameReducer, puzzle, buildInitialState);
  // Ref fuer aktuellen Level (verhindert stale closure in nextLevel-Callback)
  const levelRef = useRef(state.level);
  const durationRef = useRef(state.countdownDuration);
  const livesRef = useRef({ lives: state.lives, bones: state.bones });
  useEffect(() => { levelRef.current = state.level; }, [state.level]);
  useEffect(() => { durationRef.current = state.countdownDuration; }, [state.countdownDuration]);
  useEffect(() => { livesRef.current = { lives: state.lives, bones: state.bones }; }, [state.lives, state.bones]);

  const clickCell = useCallback((row: number, col: number) =>
    dispatch({ type: 'CLICK_CELL', row, col }), []);

  const doubleClickCell = useCallback((row: number, col: number, autoX = false) =>
    dispatch({ type: 'DOUBLE_CLICK_CELL', row, col, autoX }), []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const toggleWhatIf = useCallback(() => dispatch({ type: 'TOGGLE_WHATIF' }), []);
  const restart = useCallback(() => dispatch({ type: 'RESTART' }), []);
  const applyHint = useCallback(() => dispatch({ type: 'APPLY_HINT' }), []);
  const resetLives = useCallback(() => dispatch({ type: 'RESET_LIVES' }), []);
  const tick = useCallback((seconds: number) => dispatch({ type: 'TICK', seconds }), []);
  const tickCountdown = useCallback(() => dispatch({ type: 'TICK_COUNTDOWN' }), []);
  const penalize = useCallback(() => dispatch({ type: 'APPLY_PENALTY' }), []);

  const loadPuzzle = useCallback((p: Puzzle) =>
    dispatch({ type: 'LOAD_PUZZLE', puzzle: p }), []);

  // Puzzle-Generierung immer im Callback, nie im Reducer
  const newPuzzle = useCallback((difficulty: import('../types').Difficulty = 'medium') => {
    const p = generatePuzzle({ difficulty });
    dispatch({ type: 'LOAD_PUZZLE', puzzle: p });
  }, []);

  const loadDaily = useCallback((difficulty: import('../types').Difficulty = 'medium') => {
    const p = getDailyPuzzle(new Date(), difficulty);
    dispatch({ type: 'LOAD_PUZZLE', puzzle: p });
  }, []);

  // Kampagne starten: Level 1, volle Leben
  const startCampaign = useCallback((countdownDuration = 180) => {
    const p = generateLevelPuzzle(1);
    dispatch({ type: 'LOAD_CAMPAIGN_LEVEL', puzzle: p, level: 1, resetLives: true, countdownDuration });
  }, []);

  // Naechstes Level: aktuellen Level aus Ref lesen, Leben behalten
  // Alle 5 abgeschlossenen Level → Bonus (Knochen oder Leben)
  const nextLevel = useCallback((countdownDuration?: number) => {
    const completedLevel = levelRef.current;
    const nextLvl = completedLevel + 1;
    const bonusReward = completedLevel > 0 && completedLevel % 5 === 0;
    const p = generateLevelPuzzle(nextLvl);
    dispatch({ type: 'LOAD_CAMPAIGN_LEVEL', puzzle: p, level: nextLvl, resetLives: false, bonusReward, countdownDuration: countdownDuration ?? durationRef.current });
  }, []);

  // Kampagne nach Game Over von vorne starten
  const restartCampaign = useCallback((countdownDuration?: number) => {
    const p = generateLevelPuzzle(1);
    dispatch({ type: 'LOAD_CAMPAIGN_LEVEL', puzzle: p, level: 1, resetLives: true, countdownDuration: countdownDuration ?? durationRef.current });
  }, []);

  // Kampagne bei beliebigem Level starten (Level-Auswahl)
  const startCampaignFromLevel = useCallback((level: number, countdownDuration?: number) => {
    const p = generateLevelPuzzle(level);
    dispatch({ type: 'LOAD_CAMPAIGN_LEVEL', puzzle: p, level, resetLives: true, countdownDuration: countdownDuration ?? durationRef.current });
  }, []);

  const canUndo = state.historyIndex >= 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  useEffect(() => { saveToStorage(state); }, [state]);

  return {
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
    loadPuzzle,
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
  };
}
