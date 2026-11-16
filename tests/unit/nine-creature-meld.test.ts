import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWave } from '../../src/game/mechanics.ts';
import { GameLevel } from '../../src/game/level.ts';
import { boardWith, pos } from '../fixtures/boards.ts';
import { seededRandom } from '../../src/game/random.ts';
import { predictsMeld, reactionCandidatesForMove, selectIdleHint, swapBoard } from '../../src/game/board.ts';
import type { Board, Level, Position } from '../../src/game/creature.ts';

const center = pos(3, 3);
const square: Position[] = Array.from({ length: 3 }, (_, row) =>
  Array.from({ length: 3 }, (_, col) => pos(row + 2, col + 2)),
).flat();
const outer = square.filter(position => position.row !== center.row || position.col !== center.col);

function boardWithSquare(level: Level): Board {
  const board = boardWith();
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) board[row][col]!.level = ((row + col) % 2) as Level;
  square.forEach(position => { board[position.row][position.col]!.level = level; });
  return board;
}

function createCreature(level: Level) {
  return { id: `meld-${level}`, level };
}

test('nine equal level-0 creatures meld into one level-1 center and clear the other eight', () => {
  const board = boardWithSquare(0);
  const before = structuredClone(board);
  const wave = resolveWave(board, [center], createCreature);

  assert.ok(wave);
  assert.equal(wave.melds.length, 1);
  assert.equal(wave.apex, false);
  assert.equal(wave.after[center.row][center.col]?.level, 1);
  for (const position of outer) assert.equal(wave.after[position.row][position.col], null);
  assert.equal(wave.removed.length, 8);
  assert.equal(wave.creations.length, 1);
  assert.deepEqual(board, before);
});

test('uniform melds evolve each level through level 4', () => {
  for (const level of [1, 2, 3] as const) {
    const wave = resolveWave(boardWithSquare(level), [center], createCreature);
    assert.ok(wave);
    assert.equal(wave.apex, false);
    assert.equal(wave.after[center.row][center.col]?.level, level + 1);
  }
});

test('nine level-4 creatures trigger an apex clear without replacement', () => {
  const wave = resolveWave(boardWithSquare(4), [center], createCreature);

  assert.ok(wave);
  assert.equal(wave.apex, true);
  assert.equal(wave.creations.length, 0);
  assert.equal(wave.removed.length, 64);
  assert.ok(wave.after.flat().every(creature => creature === null));
});

test('mixed-level squares do not meld', () => {
  const board = boardWithSquare(2);
  board[2][2]!.level = 1;

  assert.equal(resolveWave(board, [center], createCreature), null);
});

test('matches outside activation candidates are not triggered', () => {
  const board = boardWithSquare(1);
  assert.equal(resolveWave(board, [pos(7, 7)], createCreature), null);
});

test('overlapping windows resolve deterministically without sharing creatures', () => {
  const board = boardWith();
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) board[row][col]!.level = ((row + col) % 2) as Level;
  for (let row = 2; row <= 5; row++) for (let col = 2; col <= 5; col++) board[row][col]!.level = 1;
  const wave = resolveWave(board, [pos(2, 2), pos(2, 5)], createCreature);

  assert.ok(wave);
  assert.equal(wave.melds.length, 1);
  assert.deepEqual(wave.melds[0].center.position, pos(3, 3));
  assert.equal(wave.removed.length, 8);
  assert.equal(wave.creations.length, 1);
});

test('a swap completing a square is predicted and offered as a hint', () => {
  const board = boardWith([], 4);
  for (const position of square) board[position.row][position.col]!.level = 0;
  board[2][2]!.level = 4;
  board[1][2]!.level = 0;
  assert.equal(predictsMeld(board, pos(1, 2), pos(2, 2)), true);
  const hint = selectIdleHint(board, 0, () => 0);
  assert.equal(hint.type, 'move');
  if (hint.type === 'move') assert.equal(predictsMeld(board, hint.hint.first, hint.hint.second), true);
});

test('disjoint affected squares resolve together', () => {
  const board = boardWith([], 4);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) board[row][col]!.level = 0;
  for (let row = 5; row < 8; row++) for (let col = 5; col < 8; col++) board[row][col]!.level = 1;
  const wave = resolveWave(board, [], createCreature, [pos(0, 0), pos(7, 7)]);
  assert.ok(wave);
  assert.equal(wave.melds.length, 2);
  assert.equal(wave.removed.length, 16);
  assert.equal(wave.creations.length, 2);
});

test('a predator reaction sharing meld creatures does not duplicate their use', () => {
  const board = boardWithSquare(1);
  board[1][3]!.level = 0;
  const wave = resolveWave(board, [pos(1, 3)], createCreature, [center]);
  assert.ok(wave);
  assert.equal(wave.melds.length, 1);
  assert.equal(wave.reactions.length, 1);
  assert.equal(wave.reactions[0].predators.length, 3);
  assert.ok(wave.reactions[0].predators.every(predator => !square.some(position => position.row === predator.position.row && position.col === predator.position.col)));
  assert.equal(wave.removed.length, 12);
  assert.equal(wave.after[3][3]?.level, 2);
  assert.equal(wave.after[1][3]?.level, 1);
});

test('a meld is a resolving move even after free moves are exhausted', async () => {
  const board = boardWithSquare(0);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    if (!square.some(position => position.row === row && position.col === col)) board[row][col]!.level = 4;
  }
  board[2][2]!.level = 4;
  board[1][2]!.level = 0;
  const first = pos(1, 2);
  const second = pos(2, 2);
  const swapped = swapBoard(board, first, second);
  assert.ok(swapped);
  assert.ok(resolveWave(swapped, reactionCandidatesForMove(swapped, first, second), createCreature, [first, second]));
  const level = new GameLevel(board, { random: seededRandom(17), yieldControl: async () => {} });
  Object.assign(level, { current: { ...level.state, freeMoves: 0 } });

  let sawMeld = false;
  const accepted = await level.move(first, second, event => {
    if (event.type === 'reaction') sawMeld ||= event.wave.melds.length > 0;
  });

  assert.equal(accepted, true);
  assert.equal(sawMeld, true);
  assert.equal(level.state.turns, 1);
  assert.equal(level.state.freeMoves, 0);
  assert.ok(level.state.removed >= 8);
});

test('cancelling a meld effect rolls back the move and score', async () => {
  const board = boardWithSquare(0);
  const level = new GameLevel(board, { random: seededRandom(42), yieldControl: async () => {} });
  const before = level.state;
  const controller = new AbortController();
  const accepted = await level.move(center, pos(3, 4), event => {
    if (event.type === 'reaction' && event.wave.melds.length) controller.abort();
  }, controller.signal);
  assert.equal(accepted, false);
  assert.deepEqual(level.state, before);
});
