import test from 'node:test';
import assert from 'node:assert/strict';
import { createLevel } from '../../src/game/level.ts';
import { seededRandom } from '../../src/game/random.ts';

test('reset preserves the initial level target', async () => {
  const level = await createLevel({ random: seededRandom(42) });
  const target = level.state.target;
  assert.equal(target, 100);
  await level.reset();
  assert.equal(level.state.target, target);
});