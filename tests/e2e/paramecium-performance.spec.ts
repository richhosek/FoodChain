import { expect, test } from '@playwright/test';

type PerformanceProbe = {
  view: {
    assetStatus: string;
    paramecia: Map<string, unknown>;
    game: { renderer: { type: number; constructor: { name: string } } };
  };
  board: unknown;
  mount: HTMLElement;
  samples: number[];
  startedAt: number | null;
  endedAt: number | null;
  finished: boolean;
  finishReason: string | null;
  visibilityChanges: string[];
  inputRequestedAt: number | null;
  inputStarted: number;
  inputEnded: number;
  moves: Array<{ latencyMs: number | null }>;
};

type PerformanceWindow = Window & {
  parameciumPerformanceProbe?: PerformanceProbe;
};

const SAMPLE_DURATION_MS = 30_000;
const FRAME_BUDGET_MS = 33.4;

test('64 animated paramecia sustain foreground frames and responsive input', async ({ page, browser, browserName, isMobile }) => {
  test.setTimeout(90_000);

  await page.goto('/');
  await page.evaluate(async () => {
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `performance-${row}-${col}`,
      level: 0,
    })));
    const mount = document.createElement('div');
    const boardSize = Math.min(800, window.innerWidth - 24);
    mount.style.position = 'fixed';
    mount.style.left = '12px';
    mount.style.top = '12px';
    mount.style.zIndex = '2147483647';
    mount.style.width = `${boardSize}px`;
    mount.style.height = `${boardSize}px`;
    document.body.append(mount);

    const probe: PerformanceProbe = {
      view: null as unknown as PerformanceProbe['view'],
      board,
      mount,
      samples: [],
      startedAt: null,
      endedAt: null,
      finished: false,
      finishReason: null,
      visibilityChanges: [document.visibilityState],
      inputRequestedAt: null,
      inputStarted: 0,
      inputEnded: 0,
      moves: [],
    };
    (window as PerformanceWindow).parameciumPerformanceProbe = probe;
    document.addEventListener('visibilitychange', () => probe.visibilityChanges.push(document.visibilityState));

    const viewPath = '/src/view/board-view.ts';
    const { BoardView } = await import(viewPath);
    probe.view = new BoardView(
      mount,
      board,
      () => probe.moves.push({
        latencyMs: probe.inputRequestedAt === null ? null : performance.now() - probe.inputRequestedAt,
      }),
      () => true,
      () => { probe.inputStarted += 1; },
      () => { probe.inputEnded += 1; },
    ) as unknown as PerformanceProbe['view'];

    await new Promise<void>((resolve, reject) => {
      const deadline = window.setTimeout(() => reject(new Error('Timed out loading all 64 paramecia')), 15_000);
      const checkReady = (): void => {
        if (probe.view.assetStatus === 'ready' && probe.view.paramecia.size === 64) {
          window.clearTimeout(deadline);
          const canvas = mount.querySelector('canvas');
          if (!canvas) { reject(new Error('Performance board canvas was not created')); return; }
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.display = 'block';
          resolve();
          return;
        }
        window.setTimeout(checkReady, 25);
      };
      checkReady();
    });
  });

  const setup = await page.evaluate(() => {
    const probe = (window as PerformanceWindow).parameciumPerformanceProbe!;
    const canvas = probe.mount.querySelector('canvas')!;
    return {
      creatures: probe.view.paramecia.size,
      canvas: { width: canvas.width, height: canvas.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      userAgent: navigator.userAgent,
      renderer: `${probe.view.game.renderer.constructor.name} (Phaser renderer type ${probe.view.game.renderer.type}; canvas 2D)`,
    };
  });
  expect(setup.creatures).toBe(64);

  await page.evaluate((durationMs) => {
    const probe = (window as PerformanceWindow).parameciumPerformanceProbe!;
    let previousFrame: number | null = null;
    let fallbackTimer = 0;
    const finish = (timestamp: number, reason: string | null): void => {
      if (probe.finished) return;
      probe.endedAt = timestamp;
      probe.finishReason = reason;
      probe.finished = true;
      window.clearTimeout(fallbackTimer);
    };
    const sampleFrame = (timestamp: number): void => {
      if (probe.startedAt === null) probe.startedAt = timestamp;
      if (previousFrame !== null) probe.samples.push(timestamp - previousFrame);
      previousFrame = timestamp;
      if (timestamp - probe.startedAt >= durationMs) finish(timestamp, null);
      else requestAnimationFrame(sampleFrame);
    };
    fallbackTimer = window.setTimeout(() => {
      finish(performance.now(), 'No complete 30-second requestAnimationFrame sample was collected');
    }, durationMs + 10_000);
    requestAnimationFrame(sampleFrame);
  }, SAMPLE_DURATION_MS);

  const canvas = page.locator('body > div[style*="z-index: 2147483647"] canvas');
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Performance board canvas has no bounds');
  const first = { x: bounds.x + bounds.width / 16, y: bounds.y + bounds.height / 16 };
  const neighbor = { x: bounds.x + bounds.width * 3 / 16, y: first.y };

  const inputStartedAt = Date.now();
  await page.evaluate(() => {
    (window as PerformanceWindow).parameciumPerformanceProbe!.inputRequestedAt = performance.now();
  });
  if (isMobile) {
    await page.touchscreen.tap(first.x, first.y);
    await page.touchscreen.tap(neighbor.x, neighbor.y);
  } else {
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    await page.mouse.move(neighbor.x, neighbor.y, { steps: 4 });
    await page.mouse.up();
  }
  const inputActionDurationMs = Date.now() - inputStartedAt;

  await page.waitForFunction(() => (window as PerformanceWindow).parameciumPerformanceProbe?.finished === true, null, { timeout: 50_000 });
  const measurement = await page.evaluate((frameBudgetMs) => {
    const probe = (window as PerformanceWindow).parameciumPerformanceProbe!;
    const intervals = [...probe.samples];
    const sorted = [...intervals].sort((first, second) => first - second);
    const withinBudget = intervals.filter(interval => interval <= frameBudgetMs).length;
    const quantile = (fraction: number): number => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
    return {
      durationMs: probe.startedAt === null || probe.endedAt === null ? 0 : probe.endedAt - probe.startedAt,
      sampleCount: intervals.length,
      fractionAtOrBelow33_4Ms: intervals.length === 0 ? 0 : withinBudget / intervals.length,
      p95Ms: quantile(0.95),
      p99Ms: quantile(0.99),
      longestIntervalsMs: [...intervals].sort((first, second) => second - first).slice(0, 10),
      finishReason: probe.finishReason,
      visibilityChanges: probe.visibilityChanges,
      inputStarted: probe.inputStarted,
      inputEnded: probe.inputEnded,
      moves: probe.moves,
    };
  }, FRAME_BUDGET_MS);

  const report = {
    browser: { name: browserName, version: browser.version(), userAgent: setup.userAgent },
    viewport: setup.viewport,
    devicePixelRatio: setup.devicePixelRatio,
    renderer: setup.renderer,
    canvas: setup.canvas,
    animatedCreatureCount: setup.creatures,
    foregroundMeasurement: measurement,
    input: { mode: isMobile ? 'touch selection' : 'mouse drag', actionDurationMs: inputActionDurationMs },
    acceptance: {
      requiredDurationMs: SAMPLE_DURATION_MS,
      frameIntervalBudgetMs: FRAME_BUDGET_MS,
      requiredFraction: 0.95,
      passed: measurement.durationMs >= SAMPLE_DURATION_MS
        && measurement.visibilityChanges.every(state => state === 'visible')
        && measurement.sampleCount > 0
        && measurement.fractionAtOrBelow33_4Ms >= 0.95
        && measurement.inputStarted > 0
        && measurement.inputEnded === measurement.inputStarted
        && measurement.moves.length === 1
        && measurement.moves[0]?.latencyMs !== null,
    },
  };
  const reportJson = JSON.stringify(report, null, 2);
  console.log(`PARAMECIUM PERFORMANCE REPORT\n${reportJson}`);
  await test.info().attach('paramecium-performance-report.json', {
    body: reportJson,
    contentType: 'application/json',
  });

  expect(measurement.durationMs, 'The sample must cover at least 30 foreground seconds').toBeGreaterThanOrEqual(SAMPLE_DURATION_MS);
  expect(measurement.finishReason).toBeNull();
  expect(measurement.visibilityChanges.every(state => state === 'visible'), 'All samples must be collected while the page is foregrounded').toBe(true);
  expect(measurement.sampleCount).toBeGreaterThan(0);
  expect(measurement.inputStarted).toBeGreaterThan(0);
  expect(measurement.inputEnded).toBe(measurement.inputStarted);
  expect(measurement.moves).toHaveLength(1);
  expect(measurement.moves[0]?.latencyMs).not.toBeNull();
  expect(measurement.fractionAtOrBelow33_4Ms, 'At least 95% of all unfiltered frame intervals must meet the 33.4 ms budget').toBeGreaterThanOrEqual(0.95);
});