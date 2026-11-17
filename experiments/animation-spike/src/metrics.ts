export const FRAME_BUDGET_MS = 33.4;
export const MINIMUM_TRIAL_DURATION_MS = 30_000;
export const MINIMUM_BUDGET_FRACTION = 0.95;

export interface IntervalSummary {
  sampleCount: number;
  budgetFraction: number;
  p95: number;
  p99: number;
  maximum: number;
  performancePass: boolean;
}

export interface TimingTrialInput {
  durationMs: number;
  intervals: readonly number[];
  visibilityInterrupted: boolean;
  contextLost: boolean;
}

export interface TimingTrialValidity {
  valid: boolean;
  reason: 'insufficient-duration' | 'no-samples' | 'visibility-interrupted' | 'context-lost' | null;
}

function nearestRank(sortedIntervals: readonly number[], percentile: number): number {
  return sortedIntervals[Math.max(0, Math.ceil(percentile * sortedIntervals.length) - 1)];
}

export function summarizeIntervals(intervals: readonly number[]): IntervalSummary {
  if (!Array.isArray(intervals) || intervals.length === 0) {
    throw new RangeError('At least one frame interval is required');
  }
  if (intervals.some(interval => !Number.isFinite(interval) || interval <= 0)) {
    throw new RangeError('Frame intervals must be finite positive numbers');
  }

  const sortedIntervals = [...intervals].sort((first, second) => first - second);
  const budgetCount = intervals.filter(interval => interval <= FRAME_BUDGET_MS).length;
  const budgetFraction = budgetCount / intervals.length;

  return {
    sampleCount: intervals.length,
    budgetFraction,
    p95: nearestRank(sortedIntervals, 0.95),
    p99: nearestRank(sortedIntervals, 0.99),
    maximum: sortedIntervals[sortedIntervals.length - 1],
    performancePass: budgetFraction >= MINIMUM_BUDGET_FRACTION,
  };
}

export function validateTimingTrial(input: TimingTrialInput): TimingTrialValidity {
  if (!Number.isFinite(input.durationMs) || input.durationMs < MINIMUM_TRIAL_DURATION_MS) {
    return { valid: false, reason: 'insufficient-duration' };
  }
  if (input.intervals.length === 0) return { valid: false, reason: 'no-samples' };
  if (input.visibilityInterrupted) return { valid: false, reason: 'visibility-interrupted' };
  if (input.contextLost) return { valid: false, reason: 'context-lost' };
  return { valid: true, reason: null };
}