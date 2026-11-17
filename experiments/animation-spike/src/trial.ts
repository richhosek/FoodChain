import type { CandidateActionAcknowledgment, CandidateDefinition, CandidateInstance, CandidateStatus, RendererId, TrialEnvironment, TrialEvidence } from './contracts.ts';
import type { Workload } from './fixtures.ts';
import { summarizeIntervals, validateTimingTrial } from './metrics.ts';
import { runActionTimeline } from './candidate-actions.ts';

export interface ResourceMeasurement {
  value: number | null;
  unavailableReason: string | null;
}

export interface CreateTrialEvidenceInput {
  candidate: CandidateDefinition;
  workload: Workload;
  renderer: RendererId;
  status: CandidateStatus;
  environment: TrialEnvironment;
  cachePolicy: 'cold' | 'warm' | 'unspecified';
  candidateStartedAt: number;
  startedAt: number;
  assetsReadyAt: number;
  finishedAt: number;
  warmUpFrames: number;
  rawFrameIntervalsMs: number[];
  visibilityInterrupted: boolean;
  contextLost: boolean;
  actionAcknowledgments: CandidateActionAcknowledgment[];
  resources: {
    transferredAssetBytes: ResourceMeasurement;
    decodedAssetBytes: ResourceMeasurement;
    peakRuntimeMemoryBytes: ResourceMeasurement;
  };
}

function validateResource(name: string, measurement: ResourceMeasurement): void {
  if (measurement.value === null && !measurement.unavailableReason?.trim()) {
    throw new RangeError(`${name} requires a value or an unavailable reason`);
  }
  if (measurement.value !== null && (!Number.isFinite(measurement.value) || measurement.value < 0)) {
    throw new RangeError(`${name} must be a non-negative finite number`);
  }
}

function validateTimestamp(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be a finite timestamp`);
}

export function createTrialEvidence(input: CreateTrialEvidenceInput): TrialEvidence {
  validateTimestamp('candidateStartedAt', input.candidateStartedAt);
  validateTimestamp('startedAt', input.startedAt);
  validateTimestamp('assetsReadyAt', input.assetsReadyAt);
  validateTimestamp('finishedAt', input.finishedAt);
  if (input.candidateStartedAt > input.assetsReadyAt || input.assetsReadyAt > input.startedAt || input.finishedAt < input.startedAt) {
    throw new RangeError('Trial timestamps must be ordered from candidate start through readiness, measurement start, and finish');
  }
  if (!Number.isSafeInteger(input.warmUpFrames) || input.warmUpFrames < 0) {
    throw new RangeError('warmUpFrames must be a non-negative safe integer');
  }

  const resources = input.resources;
  validateResource('transferredAssetBytes', resources.transferredAssetBytes);
  validateResource('decodedAssetBytes', resources.decodedAssetBytes);
  validateResource('peakRuntimeMemoryBytes', resources.peakRuntimeMemoryBytes);

  const durationMs = input.finishedAt - input.startedAt;
  const validity = validateTimingTrial({
    durationMs,
    intervals: input.rawFrameIntervalsMs,
    visibilityInterrupted: input.visibilityInterrupted,
    contextLost: input.contextLost,
  });
  const summary = input.rawFrameIntervalsMs.length > 0 ? summarizeIntervals(input.rawFrameIntervalsMs) : null;
  const actionAcknowledgments = input.actionAcknowledgments.map(acknowledgment => {
    if (!Number.isFinite(acknowledgment.requestedAt) || !Number.isFinite(acknowledgment.acknowledgedAt)
      || acknowledgment.acknowledgedAt < acknowledgment.requestedAt) {
      throw new RangeError('Action acknowledgment timestamps must be finite and ordered');
    }
    return { ...acknowledgment, latencyMs: acknowledgment.acknowledgedAt - acknowledgment.requestedAt };
  });
  const unavailableMetricReasons = Object.fromEntries(
    Object.entries(resources)
      .filter(([, measurement]) => measurement.value === null)
      .map(([name, measurement]) => [name, measurement.unavailableReason ?? 'Unavailable without a reason']),
  );

  return {
    candidateId: input.candidate.id,
    candidateVersion: input.candidate.version,
    renderer: input.renderer,
    workloadId: input.workload.id,
    workloadSeed: input.workload.seed,
    workloadChecksum: input.workload.checksum,
    status: input.status,
    environment: structuredClone(input.environment),
    cachePolicy: input.cachePolicy,
    readyTimeMs: input.assetsReadyAt - input.candidateStartedAt,
    loadTimeMs: input.assetsReadyAt - input.candidateStartedAt,
    warmUpFrames: input.warmUpFrames,
    timing: {
      durationMs,
      sampleCount: input.rawFrameIntervalsMs.length,
      budgetFraction: summary?.budgetFraction ?? null,
      p95: summary?.p95 ?? null,
      p99: summary?.p99 ?? null,
      maximum: summary?.maximum ?? null,
      valid: validity.valid,
      invalidReason: validity.reason,
      performancePass: validity.valid ? summary?.performancePass ?? false : null,
    },
    rawFrameIntervalsMs: [...input.rawFrameIntervalsMs],
    actionAcknowledgments,
    transferredAssetBytes: resources.transferredAssetBytes.value,
    decodedAssetBytes: resources.decodedAssetBytes.value,
    peakRuntimeMemoryBytes: resources.peakRuntimeMemoryBytes.value,
    unavailableMetricReasons,
  };
}

export interface FunctionalVerificationGate {
  mechanicsAndUiPassed: boolean;
  evidencePath: string;
  recordedAt: string;
  performanceTestsExcluded: boolean;
  failedPrerequisites: string[];
}

export interface CaptureCandidateTrialInput {
  candidate: CandidateDefinition;
  instance: CandidateInstance;
  workload: Workload;
  environment: TrialEnvironment;
  cachePolicy: 'cold' | 'warm' | 'unspecified';
  verification: FunctionalVerificationGate;
  candidateStartedAt: number;
  assetsReadyAt: number;
  warmUpFrames: number;
  durationMs?: number;
}

export function assertFunctionalVerificationGate(gate: FunctionalVerificationGate): void {
  if (!gate.mechanicsAndUiPassed || gate.failedPrerequisites.length > 0) {
    throw new Error('Performance capture is blocked until all applicable mechanics and UI checks pass');
  }
  if (!gate.evidencePath.trim() || !gate.recordedAt.trim() || !gate.performanceTestsExcluded) {
    throw new Error('Performance capture requires a recorded functional-verification gate and isolated test session');
  }
}

function captureResources(peakRuntimeMemoryBytes: number | null): CreateTrialEvidenceInput['resources'] {
  const imageResources = performance.getEntriesByType('resource')
    .map(entry => entry as PerformanceResourceTiming)
    .filter(entry => {
      try { return new URL(entry.name).pathname.toLowerCase().endsWith('.png'); }
      catch { return false; }
    });
  const transferSize = imageResources.reduce((sum, entry) => sum + entry.transferSize, 0);

  return {
    transferredAssetBytes: imageResources.length > 0
      ? { value: transferSize, unavailableReason: null }
      : { value: null, unavailableReason: 'No PNG asset transfer entries are available for this page' },
    decodedAssetBytes: {
      value: null,
      unavailableReason: 'Browser does not expose a comparable decoded asset byte count',
    },
    peakRuntimeMemoryBytes: peakRuntimeMemoryBytes !== null
      ? { value: peakRuntimeMemoryBytes, unavailableReason: null }
      : { value: null, unavailableReason: 'Comparable runtime heap instrumentation was unavailable during the trial' },
  };
}

function captureFrameIntervals(durationMs: number): Promise<{
  intervals: number[];
  visibilityInterrupted: boolean;
  contextLost: boolean;
  peakRuntimeMemoryBytes: number | null;
}> {
  return new Promise(resolve => {
    const intervals: number[] = [];
    let previousTimestamp: number | null = null;
    let frameId = 0;
    let visibilityInterrupted = document.hidden;
    let contextLost = false;
    let peakRuntimeMemoryBytes: number | null = null;
    const start = performance.now();
    const canvas = document.querySelector('canvas');
    const onVisibilityChange = (): void => { if (document.hidden) visibilityInterrupted = true; };
    const onContextLost = (): void => { contextLost = true; };
    const finish = (): void => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas?.removeEventListener('webglcontextlost', onContextLost);
      cancelAnimationFrame(frameId);
      resolve({ intervals, visibilityInterrupted, contextLost, peakRuntimeMemoryBytes });
    };
    const sample = (timestamp: number): void => {
      if (previousTimestamp !== null) intervals.push(timestamp - previousTimestamp);
      previousTimestamp = timestamp;
      const heapBytes = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize;
      if (Number.isFinite(heapBytes)) peakRuntimeMemoryBytes = Math.max(peakRuntimeMemoryBytes ?? 0, heapBytes!);
      if (timestamp - start >= durationMs) finish();
      else frameId = requestAnimationFrame(sample);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    canvas?.addEventListener('webglcontextlost', onContextLost);
    frameId = requestAnimationFrame(sample);
  });
}

export async function captureCandidateTrial(input: CaptureCandidateTrialInput): Promise<TrialEvidence> {
  assertFunctionalVerificationGate(input.verification);
  const durationMs = input.durationMs ?? 30_000;
  if (!Number.isFinite(durationMs) || durationMs < 30_000) {
    throw new RangeError('Candidate trials must capture at least 30 seconds');
  }
  if (input.instance.renderer !== input.candidate.expectedRenderer) {
    throw new Error(`Candidate renderer mismatch: expected ${input.candidate.expectedRenderer}, initialized ${input.instance.renderer}`);
  }
  await input.instance.ready;

  const startedAt = performance.now();
  const [frameCapture, actionAcknowledgments] = await Promise.all([
    captureFrameIntervals(durationMs),
    runActionTimeline(input.instance, input.workload.actions, { startedAt }),
  ]);
  const finishedAt = performance.now();

  return createTrialEvidence({
    candidate: input.candidate,
    workload: input.workload,
    renderer: input.instance.renderer,
    status: input.instance.snapshot().status,
    environment: input.environment,
    cachePolicy: input.cachePolicy,
    candidateStartedAt: input.candidateStartedAt,
    startedAt,
    assetsReadyAt: input.assetsReadyAt,
    finishedAt,
    warmUpFrames: input.warmUpFrames,
    rawFrameIntervalsMs: frameCapture.intervals,
    visibilityInterrupted: frameCapture.visibilityInterrupted,
    contextLost: frameCapture.contextLost,
    actionAcknowledgments,
    resources: captureResources(frameCapture.peakRuntimeMemoryBytes),
  });
}

export interface TrialEnvironmentOverride {
  deviceKind?: TrialEnvironment['deviceKind'];
  deviceModel?: string | null;
  operatingSystem?: string;
  browser?: string;
  graphicsAcceleration?: string | null;
}

export function readTrialEnvironment(override: TrialEnvironmentOverride = {}): TrialEnvironment {
  const userAgent = navigator.userAgent;
  return {
    deviceKind: override.deviceKind ?? 'emulated',
    deviceModel: override.deviceModel ?? null,
    operatingSystem: override.operatingSystem ?? (navigator.platform || 'unknown'),
    browser: override.browser ?? userAgent,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    devicePixelRatio: window.devicePixelRatio || 1,
    graphicsAcceleration: override.graphicsAcceleration ?? null,
  };
}