import type { Board, CreatureFactory, Position, RandomSource, RefillResult } from './creature.ts';
import { sampleLevel, sampleRefillLevel } from './random.ts';
import { BOARD_SIZE, inBounds, neighbors, predatorPositions } from './geometry.ts';
import { selectActivations } from './activation-selection.ts';

export { BOARD_SIZE, inBounds, neighbors, predatorPositions } from './geometry.ts';
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

export function reactionCandidatesForMove(board: Board, first: Position, second: Position): Position[] {
  if (!inBounds(first) || !inBounds(second)
      || Math.abs(first.row - second.row) + Math.abs(first.col - second.col) !== 1
      || !board[first.row][first.col] || !board[second.row][second.col]) return [];
  const candidates = new Map<string, Position>([
    [`${first.row},${first.col}`, { ...first }],
    [`${second.row},${second.col}`, { ...second }],
  ]);
  for (const moved of [first, second]) {
    const predator = board[moved.row]?.[moved.col];
    if (!predator) continue;
    for (const neighbor of neighbors(moved)) {
      const prey = board[neighbor.row][neighbor.col];
      if (prey && predator.level === prey.level + 1) candidates.set(`${neighbor.row},${neighbor.col}`, neighbor);
    }
  }
  return [...candidates.values()];
}

export function predictsReaction(board: Board, first: Position, second: Position): boolean {
  const swapped = swapBoard(board, first, second);
  return swapped !== null && selectActivations(swapped, reactionCandidatesForMove(swapped, first, second), [first, second]).reactions.length > 0;
}

export function predictsMeld(board: Board, first: Position, second: Position): boolean {
  const swapped = swapBoard(board, first, second);
  return swapped !== null && selectActivations(swapped, reactionCandidatesForMove(swapped, first, second), [first, second]).melds.length > 0;
}

export interface ReactionMove { first: Position; second: Position }
export interface ReactionMoveHint extends ReactionMove { highlight: Position }
export type IdleHint = { type: 'move'; hint: ReactionMoveHint } | { type: 'free-moves' } | { type: 'lost' };

export function reactionProducingMoves(board: Board): ReactionMove[] {
  const moves: ReactionMove[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
    const position = { row, col };
    const right = { row, col: col + 1 };
    const down = { row: row + 1, col };
    if (predictsReaction(board, position, right)) moves.push({ first: position, second: right });
    if (predictsReaction(board, position, down)) moves.push({ first: position, second: down });
  }
  return moves;
}

export function hasReactingSwap(board: Board): boolean {
  return reactionProducingMoves(board).length > 0;
}

export function meldProducingMoves(board: Board): ReactionMove[] {
  const moves: ReactionMove[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
    const first = { row, col };
    for (const second of [{ row, col: col + 1 }, { row: row + 1, col }]) {
      if (predictsMeld(board, first, second)) moves.push({ first, second });
    }
  }
  return moves;
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
    const hasInitialReaction = (): boolean => {
      for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
        const first = { row, col };
        for (const second of [{ row, col: col + 1 }, { row: row + 1, col }]) {
          const swapped = swapBoard(board, first, second);
          if (swapped && reactionCandidatesForMove(swapped, first, second)
            .some(position => predatorPositions(swapped, position).length >= 3)) return true;
        }
      }
      return false;
    };
    if (new Set(board.flat().map(creature => creature?.level)).size === 5 && hasInitialReaction()) return board;
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

export function selectReactionMoveHint(
  board: Board,
  random: RandomSource,
): ReactionMoveHint | null {
  const moves = reactionProducingMoves(board);
  if (!moves.length) return null;
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Random values must be in [0, 1)');
  const move = moves[Math.floor(value * moves.length)];
  const after = swapBoard(board, move.first, move.second)!;
  const selection = selectActivations(after, reactionCandidatesForMove(after, move.first, move.second), [move.first, move.second]);
  for (const reaction of selection.reactions) {
    for (const moved of [move.first, move.second]) {
      if ((moved.row === reaction.prey.position.row && moved.col === reaction.prey.position.col)
          || reaction.predators.some(predator => predator.position.row === moved.row && predator.position.col === moved.col)) {
        return { ...move, highlight: { ...moved } };
      }
    }
  }
  return { ...move, highlight: { ...move.first } };
}

export function selectIdleHint(board: Board, freeMoves: number, random: RandomSource): IdleHint {
  const hint = selectReactionMoveHint(board, random);
  if (hint) return { type: 'move', hint };
  const moves = meldProducingMoves(board);
  if (moves.length) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Random values must be in [0, 1)');
    const move = moves[Math.floor(value * moves.length)];
    return { type: 'move', hint: { ...move, highlight: { ...move.first } } };
  }
  return freeMoves > 0 ? { type: 'free-moves' } : { type: 'lost' };
}