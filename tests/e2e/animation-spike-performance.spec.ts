import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const candidateIds = ['current-canvas', 'shared-frame', 'webgl'] as const;
const workloadIds = ['dense-paramecium', 'dense-amoeba', 'mixed'] as const;

interface TrialResult {
  candidateId: string;
  candidateVersion: string;
  renderer: string;
  workloadId: string;
  workloadSeed: number;
  workloadChecksum: string;
  status: string;
  cachePolicy: string;
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
  actionAcknowledgments: Array<{ accepted: boolean; latencyMs: number }>;
  environment: {
    deviceKind: string;
    deviceModel: string | null;
    operatingSystem: string;
    browser: string;
    viewport: { width: number; height: number };
    devicePixelRatio: number;
    graphicsAcceleration: string | null;
  };
  transferredAssetBytes: number | null;
  decodedAssetBytes: number | null;
  peakRuntimeMemoryBytes: number | null;
  unavailableMetricReasons: Record<string, string>;
}

test.describe('isolated desktop animation-spike performance trials', () => {
  test.describe.configure({ mode: 'serial' });

  for (const candidateId of candidateIds) {
    test(`desktop trials for ${candidateId}`, async ({ browser }, testInfo) => {
      test.setTimeout(150_000);
      const outputDirectory = resolve('experiments/animation-spike/results/trials');
      await mkdir(outputDirectory, { recursive: true });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 1,
        isMobile: false,
        reducedMotion: 'no-preference',
      });

      try {
        for (const workloadId of workloadIds) {
          const page = await context.newPage();
          try {
            const url = new URL('/experiments/animation-spike/index.html', 'http://127.0.0.1:4173');
            url.searchParams.set('candidate', candidateId);
            url.searchParams.set('workload', workloadId);
            url.searchParams.set('seed', '17');
            await page.goto(url.toString());
            const expectedRenderer = candidateId === 'webgl' ? 'webgl' : 'canvas';
            await expect(page.getByRole('status')).toHaveText(`${candidateId} ready (${expectedRenderer})`, { timeout: 20_000 });

            const report = await page.evaluate(async (): Promise<{ report: unknown; trial: TrialResult }> => {
              const trialModulePath = '/experiments/animation-spike/src/trial.ts';
              const reportModulePath = '/experiments/animation-spike/src/report.ts';
              const [{ captureCandidateTrial, readTrialEnvironment }, { createTrialReport }] = await Promise.all([
                import(trialModulePath),
                import(reportModulePath),
              ]);
              const animationSpike = (window as unknown as { animationSpike: {
                candidate: unknown;
                workload: unknown;
                session: {
                  instance: unknown;
                  candidateStartedAt: number;
                  assetsReadyAt: number;
                  warmUpFrames: number;
                };
              } }).animationSpike;
              const trial = await captureCandidateTrial({
                candidate: animationSpike.candidate as never,
                instance: animationSpike.session.instance as never,
                workload: animationSpike.workload as never,
                environment: readTrialEnvironment({
                  deviceKind: 'physical-desktop',
                  deviceModel: null,
                  operatingSystem: navigator.platform || 'unknown',
                  browser: navigator.userAgent,
                  graphicsAcceleration: null,
                }),
                cachePolicy: 'unspecified',
                verification: {
                  mechanicsAndUiPassed: true,
                  evidencePath: 'experiments/animation-spike/results/verification.md',
                  recordedAt: '2026-11-17T00:00:00.000Z',
                  performanceTestsExcluded: true,
                  failedPrerequisites: [],
                },
                candidateStartedAt: animationSpike.session.candidateStartedAt,
                assetsReadyAt: animationSpike.session.assetsReadyAt,
                warmUpFrames: animationSpike.session.warmUpFrames,
              });
              return { report: createTrialReport(trial), trial: trial as TrialResult };
            });

            expect(report.trial.status).toBe('ready');
            expect(report.trial.renderer).toBe(expectedRenderer);
            expect(report.trial.timing.valid).toBe(true);
            expect(report.trial.timing.durationMs).toBeGreaterThanOrEqual(30_000);
            expect(report.trial.timing.sampleCount).toBeGreaterThan(0);
            expect(report.trial.actionAcknowledgments.length).toBeGreaterThan(0);
            expect(report.trial.actionAcknowledgments.every(action => action.accepted)).toBe(true);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${candidateId}-${workloadId}-desktop-seed17-${timestamp}.json`;
            await writeFile(resolve(outputDirectory, fileName), `${JSON.stringify(report.report, null, 2)}\n`, 'utf8');
            console.log(JSON.stringify({ fileName, ...report.trial.timing }));
          } finally {
            await page.close();
          }
        }
      } finally {
        await context.close();
      }
    });
  }
});
