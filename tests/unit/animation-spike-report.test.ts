import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrialReport, serializeTrialReport } from '../../experiments/animation-spike/src/report.ts';
import type { TrialEvidence } from '../../experiments/animation-spike/src/contracts.ts';

const evidence: TrialEvidence = {
  candidateId: 'webgl',
  candidateVersion: 'test',
  renderer: 'webgl',
  workloadId: 'mixed',
  workloadSeed: 17,
  workloadChecksum: 'a'.repeat(64),
  status: 'ready',
  environment: {
    deviceKind: 'emulated', deviceModel: null, operatingSystem: 'test', browser: 'test',
    viewport: { width: 800, height: 800 }, devicePixelRatio: 1, graphicsAcceleration: null,
  },
  cachePolicy: 'cold',
  readyTimeMs: 200,
  loadTimeMs: 200,
  warmUpFrames: 2,
  timing: { durationMs: 30_000, sampleCount: 2, budgetFraction: 0.5, p95: 80, p99: 80, maximum: 80, valid: true, invalidReason: null, performancePass: false },
  rawFrameIntervalsMs: [16, 80],
  actionAcknowledgments: [],
  transferredAssetBytes: 1200,
  decodedAssetBytes: null,
  peakRuntimeMemoryBytes: null,
  unavailableMetricReasons: { decodedAssetBytes: 'unavailable', peakRuntimeMemoryBytes: 'not supported' },
};

test('serializes the complete trial, raw intervals, and unavailable reasons', () => {
  const serialized = serializeTrialReport(evidence, '2026-11-16T00:00:00.000Z');
  const report = JSON.parse(serialized);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.trial.timing.maximum, 80);
  assert.deepEqual(report.trial.rawFrameIntervalsMs, [16, 80]);
  assert.equal(report.trial.unavailableMetricReasons.peakRuntimeMemoryBytes, 'not supported');
  assert.match(serialized, /"deviceKind": "emulated"/);
});

test('rejects inconsistent sample counts and empty unavailable metric reasons', () => {
  assert.throws(() => createTrialReport({ ...evidence, timing: { ...evidence.timing, sampleCount: 1 } }), RangeError);
  assert.throws(() => createTrialReport({ ...evidence, unavailableMetricReasons: { memory: '' } }), RangeError);
});
