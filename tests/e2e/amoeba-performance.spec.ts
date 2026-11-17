import { expect, test } from '@playwright/test';

const sampleDurationMs = 30_000;
const frameBudgetMs = 33.4;

test('64 animated amoebae sustain foreground frames and responsive input', async ({ page, browser, browserName, isMobile }) => {
  test.setTimeout(120_000);
  await page.route('http://127.0.0.1:4173/', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',
  }));
  await page.goto('/');
  await page.evaluate(async () => {
    const viewModule = await new Function('specifier', 'return import(specifier)')('/src/view/board-view.ts') as {
      BoardView: new (
        mount: HTMLElement,
        board: Array<Array<{ id: string; level: number }>>,
        onMove: () => void,
        canMove: () => boolean,
        onInteractionStart: () => void,
        onInteractionEnd: () => void,
      ) => any;
    };
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `amoeba-performance-${row}-${col}`,
      level: 1,
    })));
    const mount = document.createElement('div');
    const boardSize = Math.min(800, window.innerWidth - 24);
    mount.style.cssText = `position:fixed;left:12px;top:12px;width:${boardSize}px;height:${boardSize}px;z-index:2147483647`;
    document.body.append(mount);
    const probe = {
      view: null as any,
      mount,
      samples: [] as number[],
      startedAt: null as number | null,
      endedAt: null as number | null,
      finished: false,
      visibilityChanges: [document.visibilityState],
      inputStarted: 0,
      inputEnded: 0,
      moves: 0,
      start(durationMs: number) {
        let previous: number | null = null;
        const sample = (timestamp: number): void => {
          if (probe.startedAt === null) probe.startedAt = timestamp;
          if (previous !== null) probe.samples.push(timestamp - previous);
          previous = timestamp;
          if (timestamp - probe.startedAt >= durationMs) {
            probe.endedAt = timestamp;
            probe.finished = true;
            return;
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      },
    };
    (window as unknown as { amoebaPerformanceProbe: typeof probe }).amoebaPerformanceProbe = probe;
    document.addEventListener('visibilitychange', () => probe.visibilityChanges.push(document.visibilityState));
    probe.view = new viewModule.BoardView(
      mount,
      board,
      () => { probe.moves += 1; },
      () => true,
      () => { probe.inputStarted += 1; },
      () => { probe.inputEnded += 1; },
    );
    await new Promise<void>((resolve, reject) => {
      const deadline = window.setTimeout(() => reject(new Error('Timed out loading 64 amoebae')), 15_000);
      const poll = (): void => {
        if (probe.view.amoebaAssetStatus === 'ready' && probe.view.amoebae.size === 64) {
          window.clearTimeout(deadline);
          const canvas = mount.querySelector('canvas');
          if (!canvas) { reject(new Error('Performance board canvas is missing')); return; }
          canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
          resolve();
        } else window.setTimeout(poll, 25);
      };
      poll();
    });
  });

  const setup = await page.evaluate(() => {
    const probe = (window as unknown as { amoebaPerformanceProbe: { view: any; mount: HTMLElement } }).amoebaPerformanceProbe;
    const canvas = probe.mount.querySelector('canvas')!;
    return {
      count: probe.view.amoebae.size,
      renderer: `${probe.view.game.renderer.constructor.name} (Phaser ${probe.view.game.renderer.type}; Canvas)`,
      canvas: { width: canvas.width, height: canvas.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      userAgent: navigator.userAgent,
    };
  });
  expect(setup.count).toBe(64);

  await page.evaluate(duration => (window as unknown as { amoebaPerformanceProbe: { start: (durationMs: number) => void } }).amoebaPerformanceProbe.start(duration), sampleDurationMs);
  const points = await page.evaluate(() => {
    const probe = (window as unknown as { amoebaPerformanceProbe: { mount: HTMLElement } }).amoebaPerformanceProbe;
    const bounds = probe.mount.querySelector('canvas')!.getBoundingClientRect();
    return {
      first: { x: bounds.left + bounds.width / 16, y: bounds.top + bounds.height / 16 },
      neighbor: { x: bounds.left + bounds.width * 3 / 16, y: bounds.top + bounds.height / 16 },
    };
  });
  if (isMobile) {
    await page.touchscreen.tap(points.first.x, points.first.y);
    await page.touchscreen.tap(points.neighbor.x, points.neighbor.y);
  } else {
    await page.mouse.move(points.first.x, points.first.y);
    await page.mouse.down();
    await page.mouse.move(points.neighbor.x, points.neighbor.y, { steps: 4 });
    await page.mouse.up();
  }
  await page.waitForFunction(() => (window as unknown as { amoebaPerformanceProbe?: { finished: boolean } }).amoebaPerformanceProbe?.finished === true, null, { timeout: 50_000 });

  const result = await page.evaluate(budget => {
    const probe = (window as unknown as { amoebaPerformanceProbe: {
      samples: number[];
      startedAt: number;
      endedAt: number;
      visibilityChanges: string[];
      inputStarted: number;
      inputEnded: number;
      moves: number;
    } }).amoebaPerformanceProbe;
    const ordered = [...probe.samples].sort((a, b) => a - b);
    const quantile = (fraction: number): number => ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)] ?? 0;
    return {
      durationMs: probe.endedAt - probe.startedAt,
      sampleCount: probe.samples.length,
      fractionAtOrBelowBudget: probe.samples.filter(interval => interval <= budget).length / Math.max(1, probe.samples.length),
      p95Ms: quantile(0.95),
      p99Ms: quantile(0.99),
      longestIntervalsMs: [...ordered].reverse().slice(0, 10),
      visibilityChanges: probe.visibilityChanges,
      inputStarted: probe.inputStarted,
      inputEnded: probe.inputEnded,
      moves: probe.moves,
    };
  }, frameBudgetMs);
  const report = {
    browser: { name: browserName, version: browser.version(), userAgent: setup.userAgent },
    viewport: setup.viewport,
    devicePixelRatio: setup.devicePixelRatio,
    renderer: setup.renderer,
    canvas: setup.canvas,
    creatureCount: setup.count,
    inputMode: isMobile ? 'touch selection' : 'mouse drag',
    measurement: result,
    acceptance: result.durationMs >= sampleDurationMs
      && result.visibilityChanges.every(state => state === 'visible')
      && result.sampleCount > 0
      && result.fractionAtOrBelowBudget >= 0.95
      && result.inputStarted > 0
      && result.inputEnded === result.inputStarted
      && result.moves === 1,
  };
  console.log(`AMOEBA_PERFORMANCE ${JSON.stringify(report)}`);
  expect(report.acceptance).toBe(true);
  await page.evaluate(() => (window as unknown as { amoebaPerformanceProbe: { view: { destroy(): void } } }).amoebaPerformanceProbe.view.destroy());
});
