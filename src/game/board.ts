import type { Board, CreatureFactory, Position, RandomSource, RefillResult } from './creature.ts';
import { sampleLevel, sampleRefillLevel } from './random.ts';

export const BOARD_SIZE = 8;
export interface GenerationOptions { signal?: AbortSignal; batchSize?: number; yieldControl?: () => Promise<void> }

export function abortError(): Error {
  const error = new Error('Operation aborted');
  error.name = 'AbortError';
  return error;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

export function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const aborted = (): void => reject(abortError());
    signal.addEventListener('abort', aborted, { once: true });
    promise.then(value => { signal.removeEventListener('abort', aborted); resolve(value); }, error => { signal.removeEventListener('abort', aborted); reject(error); });
  });
}

export function inBounds(position: Position): boolean {
  return Number.isInteger(position.row) && Number.isInteger(position.col)
    && position.row >= 0 && position.row < BOARD_SIZE && position.col >= 0 && position.col < BOARD_SIZE;
}

export function neighbors(position: Position): Position[] {
  const result: Position[] = [];
  for (let row = position.row - 1; row <= position.row + 1; row++) {
    for (let col = position.col - 1; col <= position.col + 1; col++) {
      if ((row !== position.row || col !== position.col) && inBounds({ row, col })) result.push({ row, col });
    }
  }
  return result;
}

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(creature => creature ? { ...creature } : null));
}

export function swapBoard(board: Board, first: Position, second: Position): Board | null {
  if (!inBounds(first) || !inBounds(second) || Math.abs(first.row - second.row) + Math.abs(first.col - second.col) !== 1
      || !board[first.row][first.col] || !board[second.row][second.col]) return null;
  const result = cloneBoard(board);
  [result[first.row][first.col], result[second.row][second.col]] = [result[second.row][second.col], result[first.row][first.col]];
  return result;
}

export function predatorPositions(board: Board, position: Position): Position[] {
  if (!inBounds(position)) return [];
  const prey = board[position.row][position.col];
  if (!prey) return [];
  return neighbors(position).filter(neighbor => board[neighbor.row][neighbor.col]?.level === prey.level + 1);
}

export function predictsReaction(board: Board, first: Position, second: Position): boolean {
  const swapped = swapBoard(board, first, second);
  return swapped !== null && [first, second].some(position => predatorPositions(swapped, position).length >= 3);
}

export function hasReactingSwap(board: Board): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
    const position = { row, col };
    if (predictsReaction(board, position, { row, col: col + 1 }) || predictsReaction(board, position, { row: row + 1, col })) return true;
  }
  return false;
}

export async function generateBoard(random: RandomSource, options: GenerationOptions = {}): Promise<Board> {
  const batchSize = options.batchSize ?? 32;
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new RangeError('batchSize must be a positive integer');
  const yieldControl = options.yieldControl ?? (() => new Promise<void>(resolve => setTimeout(resolve, 0)));
  let attempts = 0;
  for (;;) {
    throwIfAborted(options.signal);
    const board: Board = Array.from({ length: BOARD_SIZE }, (_, row) =>
      Array.from({ length: BOARD_SIZE }, (_, col) => ({ id: `initial-${row}-${col}`, level: sampleLevel(random) })));
    if (new Set(board.flat().map(creature => creature?.level)).size === 5 && hasReactingSwap(board)) return board;
    if (++attempts % batchSize === 0) {
      await abortable(Promise.resolve().then(() => { throwIfAborted(options.signal); return yieldControl(); }), options.signal);
      throwIfAborted(options.signal);
    }
  }
}

export function refillBoard(board: Board, random: RandomSource, createCreature: CreatureFactory): RefillResult {
  const result = cloneBoard(board);
  const movements: RefillResult['movements'] = [];
  const candidates: Position[] = [];
  for (let col = 0; col < BOARD_SIZE; col++) {
    let destination = BOARD_SIZE - 1;
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      const creature = board[row][col];
      if (!creature) continue;
      result[destination][col] = { ...creature };
      if (row !== destination) {
        const to = { row: destination, col };
        movements.push({ creature: { ...creature }, from: { row, col }, to });
        candidates.push(to);
      }
      destination--;
    }
    for (let row = 0; row <= destination; row++) {
      const creature = createCreature(sampleRefillLevel(random));
      result[row][col] = creature;
      const to = { row, col };
      movements.push({ creature: { ...creature }, from: null, to });
      candidates.push(to);
    }
  }
  return { board: result, movements, candidates };
}