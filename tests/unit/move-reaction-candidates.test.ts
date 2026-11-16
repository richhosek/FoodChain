import test from 'node:test';
import assert from 'node:assert/strict';
import { GameLevel } from '../../src/game/level.ts';
import type { LevelEvent } from '../../src/game/level.ts';
import { boardWithoutActivations, pos } from '../fixtures/boards.ts';
import { seededRandom } from '../../src/game/random.ts';
import type { Board, Position, ReactionWave } from '../../src/game/creature.ts';

async function collectFirstReaction(board: Board, first: Position, second: Position) {
  const level = new GameLevel(board, { random: seededRandom(1), yieldControl: async () => {} });
  const reactions: ReactionWave[] = [];
  const accepted = await level.move(first, second, event => {
    if (event.type === 'reaction') reactions.push(event.wave);
  });
  return { accepted, reactions, state: level.state };
}

test('moving a third predator next to stationary prey triggers its reaction', async () => {
  const board = boardWithoutActivations([[3, 3, 0], [2, 3, 1], [3, 4, 1], [5, 3, 1], [4, 3, 0]]);
  const { accepted, reactions, state } = await collectFirstReaction(board, pos(5, 3), pos(4, 3));

  assert.equal(accepted, true);
  assert.equal(reactions.length, 1);
  assert.deepEqual(reactions[0].reactions.map(reaction => reaction.prey.position), [pos(3, 3)]);
  assert.equal(state.removed, 1);
  assert.equal(state.turns, 1);
});

test('moving prey into a qualifying predator group still triggers its reaction', async () => {
  const board = boardWithoutActivations([[3, 3, 0], [3, 2, 1], [2, 2, 1], [4, 2, 1]]);
  const { accepted, reactions } = await collectFirstReaction(board, pos(3, 3), pos(3, 2));

  assert.equal(accepted, true);
  assert.equal(reactions.length, 1);
  assert.deepEqual(reactions[0].reactions.map(reaction => reaction.prey.position), [pos(3, 2)]);
});

test('multiple stationary prey affected by a moved predator resolve once from one snapshot', async () => {
  const board = boardWithoutActivations([[2, 3, 1], [3, 2, 1], [4, 3, 1], [2, 5, 1], [3, 6, 1], [4, 5, 1], [2, 4, 1], [3, 4, 1]]);
  board[3][3] = { id: 'prey-left', level: 0 };
  board[3][5] = { id: 'prey-right', level: 0 };
  const { accepted, reactions } = await collectFirstReaction(board, pos(2, 4), pos(3, 4));

  assert.equal(accepted, true);
  assert.equal(reactions.length, 1);
  assert.deepEqual(
    reactions[0].reactions.map(reaction => reaction.prey.position),
    [pos(3, 3), pos(3, 5)],
  );
  assert.equal(new Set(reactions[0].removed.map(item => item.creature.id)).size, reactions[0].removed.length);
});

test('a prey adjacent to both moved predators is included only once', async () => {
  const board = boardWithoutActivations([[3, 3, 0], [2, 3, 1], [2, 4, 1], [3, 2, 1]]);
  const { accepted, reactions } = await collectFirstReaction(board, pos(2, 3), pos(2, 4));

  assert.equal(accepted, true);
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0].reactions.length, 1);
  assert.deepEqual(reactions[0].reactions[0].prey.position, pos(3, 3));
});

test('a moved creature must be exactly one level above stationary prey', async () => {
  const board = boardWithoutActivations([[3, 3, 0], [2, 3, 1], [5, 3, 2]]);
  const { accepted, reactions } = await collectFirstReaction(board, pos(5, 3), pos(4, 3));

  assert.equal(accepted, true);
  assert.equal(reactions.length, 0);
});

test('an insufficient predator count does not trigger a stationary prey', async () => {
  const board = boardWithoutActivations([[3, 3, 0], [2, 3, 1], [5, 3, 1]]);
  const { accepted, reactions } = await collectFirstReaction(board, pos(5, 3), pos(4, 3));

  assert.equal(accepted, true);
  assert.equal(reactions.length, 0);
});

test('unrelated stationary groups and rejected swaps do not trigger reactions', async () => {
  const board = boardWithoutActivations([[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]]);
  const unrelated = await collectFirstReaction(board, pos(6, 6), pos(6, 7));
  assert.equal(unrelated.accepted, true);
  assert.equal(unrelated.reactions.length, 0);

  board[6][7] = null;
  const rejected = await collectFirstReaction(board, pos(6, 6), pos(6, 7));
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.reactions.length, 0);
});
