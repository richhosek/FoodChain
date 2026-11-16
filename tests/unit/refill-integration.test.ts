import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBoard, hasReactingSwap, refillBoard } from '../../src/game/board.ts';
import { createLevel, GameLevel } from '../../src/game/level.ts';
import { sampleLevel, scriptedRandom, seededRandom } from '../../src/game/random.ts';
import { boardWith, boardWithoutActivations, pos } from '../fixtures/boards.ts';

test('refill draws independently in column then row order', () => {
  const board = boardWith();
  board[7][0] = null;
  board[7][2] = null;
  board[6][2] = null;
  const original = structuredClone(board);
  const values = scriptedRandom([0.34, 0.61, 0.94]);
  let draws = 0;
  const result = refillBoard(board, () => { draws++; return values(); }, level => ({ id: `spawn-${draws}`, level }));
  assert.deepEqual([result.board[0][0]?.level, result.board[0][2]?.level, result.board[1][2]?.level], [1, 3, 4]);
  assert.deepEqual(result.movements.filter(movement => movement.from === null).map(movement => movement.to), [pos(0, 0), pos(0, 2), pos(1, 2)]);
  assert.equal(draws, 3);
  assert.deepEqual(board, original);
});

test('starting and reset boards retain the original seeded generation', async () => {
  const expectedRandom = seededRandom(123);
  const expectedInitial = await generateBoard(expectedRandom);
  const expectedReset = await generateBoard(expectedRandom);
  const initialDraws = seededRandom(123);
  const originalLevels = Array.from({ length: 64 }, () => sampleLevel(initialDraws));
  assert.deepEqual(expectedInitial.flat().map(creature => creature?.level), originalLevels);
  const level = await createLevel({ random: seededRandom(123) });
  assert.deepEqual(level.state.board, expectedInitial);
  await level.reset();
  assert.deepEqual(level.state.board, expectedReset);
  for (const board of [expectedInitial, expectedReset]) {
    assert.deepEqual([...new Set(board.flat().map(creature => creature?.level))].sort(), [0, 1, 2, 3, 4]);
    assert.equal(hasReactingSwap(board), true);
  }
});

test('refill weights drive subsequent deterministic reaction waves', async () => {
  const level = new GameLevel(boardWithoutActivations([[2, 2, 1], [2, 3, 1], [2, 4, 1], [3, 3, 0], [3, 4, 0]]), {
    random: seededRandom(10),
    yieldControl: async () => {},
  });
  const events: string[] = [];
  await level.move(pos(3, 3), pos(3, 4), event => {
    events.push(event.type);
    if (event.type === 'refill' && events.length === 2) {
      assert.deepEqual(event.refill.movements.filter(movement => movement.from === null).map(movement => movement.creature.level), [2, 4, 3]);
    }
  });
  assert.deepEqual(events, ['reaction', 'refill', 'reaction', 'refill']);
  assert.equal(level.state.turns, 1);
});