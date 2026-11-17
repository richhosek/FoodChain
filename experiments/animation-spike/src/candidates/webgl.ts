import { createBoardCandidate } from './current-canvas.ts';

export function createWebGLCandidate() {
  return createBoardCandidate('webgl', true);
}