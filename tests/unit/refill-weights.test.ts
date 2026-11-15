import test from 'node:test';
import assert from 'node:assert/strict';
import { refillBoard } from '../../src/game/board.ts';
import { scriptedRandom, sampleLevel, sampleRefillLevel } from '../../src/game/random.ts';
import { boardWith } from '../fixtures/boards.ts';

test('refill uses 5:4:3:2:1 at every probability boundary', () => {
  const board = boardWith();
  for (let row = 0; row < 8; row++) board[row][0] = null;
  const epsilon = 1e-10;
  const values = [5 / 15 - epsilon, 5 / 15, 9 / 15 - epsilon, 9 / 15, 12 / 15 - epsilon, 12 / 15, 14 / 15 - epsilon, 14 / 15];
  let draws = 0;
  const next = scriptedRandom(values);
  const result = refillBoard(board, () => { draws++; return next(); }, level => ({ id: `spawn-${draws}`, level }));
  assert.deepEqual(result.board.map(row => row[0]?.level), [0, 1, 1, 2, 2, 3, 3, 4]);
  assert.equal(draws, 8);
  assert.equal(sampleLevel(() => 0.39), 0);
});

test('refill rejects invalid random draws', () => {
  for (const value of [-1, 1, NaN, Infinity, -Infinity]) {
    assert.throws(() => sampleRefillLevel(() => value), RangeError);
  }
});