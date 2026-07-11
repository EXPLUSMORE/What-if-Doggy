// ============================================================
// What if Doggy – Zentrale Typdefinitionen
// ============================================================

/** Mögliche Zustände einer einzelnen Zelle */
export type CellState = 'empty' | 'dog' | 'mark';

/** Quelle eines Zellwerts: normal (permanent) oder what-if (temporär) */
export type CellSource = 'normal' | 'whatif';

/** Eine Zelle im Spielfeld */
export interface Cell {
  row: number;
  col: number;
  state: CellState;
  source: CellSource;
  /** Ob diese Zelle gerade in einem Konflikt beteiligt ist */
  conflict: boolean;
}

/** Eine farbige Region, bestehend aus Zellkoordinaten */
export interface Region {
  id: number;
  /** CSS-Farbwert (hsl / hex / rgb) */
  color: string;
  /** Menschenlesbares Label, z. B. "Region A" */
  label: string;
  cells: ReadonlyArray<{ row: number; col: number }>;
}

/** Ein vollständiges Puzzle */
export interface Puzzle {
  id: string;
  size: number;
  regions: Region[];
  /** regionId pro Zelle: regionMap[row][col] = regionId */
  regionMap: ReadonlyArray<ReadonlyArray<number>>;
  /** Eindeutige Lösung: solutionMap[row][col] = true → Hund */
  solution: ReadonlyArray<ReadonlyArray<boolean>>;
  difficulty: Difficulty;
  seed: string;
  createdAt: number;
}

/** Schwierigkeitsgrade */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master';

/** Spielfeld-State: Zustand jeder Zelle */
export type GridState = Cell[][];

/** Ein einzelner Zug für Undo/Redo */
export interface Move {
  row: number;
  col: number;
  prevState: CellState;
  prevSource: CellSource;
  nextState: CellState;
  nextSource: CellSource;
}

/** Spielzustand */
export interface GameState {
  puzzle: Puzzle;
  grid: GridState;
  /** What-if-Modus aktiv? */
  whatIfMode: boolean;
  /** Gewonnen? */
  won: boolean;
  /** Game Over (alle Leben verloren) */
  gameOver: boolean;
  /** Verbleibende Leben (0–3) */
  lives: number;
  /** Verbleibende Knochen für das aktuelle Leben (0–3) */
  bones: number;
  /** Undo-History */
  history: Move[][];
  historyIndex: number;
  /** Startzeit des aktuellen Spiels */
  startedAt: number;
  /** Verstrichene Sekunden (wird bei Gewinn eingefroren) */
  elapsedSeconds: number;
  /** Kampagnen-Level (0 = Free Play, 1–20 = Campaign) */
  level: number;
  /** Ob der Kampagnen-Modus aktiv ist */
  campaignMode: boolean;
  /** Gesamtdauer des Countdowns in Sekunden (konfigurierbar) */
  countdownDuration: number;
  /** Verbleibende Sekunden im Countdown */
  countdownSeconds: number;
}

/** Validierungsergebnis */
export interface ValidationResult {
  valid: boolean;
  /** Koordinaten aller Konfliktzellen */
  conflicts: Array<{ row: number; col: number }>;
  /** Fehlerdetails für Debugging / Hints */
  errors: ValidationError[];
}

export type ValidationErrorType =
  | 'row_duplicate'
  | 'col_duplicate'
  | 'region_duplicate'
  | 'adjacency';

export interface ValidationError {
  type: ValidationErrorType;
  cells: Array<{ row: number; col: number }>;
  message: string;
}

/** Hint-Ergebnis */
export interface HintResult {
  row: number;
  col: number;
  reason: string;
}

/** Gespeicherter Spielstand in localStorage */
export interface SavedGame {
  puzzleId: string;
  gridSnapshot: Array<{ row: number; col: number; state: CellState; source: CellSource }>;
  historySnapshot: Move[][];
  historyIndex: number;
  startedAt: number;
  elapsedSeconds: number;
  savedAt: number;
  lives?: number;
  bones?: number;
  gameOver?: boolean;
  level?: number;
  campaignMode?: boolean;
  countdownSeconds?: number;
}

/** Tagesrätsel-Metadaten */
export interface DailyPuzzleMeta {
  dateKey: string; // "YYYY-MM-DD"
  puzzleId: string;
  seed: string;
  difficulty: Difficulty;
}

/** Verfügbare Farbpaletten */
export type ColorPalette = 'default' | 'candy' | 'jewel' | 'neon';

/**
 * Regionfarben als CSS-Custom-Property-Referenzen.
 * Die eigentlichen Farbwerte werden in globals.css per :root / [data-palette] definiert.
 * So lässt sich die Palette ohne Re-Render wechseln.
 */
export const REGION_COLORS: ReadonlyArray<string> = [
  'var(--region-0)',
  'var(--region-1)',
  'var(--region-2)',
  'var(--region-3)',
  'var(--region-4)',
  'var(--region-5)',
  'var(--region-6)',
  'var(--region-7)',
  'var(--region-8)',
  'var(--region-9)',
  'var(--region-10)',
  'var(--region-11)',
  'var(--region-12)',
  'var(--region-13)',
  'var(--region-14)',
];
