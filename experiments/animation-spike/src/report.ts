import type { TrialEvidence } from './contracts.ts';

export interface TrialReport {
  schemaVersion: 1;
  generatedAt: string;
  trial: TrialEvidence;
}

export function createTrialReport(evidence: TrialEvidence, generatedAt = new Date().toISOString()): TrialReport {
  if (!Number.isFinite(Date.parse(generatedAt))) throw new RangeError('generatedAt must be a valid ISO timestamp');
  if (!evidence.candidateId || !evidence.workloadChecksum) throw new RangeError('Trial evidence requires candidate and workload identities');
  if (evidence.timing.sampleCount !== evidence.rawFrameIntervalsMs.length) {
    throw new RangeError('Trial sample count must match the retained raw intervals');
  }
  if (evidence.unavailableMetricReasons && Object.values(evidence.unavailableMetricReasons).some(reason => !reason.trim())) {
    throw new RangeError('Unavailable metrics must include a reason');
  }

  return {
    schemaVersion: 1,
    generatedAt,
    trial: structuredClone(evidence),
  };
}

export function serializeTrialReport(evidence: TrialEvidence, generatedAt?: string): string {
  return `${JSON.stringify(createTrialReport(evidence, generatedAt), null, 2)}\n`;
}

export function downloadTrialReport(evidence: TrialEvidence, filename?: string): void {
  const safeCandidate = evidence.candidateId.replace(/[^a-z0-9-]/gi, '-');
  const safeWorkload = evidence.workloadId.replace(/[^a-z0-9-]/gi, '-');
  const reportFilename = filename ?? `${safeCandidate}-${safeWorkload}-${Date.now()}.json`;
  const blob = new Blob([serializeTrialReport(evidence)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = reportFilename;
  anchor.click();
  URL.revokeObjectURL(url);
}
