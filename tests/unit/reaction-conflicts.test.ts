import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWave } from '../../src/game/mechanics.ts';
import { boardWith, pos } from '../fixtures/boards.ts';
import type { Level } from '../../src/game/creature.ts';

test('a shared predator joins the larger group and remaining predators can react', () => {
  const board = boardWith([], 4);
  const first = pos(3, 3);
  const second = pos(3, 5);
  board[first.row][first.col]!.level = 0;
  board[second.row][second.col]!.level = 0;
  for (const position of [pos(2, 2), pos(2, 3), pos(3, 2), pos(4, 2), pos(3, 4), pos(2, 5), pos(3, 6), pos(4, 5)]) {
    board[position.row][position.col]!.level = 1;
  }
  const before = structuredClone(board);
  let nextId = 0;
  const wave = resolveWave(board, [second, first], (level: Level) => ({ id: `new-${nextId++}`, level }), []);
  assert.ok(wave);
  assert.deepEqual(wave.reactions.map(reaction => [reaction.prey.position, reaction.predators.length]), [[first, 5], [second, 3]]);
  const identities = wave.reactions.flatMap(reaction => [reaction.prey.creature.id, ...reaction.predators.map(predator => predator.creature.id)]);
  assert.equal(new Set(identities).size, identities.length);
  assert.deepEqual(board, before);
});