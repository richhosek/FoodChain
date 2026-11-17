import type { CandidateContext, CandidateDefinition, CandidateInstance, CandidateSnapshot } from './contracts.ts';
import type { Workload } from './fixtures.ts';

export interface CandidateSession {
  readonly instance: CandidateInstance;
  readonly candidateStartedAt: number;
  readonly assetsReadyAt: number;
  readonly warmUpFrames: number;
  snapshot(): CandidateSnapshot;
  destroy(): Promise<void>;
}

let pageUsed = false;
let activeSession: CandidateSession | null = null;

function setStatus(container: HTMLElement, message: string): void {
  const status = container.querySelector<HTMLElement>('[role="status"]');
  if (status) status.textContent = message;
}

function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

async function warmUp(): Promise<void> {
  await nextFrame();
  await nextFrame();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function startCandidate(
  container: HTMLElement,
  workload: Workload,
  candidate: CandidateDefinition,
  onAcknowledgment: CandidateContext['onAcknowledgment'] = () => {},
): Promise<CandidateSession> {
  if (pageUsed) throw new Error('Each candidate trial requires a fresh experiment page');
  pageUsed = true;
  if (candidate.blockedReason) {
    setStatus(container, `${candidate.id} blocked: ${candidate.blockedReason}`);
    throw new Error(candidate.blockedReason);
  }
  setStatus(container, `Starting ${candidate.id}...`);

  const candidateStartedAt = performance.now();
  let instance: CandidateInstance | null = null;
  try {
    instance = await candidate.create({ container, workload, onAcknowledgment });
    await instance.ready;
    if (instance.renderer !== candidate.expectedRenderer) {
      throw new Error(`Expected ${candidate.expectedRenderer}, initialized ${instance.renderer}`);
    }
    const assetsReadyAt = performance.now();
    const warmUpFrames = 2;
    await warmUp();

    let destroyed = false;
    const session: CandidateSession = {
      instance,
      candidateStartedAt,
      assetsReadyAt,
      warmUpFrames,
      snapshot: () => instance!.snapshot(),
      destroy: async () => {
        if (destroyed) return;
        destroyed = true;
        await instance!.destroy();
        if (activeSession === session) activeSession = null;
        setStatus(container, `${candidate.id} stopped`);
      },
    };

    activeSession = session;
    const snapshot = instance.snapshot();
    setStatus(container, snapshot.status === 'ready'
      ? `${candidate.id} ready (${instance.renderer})`
      : `${candidate.id} ${snapshot.status}${snapshot.message ? `: ${snapshot.message}` : ''}`);
    return session;
  } catch (error) {
    if (instance) {
      try { await instance.destroy(); } catch { /* Preserve the initialization failure. */ }
    }
    setStatus(container, `${candidate.id} failed: ${errorMessage(error)}`);
    throw error;
  }
}

export function currentCandidateSession(): CandidateSession | null {
  return activeSession;
}