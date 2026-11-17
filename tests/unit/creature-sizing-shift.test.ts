import assert from 'node:assert/strict';
import test from 'node:test';
import { creatureSizeFraction } from '../../src/view/creature-sizing.ts';

const fractions = [0.75, 0.8, 0.85, 0.9, 0.95];

test('shifted five-level chains retain the same rank fractions', () => {
  for (const lowest of [1, 17, Number.MAX_SAFE_INTEGER - 4]) {
    const levels = Array.from({ length: 5 }, (_, rank) => lowest + rank);
    assert.deepEqual(levels.map(level => creatureSizeFraction(level, lowest)), fractions);
  }
});

test('retained levels change size when their rank changes', () => {
  for (const level of [1, 2, 3, 4]) {
    assert.equal(creatureSizeFraction(level, 0), fractions[level]);
    assert.equal(creatureSizeFraction(level, 1), fractions[level - 1]);
  }
  assert.equal(creatureSizeFraction(5, 1), 0.95);
});

test('sparse and repeated levels keep their full-chain ranks', () => {
  const lowest = 17;
  assert.deepEqual([21, 17, 19, 21].map(level => creatureSizeFraction(level, lowest)),
    [0.95, 0.75, 0.85, 0.95]);
  assert.deepEqual([19].map(level => creatureSizeFraction(level, lowest)), [0.85]);
  assert.deepEqual(([] as number[]).map(level => creatureSizeFraction(level, lowest)), []);
});

test('levels outside a shifted chain or outside safe integer bounds are rejected', () => {
  const lowest = 17;
  for (const level of [16, 22, -1, 17.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => creatureSizeFraction(level, lowest), RangeError, `level ${level}`);
  }
  assert.throws(() => creatureSizeFraction(Number.MAX_SAFE_INTEGER - 5, Number.MAX_SAFE_INTEGER - 4), RangeError);
});

test('invalid lowest levels and chains that overflow safe integers are rejected', () => {
  for (const lowest of [-1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER - 3,
    Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => creatureSizeFraction(lowest, lowest), RangeError, `lowest ${lowest}`);
  }
});

test('shifted sizing and invalid input checks do not consume randomness', () => {
  const original = Math.random;
  let draws = 0;
  Math.random = () => {
    draws += 1;
    throw new Error('randomness consumed');
  };
  try {
    assert.deepEqual([1, 2, 3, 4, 5].map(level => creatureSizeFraction(level, 1)), fractions);
    assert.equal(creatureSizeFraction(19, 17), 0.85);
    assert.throws(() => creatureSizeFraction(16, 17), RangeError);
  } finally {
    Math.random = original;
  }
  assert.equal(draws, 0);
});