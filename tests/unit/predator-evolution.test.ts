import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWave } from '../../src/game/mechanics.ts';
import { boardWithReaction, pos } from '../fixtures/boards.ts';
import type { Level } from '../../src/game/creature.ts';

const prey = pos(3, 3);
const cardinal = [pos(2, 3), pos(3, 4), pos(4, 3), pos(3, 2)];

function createCreature(level: Level) {
  return { id: `replacement-${level}`, level };
}

test('three predators replace prey at predator level', () => {
  const board = boardWithReaction(prey, cardinal.slice(0, 3), 1);
  const before = structuredClone(board);
  const wave = resolveWave(board, [prey], createCreature);

  assert.ok(wave);
  assert.equal(wave.apex, false);
  assert.equal(wave.after[prey.row][prey.col]?.level, 1);
  assert.deepEqual(board, before);
});

test('four or more non-apex predators replace prey one level above predator level', () => {
  for (const predatorCount of [4, 5]) {
    const board = boardWithReaction(prey, [...cardinal, pos(2, 2), pos(2, 4)].slice(0, predatorCount), 1);
    const wave = resolveWave(board, [prey], createCreature);

    assert.ok(wave);
    assert.equal(wave.apex, false);
    assert.equal(wave.after[prey.row][prey.col]?.level, 2);
  }
});
