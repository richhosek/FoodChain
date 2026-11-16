import test from 'node:test';
import assert from 'node:assert/strict';
import { refillBoard } from '../../src/game/board.ts';
import { scriptedRandom, sampleLevel, sampleRefillLevel } from '../../src/game/random.ts';
import { boardWith } from '../fixtures/boards.ts';

test('refill uses equal probabilities at every fifth boundary', () => {
  const board = boardWith();
  for (let row = 0; row < 8; row++) board[row][0] = null;
  board[6][1] = null;
  board[7][1] = null;
  const epsilon = 1e-10;
  const values = [0, 1 / 5 - epsilon, 1 / 5, 2 / 5 - epsilon, 2 / 5, 3 / 5 - epsilon, 3 / 5, 4 / 5 - epsilon, 4 / 5, 1 - epsilon];
  let draws = 0;
  const next = scriptedRandom(values);
  const result = refillBoard(board, () => { draws++; return next(); }, level => ({ id: `spawn-${draws}`, level }));
  assert.deepEqual(result.movements.filter(movement => movement.from === null).map(movement => movement.creature.level), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  assert.equal(draws, 10);
  assert.equal(sampleLevel(() => 0.39), 0);
});

test('refill rejects invalid random draws', () => {
  for (const value of [-1, 1, NaN, Infinity, -Infinity]) {
    assert.throws(() => sampleRefillLevel(() => value), RangeError);
  }
});