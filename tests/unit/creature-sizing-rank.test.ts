import assert from 'node:assert/strict';
import test from 'node:test';
import { creatureSizeFraction } from '../../src/view/creature-sizing.ts';

test('current chain assigns a fixed size to each rank regardless of board occupants', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(level => creatureSizeFraction(level, 0)), [0.75, 0.8, 0.85, 0.9, 0.95]);
  assert.deepEqual([0, 4].map(level => creatureSizeFraction(level, 0)), [0.75, 0.95]);
});

test('invalid chain and level inputs are rejected', () => {
  for (const [level, lowest] of [[-1, 0], [5, 0], [1.5, 0], [0, -1], [0, NaN], [0, Infinity], [0, Number.MAX_SAFE_INTEGER]]) {
    assert.throws(() => creatureSizeFraction(level!, lowest!), RangeError);
  }
});

test('rank calculation does not draw gameplay randomness', () => {
  const original = Math.random;
  try {
    Math.random = () => { throw new Error('randomness consumed'); };
    assert.equal(creatureSizeFraction(2, 0), 0.85);
  } finally {
    Math.random = original;
  }
});