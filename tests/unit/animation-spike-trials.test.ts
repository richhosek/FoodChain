import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkload } from '../../experiments/animation-spike/src/fixtures.ts';
import { assertFunctionalVerificationGate, createTrialEvidence } from '../../experiments/animation-spike/src/trial.ts';
import type { CandidateActionAcknowledgment, CandidateDefinition, TrialEnvironment } from '../../experiments/animation-spike/src/contracts.ts';

const candidate: CandidateDefinition = {
  id: 'current-canvas',
  version: 'test-build',
  expectedRenderer: 'canvas',
  capabilities: {} as CandidateDefinition['capabilities'],
  create: () => { throw new Error('not used'); },
};

const environment: TrialEnvironment = {
  deviceKind: 'emulated',
  deviceModel: null,
  operatingSystem: 'test OS',
  browser: 'test browser',
  viewport: { width: 800, height: 800 },
  devicePixelRatio: 1,
  graphicsAcceleration: null,
};

test('requires a completed mechanics/UI record and isolated test session before performance capture', () => {
  assert.throws(() => assertFunctionalVerificationGate({
    mechanicsAndUiPassed: false,
    evidencePath: 'experiments/animation-spike/results/verification.md',
    recordedAt: '2026-11-16T00:00:00Z',
    performanceTestsExcluded: true,
    failedPrerequisites: ['mobile touch parity'],
  }), /blocked until all applicable mechanics and UI checks pass/);
  assert.throws(() => assertFunctionalVerificationGate({
    mechanicsAndUiPassed: true,
    evidencePath: '',
    recordedAt: '2026-11-16T00:00:00Z',
    performanceTestsExcluded: true,
    failedPrerequisites: [],
  }), /requires a recorded functional-verification gate/);
  assert.throws(() => assertFunctionalVerificationGate({
    mechanicsAndUiPassed: true,
    evidencePath: 'experiments/animation-spike/results/verification.md',
    recordedAt: '2026-11-16T00:00:00Z',
    performanceTestsExcluded: false,
    failedPrerequisites: [],
  }), /requires a recorded functional-verification gate/);
});

test('records trial setup, readiness, cache policy, raw intervals, and input latency', async () => {
  const workload = await createWorkload('mixed', 17);
  const acknowledgment: CandidateActionAcknowledgment = {
    action: workload.actions[0],
    requestedAt: 2_100,
    acknowledgedAt: 2_125,
    accepted: true,
    outcome: workload.board,
  };
  const evidence = createTrialEvidence({
    candidate,
    workload,
    renderer: 'canvas',
    status: 'ready',
    environment,
    cachePolicy: 'cold',
    candidateStartedAt: 900,
    startedAt: 1_500,
    assetsReadyAt: 1_200,
    finishedAt: 31_500,
    warmUpFrames: 2,
    rawFrameIntervalsMs: [16.7, 16.8, 70],
    visibilityInterrupted: false,
    contextLost: false,
    actionAcknowledgments: [acknowledgment],
    resources: {
      transferredAssetBytes: { value: 1024, unavailableReason: null },
      decodedAssetBytes: { value: null, unavailableReason: 'Browser does not expose a comparable decoded byte count' },
      peakRuntimeMemoryBytes: { value: null, unavailableReason: 'No comparable memory instrumentation available' },
    },
  });

  assert.equal(evidence.candidateId, 'current-canvas');
  assert.equal(evidence.workloadChecksum, workload.checksum);
  assert.equal(evidence.cachePolicy, 'cold');
  assert.equal(evidence.readyTimeMs, 300);
  assert.equal(evidence.timing.durationMs, 30_000);
  assert.equal(evidence.warmUpFrames, 2);
  assert.deepEqual(evidence.rawFrameIntervalsMs, [16.7, 16.8, 70]);
  assert.equal(evidence.timing.sampleCount, 3);
  assert.equal(evidence.timing.maximum, 70);
  assert.equal(evidence.actionAcknowledgments[0].latencyMs, 25);
  assert.deepEqual(evidence.unavailableMetricReasons, {
    decodedAssetBytes: 'Browser does not expose a comparable decoded byte count',
    peakRuntimeMemoryBytes: 'No comparable memory instrumentation available',
  });
});

test('rejects a resource metric without a value or an explicit unavailable reason', async () => {
  const workload = await createWorkload('mixed', 17);
  assert.throws(() => createTrialEvidence({
    candidate,
    workload,
    renderer: 'canvas',
    status: 'ready',
    environment,
    cachePolicy: 'warm',
    candidateStartedAt: 900,
    startedAt: 1_200,
    assetsReadyAt: 1_100,
    finishedAt: 31_200,
    warmUpFrames: 2,
    rawFrameIntervalsMs: [16],
    visibilityInterrupted: false,
    contextLost: false,
    actionAcknowledgments: [],
    resources: {
      transferredAssetBytes: { value: null, unavailableReason: null },
      decodedAssetBytes: { value: null, unavailableReason: 'unavailable' },
      peakRuntimeMemoryBytes: { value: null, unavailableReason: 'unavailable' },
    },
  }), RangeError);
});
