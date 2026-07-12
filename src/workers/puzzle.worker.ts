// ============================================================
// puzzle.worker.ts – Puzzle-Generierung im Web Worker
//
// Läuft in einem separaten Thread, blockiert nie den Main-Thread.
// Kommuniziert via postMessage (structured clone).
// ============================================================

import { generatePuzzle, getDailyPuzzle, generateLevelPuzzle } from '../engine/generator';
import type { GeneratorOptions } from '../engine/generator';
import type { Difficulty } from '../types';

type WorkerRequest =
  | { id: string; type: 'generate'; options: GeneratorOptions }
  | { id: string; type: 'level';    level: number }
  | { id: string; type: 'daily';    difficulty: Difficulty };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    let puzzle;
    switch (req.type) {
      case 'generate': puzzle = generatePuzzle(req.options); break;
      case 'level':    puzzle = generateLevelPuzzle(req.level); break;
      case 'daily':    puzzle = getDailyPuzzle(new Date(), req.difficulty); break;
    }
    self.postMessage({ id: req.id, puzzle, error: null });
  } catch (err) {
    self.postMessage({ id: req.id, puzzle: null, error: String(err) });
  }
};
