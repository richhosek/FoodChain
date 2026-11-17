import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeIntervals, validateTimingTrial } from '../../experiments/animation-spike/src/metrics.ts';

test('summarizes every interval, including stalls, with nearest-rank percentiles', () => {
  const intervals = [...Array.from({ length: 99 }, () => 16), 80];
  const summary = summarizeIntervals(intervals);

  assert.equal(summary.sampleCount, 100);
  assert.equal(summary.budgetFraction, 0.99);
  assert.equal(summary.p95, 16);
  assert.equal(summary.p99, 16);
  assert.equal(summary.maximum, 80);
  assert.equal(summary.performancePass, true);
});

test('requires a 30-second foreground trial with samples and no visibility or context interruption', () => {
  assert.deepEqual(validateTimingTrial({ durationMs: 30_000, intervals: [16], visibilityInterrupted: false, contextLost: false }), { valid: true, reason: null });
  assert.equal(validateTimingTrial({ durationMs: 29_999, intervals: [16], visibilityInterrupted: false, contextLost: false }).valid, false);
  assert.equal(validateTimingTrial({ durationMs: 30_000, intervals: [], visibilityInterrupted: false, contextLost: false }).valid, false);
  assert.equal(validateTimingTrial({ durationMs: 30_000, intervals: [16], visibilityInterrupted: true, contextLost: false }).valid, false);
  assert.equal(validateTimingTrial({ durationMs: 30_000, intervals: [16], visibilityInterrupted: false, contextLost: true }).valid, false);
});

test('does not pass the performance threshold when at least six percent of intervals exceed budget', () => {
  const summary = summarizeIntervals([...Array.from({ length: 94 }, () => 16), ...Array.from({ length: 6 }, () => 34)]);
  assert.equal(summary.budgetFraction, 0.94);
  assert.equal(summary.performancePass, false);
});

test('rejects invalid interval samples rather than silently filtering them', () => {
  assert.throws(() => summarizeIntervals([16, Number.NaN]), RangeError);
  assert.throws(() => summarizeIntervals([16, 0]), RangeError);
});
