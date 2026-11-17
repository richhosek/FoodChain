import test from 'node:test';
import assert from 'node:assert/strict';
import { runActionTimeline } from '../../experiments/animation-spike/src/candidate-actions.ts';
import type { CandidateInstance } from '../../experiments/animation-spike/src/contracts.ts';
import type { ScriptedAction } from '../../experiments/animation-spike/src/fixtures.ts';

test('dispatches scripted actions in order at their requested offsets', async () => {
  const actions: ScriptedAction[] = [
    { atMs: 0, type: 'select', position: { row: 1, col: 1 } },
    { atMs: 200, type: 'cancel', position: { row: 1, col: 2 } },
  ];
  const waits: number[] = [];
  const dispatched: number[] = [];
  const candidate = {
    dispatch: async (action: ScriptedAction) => {
      dispatched.push(action.atMs);
      return { action, requestedAt: action.atMs, acknowledgedAt: action.atMs + 4, accepted: true, outcome: [] };
    },
  } as unknown as CandidateInstance;

  const results = await runActionTimeline(candidate, actions, {
    startedAt: 1_000,
    now: () => 1_000,
    waitUntil: async absoluteTime => { waits.push(absoluteTime); },
  });

  assert.deepEqual(waits, [1_000, 1_200]);
  assert.deepEqual(dispatched, [0, 200]);
  assert.equal(results.length, 2);
});

test('rejects action timestamps that are negative or unordered', async () => {
  const candidate = { dispatch: async () => { throw new Error('must not dispatch'); } } as unknown as CandidateInstance;
  await assert.rejects(runActionTimeline(candidate, [{ atMs: -1, type: 'reset' }], { startedAt: 0 }), RangeError);
  await assert.rejects(runActionTimeline(candidate, [
    { atMs: 2, type: 'reset' },
    { atMs: 1, type: 'reset' },
  ], { startedAt: 0 }), RangeError);
});
