import { createCurrentCanvasCandidate, createSharedFrameCandidate } from './candidates/current-canvas.ts';
import { createBlockedAuthoredCandidate } from './candidates/authored.ts';
import { createWebGLCandidate } from './candidates/webgl.ts';
import type { CandidateActionAcknowledgment } from './contracts.ts';
import { createWorkload, WORKLOAD_IDS } from './fixtures.ts';
import type { WorkloadId } from './fixtures.ts';
import { startCandidate } from './harness.ts';

const status = document.querySelector<HTMLElement>('#experiment-status');
const root = document.querySelector<HTMLElement>('#candidate-root');

if (!status || !root) throw new Error('Animation spike mount elements are missing');

const candidateId = new URLSearchParams(location.search).get('candidate');
const workloadParameter = new URLSearchParams(location.search).get('workload') ?? 'mixed';
const seedParameter = new URLSearchParams(location.search).get('seed') ?? '17';
const candidate = candidateId === 'current-canvas'
  ? createCurrentCanvasCandidate()
  : candidateId === 'shared-frame' ? createSharedFrameCandidate()
    : candidateId === 'webgl' ? createWebGLCandidate()
      : candidateId === 'authored' ? createBlockedAuthoredCandidate() : null;

if (!candidateId) {
  status.textContent = 'No candidate is loaded. Each candidate trial must start in a fresh page.';
} else if (!candidate) {
  status.textContent = `Candidate "${candidateId}" is not registered.`;
} else if (!WORKLOAD_IDS.includes(workloadParameter as WorkloadId)) {
  status.textContent = `Unknown workload "${workloadParameter}".`;
} else if (!/^\d+$/.test(seedParameter) || !Number.isSafeInteger(Number(seedParameter))) {
  status.textContent = `Invalid unsigned workload seed "${seedParameter}".`;
} else {
  const acknowledgments: CandidateActionAcknowledgment[] = [];
  void (async () => {
    try {
      const workload = await createWorkload(workloadParameter as WorkloadId, Number(seedParameter));
      const session = await startCandidate(document.querySelector<HTMLElement>('#experiment')!, workload, candidate, acknowledgment => acknowledgments.push(acknowledgment));
      Object.assign(window, { animationSpike: { candidate, workload, session, acknowledgments } });
      window.addEventListener('pagehide', () => { void session.destroy(); }, { once: true });
    } catch (error) {
      if (candidate.blockedReason) status.textContent = `${candidate.id} blocked: ${candidate.blockedReason}`;
      else status.textContent = `${candidate.id} failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  })();
}