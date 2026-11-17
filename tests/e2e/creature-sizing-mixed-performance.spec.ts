import { expect, test } from '@playwright/test';
import type { Board, Position } from '../../src/game/creature.ts';

type Probe = {
  view: {
    assetStatus: string;
    amoebaAssetStatus: string;
    paramecia: Map<string, unknown>;
    amoebae: Map<string, unknown>;
    game: { renderer: { type: number; constructor: { name: string } } };
    destroy(): void;
  };
  board: Board;
  mount: HTMLElement;
  samples: number[];
  startedAt: number | null;
  endedAt: number | null;
  finished: boolean;
  visibility: string[];
  inputStarted: number;
  inputEnded: number;
  moves: Array<{ first: Position; second: Position; at: number }>;
};

type ProbeWindow = Window & { mixedPerformanceProbe: Probe };
const durationMs = 30_000;
const budgetMs = 33.4;

test('representative mixed board records foreground frames and accepts input', async ({ page, browser, browserName, isMobile }) => {
  test.setTimeout(120_000);
  await page.route('http://127.0.0.1:4173/', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>',
  }));
  await page.goto('/');
  await page.bringToFront();
  await page.evaluate(async () => {
    const viewPath = '/src/view/board-view.ts';
    const randomPath = '/src/game/random.ts';
    const { BoardView } = await import(viewPath);
    const { seededRandom } = await import(randomPath);
    const random = seededRandom(101033);
    const levels = [...Array(16).fill(0), ...Array(16).fill(1), ...Array(11).fill(2), ...Array(11).fill(3), ...Array(10).fill(4)];
    for (let index = levels.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [levels[index], levels[other]] = [levels[other], levels[index]];
    }
    const board: Board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `mixed-performance-${row}-${col}`,
      level: levels[row * 8 + col],
    })));
    const mount = document.createElement('div');
    const size = Math.min(800, window.innerWidth - 24);
    mount.style.cssText = `position:fixed;left:12px;top:12px;width:${size}px;height:${size}px`;
    document.body.append(mount);
    const probe: Probe = {
      view: null as unknown as Probe['view'], board, mount, samples: [], startedAt: null, endedAt: null,
      finished: false, visibility: [document.visibilityState], inputStarted: 0, inputEnded: 0, moves: [],
    };
    (window as unknown as ProbeWindow).mixedPerformanceProbe = probe;
    document.addEventListener('visibilitychange', () => probe.visibility.push(document.visibilityState));
    probe.view = new BoardView(mount, board,
      (first: Position, second: Position) => probe.moves.push({ first, second, at: performance.now() }),
      () => true,
      () => { probe.inputStarted++; },
      () => { probe.inputEnded++; },
    ) as unknown as Probe['view'];
    await new Promise<void>((resolve, reject) => {
      const deadline = window.setTimeout(() => reject(new Error('Timed out loading mixed-board artwork')), 15_000);
      const check = (): void => {
        if (probe.view.assetStatus === 'ready' && probe.view.amoebaAssetStatus === 'ready'
          && probe.view.paramecia.size === 16 && probe.view.amoebae.size === 16) {
          window.clearTimeout(deadline);
          const canvas = mount.querySelector('canvas');
          if (!canvas) { reject(new Error('Mixed-board canvas is missing')); return; }
          canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
          resolve();
        } else window.setTimeout(check, 25);
      };
      check();
    });
  });

  const setup = await page.evaluate(() => {
    const probe = (window as unknown as ProbeWindow).mixedPerformanceProbe;
    const canvas = probe.mount.querySelector('canvas')!;
    return {
      counts: Array.from({ length: 5 }, (_, level) => probe.board.flat().filter(creature => creature?.level === level).length),
      animated: { paramecia: probe.view.paramecia.size, amoebae: probe.view.amoebae.size },
      renderer: `${probe.view.game.renderer.constructor.name} (Phaser ${probe.view.game.renderer.type})`,
      canvas: { width: canvas.width, height: canvas.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      userAgent: navigator.userAgent,
    };
  });
  expect(setup.counts).toEqual([16, 16, 11, 11, 10]);
  expect(setup.animated).toEqual({ paramecia: 16, amoebae: 16 });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.evaluate(duration => {
    const probe = (window as unknown as ProbeWindow).mixedPerformanceProbe;
    let previous: number | null = null;
    const sample = (timestamp: number): void => {
      if (probe.startedAt === null) probe.startedAt = timestamp;
      if (previous !== null) probe.samples.push(timestamp - previous);
      previous = timestamp;
      if (timestamp - probe.startedAt >= duration) {
        probe.endedAt = timestamp;
        probe.finished = true;
      } else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, durationMs);
  await page.waitForFunction(() => (window as unknown as ProbeWindow).mixedPerformanceProbe.startedAt !== null);
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Mixed-board canvas has no bounds');
  const first = { x: bounds.x + bounds.width / 16, y: bounds.y + bounds.height / 16 };
  const neighbor = { x: bounds.x + bounds.width * 3 / 16, y: first.y };
  const inputStart = Date.now();
  if (isMobile) {
    await page.touchscreen.tap(first.x, first.y);
    await page.touchscreen.tap(neighbor.x, neighbor.y);
  } else {
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    await page.mouse.move(neighbor.x, neighbor.y, { steps: 4 });
    await page.mouse.up();
  }
  const inputActionDurationMs = Date.now() - inputStart;
  await page.waitForFunction(() => (window as unknown as ProbeWindow).mixedPerformanceProbe.finished, null, { timeout: 50_000 });
  const measurement = await page.evaluate(budget => {
    const probe = (window as unknown as ProbeWindow).mixedPerformanceProbe;
    const ordered = [...probe.samples].sort((first, second) => first - second);
    const quantile = (fraction: number): number => ordered[Math.ceil(ordered.length * fraction) - 1] ?? 0;
    return {
      durationMs: probe.endedAt! - probe.startedAt!,
      sampleCount: ordered.length,
      p95Ms: quantile(.95), p99Ms: quantile(.99), worstMs: ordered.at(-1) ?? 0,
      fractionAtOrBelow33_4Ms: probe.samples.filter(interval => interval <= budget).length / ordered.length,
      visibility: probe.visibility,
      inputStarted: probe.inputStarted, inputEnded: probe.inputEnded, moves: probe.moves,
      startedAt: probe.startedAt, endedAt: probe.endedAt,
    };
  }, budgetMs);
  console.log(`MIXED_BOARD_PERFORMANCE ${JSON.stringify({
    project: test.info().project.name,
    browser: { name: browserName, version: browser.version(), userAgent: setup.userAgent },
    ...setup, seed: 101033, measurement,
    input: { mode: isMobile ? 'touch selection' : 'mouse drag', actionDurationMs: inputActionDurationMs },
    physicalDevice: false,
  })}`);
  expect(measurement.durationMs).toBeGreaterThanOrEqual(durationMs);
  expect(measurement.sampleCount).toBeGreaterThan(0);
  expect(measurement.visibility.every(state => state === 'visible')).toBe(true);
  expect(measurement.inputStarted).toBeGreaterThan(0);
  expect(measurement.inputEnded).toBe(measurement.inputStarted);
  expect(measurement.moves).toHaveLength(1);
  expect(measurement.moves[0]).toMatchObject({ first: { row: 0, col: 0 }, second: { row: 0, col: 1 } });
  expect(measurement.moves[0].at).toBeGreaterThanOrEqual(measurement.startedAt!);
  expect(measurement.moves[0].at).toBeLessThanOrEqual(measurement.endedAt!);
  await page.evaluate(() => (window as unknown as ProbeWindow).mixedPerformanceProbe.view.destroy());
});