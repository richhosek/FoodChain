import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWave } from '../../src/game/mechanics.ts';
import { boardWithReaction, pos } from '../fixtures/boards.ts';
import type { Level, Position } from '../../src/game/creature.ts';

const prey = pos(3, 3);
const cardinal = [pos(2, 3), pos(3, 4), pos(4, 3), pos(3, 2)];
const diagonal = [pos(2, 2), pos(2, 4), pos(4, 2), pos(4, 4)];

function createCreature(level: Level) {
  return { id: `replacement-${level}`, level };
}

function resolve(predators: readonly Position[], predatorLevel: Level = 4) {
  const board = boardWithReaction(prey, predators, predatorLevel);
  return resolveWave(board, [prey], createCreature);
}

test('four level-4 predators in a complete cardinal formation trigger apex clear', () => {
  const wave = resolve(cardinal);

  assert.ok(wave);
  assert.equal(wave.apex, true);
  assert.equal(wave.creations.length, 0);
  assert.equal(wave.removed.length, 64);
  assert.ok(wave.after.flat().every(creature => creature === null));
});

test('four level-4 predators in a complete diagonal formation trigger apex clear', () => {
  const wave = resolve(diagonal);

  assert.ok(wave);
  assert.equal(wave.apex, true);
  assert.equal(wave.creations.length, 0);
  assert.equal(wave.removed.length, 64);
});

test('four or more maximum-level predators without a complete formation use ordinary reaction rules', () => {
  const nearMiss = [...cardinal.slice(0, 3), ...diagonal.slice(0, 3)];
  const wave = resolve(nearMiss);

  assert.ok(wave);
  assert.equal(wave.apex, false);
  assert.equal(wave.after[prey.row][prey.col]?.level, 4);
  assert.equal(wave.removed.length, 64);
});

test('three maximum-level predators never trigger apex', () => {
  const wave = resolve(cardinal.slice(0, 3));

  assert.ok(wave);
  assert.equal(wave.apex, false);
  assert.equal(wave.after[prey.row][prey.col]?.level, 4);
});

test('a complete formation below level 4 does not trigger apex', () => {
  const wave = resolve(cardinal, 3);

  assert.ok(wave);
  assert.equal(wave.apex, false);
  assert.equal(wave.after[prey.row][prey.col]?.level, 4);
});

test('a capped level-4 replacement remains for a non-apex level-3 prey reaction', () => {
  const nonFormation = [...cardinal.slice(0, 3), diagonal[0]];
  const wave = resolve(nonFormation);

  assert.ok(wave);
  assert.equal(wave.apex, false);
  assert.equal(wave.after[prey.row][prey.col]?.level, 4);
});
