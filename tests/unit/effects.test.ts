import test from 'node:test';
import assert from 'node:assert/strict';
import { flashCells } from '../../src/view/effects.ts';

test('flash schedules two 250ms cycles before completion', async () => {
  const phases: boolean[] = [];
  const durations: number[] = [];
  let elapsed = 0;
  await flashCells(value => phases.push(value), async duration => {
    durations.push(duration);
    elapsed += duration;
  }, new AbortController().signal);
  assert.deepEqual(phases, [true, false, true, false]);
  assert.deepEqual(durations, [125, 125, 125, 125]);
  assert.equal(elapsed, 500);
});

test('aborting the flash prevents later phases', async () => {
  const controller = new AbortController();
  const phases: boolean[] = [];
  await assert.rejects(flashCells(value => phases.push(value), async () => {
    controller.abort();
  }, controller.signal), { name: 'AbortError' });
  assert.deepEqual(phases, [true]);
});