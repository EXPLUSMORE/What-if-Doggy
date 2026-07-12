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
    const level = req.type === 'level' ? req.level : undefined;
    self.postMessage({ id: req.id, puzzle, error: null, level });
  } catch (err) {
    const level = req.type === 'level' ? req.level : undefined;
    self.postMessage({ id: req.id, puzzle: null, error: String(err), level });
  }
};
