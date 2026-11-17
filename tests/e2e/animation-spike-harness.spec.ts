import { expect, test } from '@playwright/test';

async function openSpike(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/experiments/animation-spike/index.html');
  await expect(page.getByRole('heading', { name: 'Animation Spike' })).toBeVisible();
}

test('candidate becomes ready after its readiness barrier and is destroyed once', async ({ page }) => {
  await openSpike(page);
  const result = await page.evaluate(async () => {
    const harnessPath = '/experiments/animation-spike/src/harness.ts';
    const { startCandidate } = await import(harnessPath);
    const workload = { board: [], cells: [], actions: [], id: 'mixed', seed: 1, checksum: 'fixture' };
    let destroyCount = 0;
    const candidate = {
      id: 'current-canvas', version: 'test', expectedRenderer: 'canvas', capabilities: {},
      create: () => ({ renderer: 'canvas', ready: Promise.resolve(), dispatch: async () => ({ accepted: true }), snapshot: () => ({ board: [], selected: null, status: 'ready' }), destroy: () => { destroyCount++; } }),
    };
    const session = await startCandidate(document.querySelector('#experiment'), workload, candidate);
    const readyText = document.querySelector('#experiment-status')?.textContent;
    await session.destroy();
    await session.destroy();
    return { readyText, destroyCount, stoppedText: document.querySelector('#experiment-status')?.textContent };
  });

  expect(result).toEqual({ readyText: 'current-canvas ready (canvas)', destroyCount: 1, stoppedText: 'current-canvas stopped' });
});

test('renderer mismatch destroys the candidate and reports a failure', async ({ page }) => {
  await openSpike(page);
  const result = await page.evaluate(async () => {
    const harnessPath = '/experiments/animation-spike/src/harness.ts';
    const { startCandidate } = await import(harnessPath);
    const workload = { board: [], cells: [], actions: [], id: 'mixed', seed: 1, checksum: 'fixture' };
    let destroyed = false;
    const candidate = {
      id: 'webgl', version: 'test', expectedRenderer: 'webgl', capabilities: {},
      create: () => ({ renderer: 'canvas', ready: Promise.resolve(), dispatch: async () => ({ accepted: false }), snapshot: () => ({ board: [], selected: null, status: 'ready' }), destroy: () => { destroyed = true; } }),
    };
    let message = '';
    try { await startCandidate(document.querySelector('#experiment'), workload, candidate); } catch (error) { message = error instanceof Error ? error.message : String(error); }
    return { destroyed, message, status: document.querySelector('#experiment-status')?.textContent };
  });

  expect(result.destroyed).toBe(true);
  expect(result.message).toContain('Expected webgl, initialized canvas');
  expect(result.status).toContain('webgl failed: Expected webgl, initialized canvas');
});

test('rejects a second candidate after teardown so each trial requires a fresh page', async ({ page }) => {
  await openSpike(page);
  const result = await page.evaluate(async () => {
    const harnessPath = '/experiments/animation-spike/src/harness.ts';
    const { startCandidate } = await import(harnessPath);
    const workload = { board: [], cells: [], actions: [], id: 'mixed', seed: 1, checksum: 'fixture' };
    const candidate = {
      id: 'current-canvas', version: 'test', expectedRenderer: 'canvas', capabilities: {},
      create: () => ({ renderer: 'canvas', ready: Promise.resolve(), dispatch: async () => ({ accepted: true }), snapshot: () => ({ board: [], selected: null, status: 'ready' }), destroy: () => {} }),
    };
    const session = await startCandidate(document.querySelector('#experiment'), workload, candidate);
    await session.destroy();
    try { await startCandidate(document.querySelector('#experiment'), workload, candidate); return false; } catch { return true; }
  });

  expect(result).toBe(true);
});

test('cleans up and reports candidate readiness failures', async ({ page }) => {
  await openSpike(page);
  const result = await page.evaluate(async () => {
    const harnessPath = '/experiments/animation-spike/src/harness.ts';
    const { startCandidate } = await import(harnessPath);
    const workload = { board: [], cells: [], actions: [], id: 'mixed', seed: 1, checksum: 'fixture' };
    let destroyed = false;
    const candidate = {
      id: 'current-canvas', version: 'test', expectedRenderer: 'canvas', capabilities: {},
      create: () => ({ renderer: 'canvas', ready: Promise.reject(new Error('asset initialization failed')), dispatch: async () => ({ accepted: false }), snapshot: () => ({ board: [], selected: null, status: 'failed' }), destroy: () => { destroyed = true; } }),
    };
    try { await startCandidate(document.querySelector('#experiment'), workload, candidate); } catch {}
    return { destroyed, status: document.querySelector('#experiment-status')?.textContent };
  });

  expect(result.destroyed).toBe(true);
  expect(result.status).toBe('current-canvas failed: asset initialization failed');
});

test('required artwork decode failure is not accepted as a numbered-fallback pass', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLImageElement.prototype.decode = async function () {
      throw new Error('forced artwork decode failure');
    };
  });
  await page.goto('/experiments/animation-spike/index.html?candidate=current-canvas&workload=dense-paramecium&seed=17');
  await expect(page.getByRole('status')).toContainText('current-canvas failed: Required candidate artwork is unavailable', { timeout: 20_000 });
  await expect(page.locator('#candidate-root canvas')).toHaveCount(0);
});
