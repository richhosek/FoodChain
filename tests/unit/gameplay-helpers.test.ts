import test from 'node:test';
import assert from 'node:assert/strict';
import { boardWith, boardWithoutActivations, pos } from '../fixtures/boards.ts';
import { hasReactingSwap, predictsReaction, reactionCandidatesForMove, reactionProducingMoves, selectIdleHint, selectReactionMoveHint, swapBoard } from '../../src/game/board.ts';
import type { Board } from '../../src/game/creature.ts';

function withCreature(board: Board, row: number, col: number, level: 0 | 1 | 2 | 3 | 4): void {
  board[row][col] = { id: `test-${row}-${col}`, level };
}

test('adds stationary prey when a moved predator completes its group', () => {
  const board = boardWith();
  withCreature(board, 3, 3, 0);
  withCreature(board, 2, 3, 1);
  withCreature(board, 3, 4, 1);
  withCreature(board, 3, 1, 1);
  const before = structuredClone(board);

  const first = pos(3, 1), second = pos(3, 2);
  const postMove = swapBoard(board, first, second);
  assert.ok(postMove);
  const candidates = reactionCandidatesForMove(postMove, first, second);

  assert.ok(candidates.some(candidate => candidate.row === 3 && candidate.col === 1));
  assert.ok(candidates.some(candidate => candidate.row === 3 && candidate.col === 2));
  assert.ok(candidates.some(candidate => candidate.row === 3 && candidate.col === 3));
  assert.deepEqual(board, before);
  assert.equal(predictsReaction(board, first, second), true);
  assert.equal(hasReactingSwap(board), true);
});

test('deduplicates stationary prey adjacent to both moved predators', () => {
  const board = boardWith();
  withCreature(board, 3, 2, 0);
  withCreature(board, 2, 2, 1);
  withCreature(board, 2, 3, 1);
  const first = pos(2, 2), second = pos(2, 3);
  const postMove = swapBoard(board, first, second);
  assert.ok(postMove);

  const candidates = reactionCandidatesForMove(postMove, first, second);

  assert.equal(candidates.filter(candidate => candidate.row === 3 && candidate.col === 2).length, 1);
  assert.ok(candidates.some(candidate => candidate.row === first.row && candidate.col === first.col));
  assert.ok(candidates.some(candidate => candidate.row === second.row && candidate.col === second.col));
});

test('includes diagonal stationary prey affected by a moved predator', () => {
  const board = boardWith();
  withCreature(board, 3, 3, 0);
  withCreature(board, 2, 3, 1);
  withCreature(board, 3, 4, 1);
  withCreature(board, 1, 2, 1);
  withCreature(board, 2, 2, 0);

  const first = pos(1, 2), second = pos(2, 2);
  const postMove = swapBoard(board, first, second);
  assert.ok(postMove);
  const candidates = reactionCandidatesForMove(postMove, first, second);

  assert.ok(candidates.some(candidate => candidate.row === 3 && candidate.col === 3));
});

test('does not add an unrelated stationary prey group for a local move', () => {
  const board = boardWith();
  withCreature(board, 0, 0, 0);
  withCreature(board, 0, 1, 1);
  withCreature(board, 1, 0, 1);
  withCreature(board, 1, 1, 1);

  const first = pos(6, 5), second = pos(6, 6);
  const postMove = swapBoard(board, first, second);
  assert.ok(postMove);
  const candidates = reactionCandidatesForMove(postMove, first, second);

  assert.ok(!candidates.some(candidate => candidate.row === 0 && candidate.col === 0));
});

test('invalid swaps produce no reaction candidates', () => {
  const board = boardWith();
  assert.deepEqual(reactionCandidatesForMove(board, pos(0, 0), pos(7, 7)), []);
  assert.deepEqual(reactionCandidatesForMove(board, pos(-1, 0), pos(0, 0)), []);
  assert.deepEqual(reactionCandidatesForMove(board, pos(0, 0), pos(0, 1)), [pos(0, 0), pos(0, 1)]);
});

test('enumerates a moved-predator swap as a reaction-producing legal move', () => {
  const board = boardWith();
  withCreature(board, 3, 3, 0);
  withCreature(board, 2, 3, 1);
  withCreature(board, 3, 4, 1);
  withCreature(board, 3, 1, 1);
  const before = structuredClone(board);

  const moves = reactionProducingMoves(board);

  assert.ok(moves.some(move =>
    (move.first.row === 3 && move.first.col === 1 && move.second.row === 3 && move.second.col === 2)
    || (move.first.row === 3 && move.first.col === 2 && move.second.row === 3 && move.second.col === 1)));
  assert.deepEqual(board, before);
});

test('enumerates moved-prey reactions once per adjacent pair', () => {
  const board = boardWithoutActivations([[2, 2, 1], [2, 3, 1], [2, 4, 1], [3, 3, 0], [3, 4, 0]]);
  const moves = reactionProducingMoves(board);
  const keys = moves.map(move => {
    const [first, second] = [move.first, move.second].sort((a, b) => a.row - b.row || a.col - b.col);
    return `${first.row},${first.col}:${second.row},${second.col}`;
  });

  assert.ok(moves.length > 0);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(moves.some(move =>
    (move.first.row === 3 && move.first.col === 3 && move.second.row === 3 && move.second.col === 4)
    || (move.first.row === 3 && move.first.col === 4 && move.second.row === 3 && move.second.col === 3)));
});

test('an all-level-zero board has no reaction-producing adjacent swaps', () => {
  assert.deepEqual(reactionProducingMoves(boardWith()), []);
});

test('hint selection chooses an enumerated move without mutating the board', () => {
  const board = boardWith([[2, 2, 1], [2, 3, 1], [2, 4, 1]]);
  const before = structuredClone(board);
  let draws = 0;
  const hint = selectReactionMoveHint(board, () => { draws++; return 0; });

  assert.ok(hint);
  assert.ok(reactionProducingMoves(board).some(move =>
    move.first.row === hint.first.row && move.first.col === hint.first.col
    && move.second.row === hint.second.row && move.second.col === hint.second.col));
  assert.ok([hint.first, hint.second].some(position => position.row === hint.highlight.row && position.col === hint.highlight.col));
  assert.equal(draws, 1);
  assert.deepEqual(board, before);
});

test('hint selection returns null without drawing randomness when no reaction move exists', () => {
  let draws = 0;
  assert.equal(selectReactionMoveHint(boardWith(), () => { draws++; return 0; }), null);
  assert.equal(draws, 0);
});

test('idle hint prioritizes a reaction move over remaining free moves', () => {
  const board = boardWith([[2, 2, 1], [2, 3, 1], [2, 4, 1]]);
  const action = selectIdleHint(board, 3, () => 0);
  assert.equal(action.type, 'move');
});

test('idle hint selects free-move guidance when no reaction move exists', () => {
  let draws = 0;
  assert.deepEqual(selectIdleHint(boardWithoutActivations(), 2, () => { draws++; return 0; }), { type: 'free-moves' });
  assert.equal(draws, 0);
});

test('idle hint selects lost state when no reaction move or free move exists', () => {
  let draws = 0;
  assert.deepEqual(selectIdleHint(boardWithoutActivations(), 0, () => { draws++; return 0; }), { type: 'lost' });
  assert.equal(draws, 0);
});
