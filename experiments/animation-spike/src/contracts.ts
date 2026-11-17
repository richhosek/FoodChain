import type { Board, Position } from '../../../src/game/creature.ts';
import type { ScriptedAction, Workload, WorkloadId } from './fixtures.ts';

export type CandidateId = 'current-canvas' | 'shared-frame' | 'webgl' | 'authored' | 'godot';
export type RendererId = 'canvas' | 'webgl' | 'godot' | 'unknown';
export type CandidateStatus = 'ready' | 'blocked' | 'failed' | 'incomplete';
export type CapabilityStatus = 'supported' | 'unsupported' | 'unverified';

export type Capability =
  | 'silhouette'
  | 'rank-sizing'
  | 'independent-blink'
  | 'independent-gaze'
  | 'body-motion'
  | 'selection'
  | 'drag-cancel'
  | 'reaction-flash'
  | 'movement-refill'
  | 'reset'
  | 'reduced-motion'
  | 'mouse-input'
  | 'touch-input';

export type CandidateCapabilities = Record<Capability, CapabilityStatus>;

export interface CandidateActionAcknowledgment {
  action: ScriptedAction;
  requestedAt: number;
  acknowledgedAt: number;
  accepted: boolean;
  outcome: Board;
}

export interface CandidateSnapshot {
  board: Board;
  selected: Position | null;
  status: CandidateStatus;
  message?: string;
}

export interface CandidateContext {
  container: HTMLElement;
  workload: Workload;
  onAcknowledgment: (acknowledgment: CandidateActionAcknowledgment) => void;
}

export interface CandidateInstance {
  readonly renderer: RendererId;
  readonly ready: Promise<void>;
  dispatch(action: ScriptedAction): Promise<CandidateActionAcknowledgment>;
  snapshot(): CandidateSnapshot;
  destroy(): void | Promise<void>;
}

export interface CandidateDefinition {
  readonly id: CandidateId;
  readonly version: string;
  readonly expectedRenderer: Exclude<RendererId, 'unknown'>;
  readonly capabilities: CandidateCapabilities;
  readonly blockedReason?: string;
  create(context: CandidateContext): CandidateInstance | Promise<CandidateInstance>;
}

export interface TrialEnvironment {
  deviceKind: 'physical-desktop' | 'physical-iphone' | 'physical-android' | 'emulated';
  deviceModel: string | null;
  operatingSystem: string;
  browser: string;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  graphicsAcceleration: string | null;
}

export interface TrialEvidence {
  candidateId: CandidateId;
  candidateVersion: string;
  renderer: RendererId;
  workloadId: WorkloadId;
  workloadSeed: number;
  workloadChecksum: string;
  status: CandidateStatus;
  environment: TrialEnvironment;
  cachePolicy: 'cold' | 'warm' | 'unspecified';
  readyTimeMs: number;
  loadTimeMs: number;
  warmUpFrames: number;
  timing: {
    durationMs: number;
    sampleCount: number;
    budgetFraction: number | null;
    p95: number | null;
    p99: number | null;
    maximum: number | null;
    valid: boolean;
    invalidReason: string | null;
    performancePass: boolean | null;
  };
  rawFrameIntervalsMs: number[];
  actionAcknowledgments: Array<CandidateActionAcknowledgment & { latencyMs: number }>;
  transferredAssetBytes: number | null;
  decodedAssetBytes: number | null;
  peakRuntimeMemoryBytes: number | null;
  unavailableMetricReasons: Record<string, string>;
}