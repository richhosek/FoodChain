import type { CandidateActionAcknowledgment, CandidateInstance } from './contracts.ts';
import type { ScriptedAction } from './fixtures.ts';

export interface ActionTimelineOptions {
  startedAt: number;
  now?: () => number;
  waitUntil?: (absoluteTime: number) => Promise<void>;
}

function waitUntil(absoluteTime: number): Promise<void> {
  const remaining = absoluteTime - performance.now();
  return remaining <= 0 ? Promise.resolve() : new Promise(resolve => window.setTimeout(resolve, remaining));
}

export async function runActionTimeline(
  candidate: CandidateInstance,
  actions: readonly ScriptedAction[],
  options: ActionTimelineOptions,
): Promise<CandidateActionAcknowledgment[]> {
  const now = options.now ?? (() => performance.now());
  const wait = options.waitUntil ?? waitUntil;
  let previousOffset = -1;
  const acknowledgments: CandidateActionAcknowledgment[] = [];

  for (const action of actions) {
    if (!Number.isFinite(action.atMs) || action.atMs < 0 || action.atMs < previousOffset) {
      throw new RangeError('Actions must use finite, non-negative, monotonically ordered timestamps');
    }
    previousOffset = action.atMs;
  }

  for (const action of actions) {
    await wait(options.startedAt + action.atMs);
    acknowledgments.push(await candidate.dispatch(action));
  }

  return acknowledgments;
}
