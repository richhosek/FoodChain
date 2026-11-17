import assert from 'node:assert/strict';
import test from 'node:test';
import { creatureBoxTransform } from '../../src/view/creature-sizing.ts';

test('uniformly scales asymmetric authored bounds and centers their visible box', () => {
  const box = { left: 10, top: 20, right: 70, bottom: 60 };
  const transform = creatureBoxTransform(box, 100, 0.75);
  assert.equal(transform.scale, 1.25);
  assert.equal(transform.offsetX + (box.left + box.right) / 2 * transform.scale, 0);
  assert.equal(transform.offsetY + (box.top + box.bottom) / 2 * transform.scale, 0);
  assert.equal((box.right - box.left) * transform.scale, 75);
  assert.equal((box.bottom - box.top) * transform.scale, 50);
});

test('rejects empty, inverted, nonfinite and invalid target geometry', () => {
  const valid = { left: 0, top: 0, right: 10, bottom: 20 };
  for (const box of [{ ...valid, right: 0 }, { ...valid, bottom: -1 }, { ...valid, left: NaN }]) {
    assert.throws(() => creatureBoxTransform(box, 100, 0.8), RangeError);
  }
  for (const [cellSize, fraction] of [[0, 0.8], [Infinity, 0.8], [100, 0], [100, 1.1], [100, NaN]]) {
    assert.throws(() => creatureBoxTransform(valid, cellSize!, fraction!), RangeError);
  }
});