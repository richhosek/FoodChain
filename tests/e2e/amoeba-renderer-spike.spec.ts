import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type Phaser from 'phaser';

const sampleDurationMs = 30_000;
const frameBudgetMs = 33.4;

type RendererResult = {
  renderer: string;
  durationMs: number;
  sampleCount: number;
  fractionAtOrBelow33_4Ms: number;
  p95Ms: number;
  p99Ms: number;
  longestIntervalsMs: number[];
  inputLatencyMs: number | null;
};

test('compare 64-contour Phaser Canvas renderers over foreground frames', async ({ page, browser, browserName, isMobile }) => {
  test.setTimeout(150_000);
  const master = await readFile(resolve('docs/art/amoeba-concept.svg'), 'utf8');
  const bodyPath = master.match(/<path id="body-shape" d="([^"]+)"/)?.[1];
  if (!bodyPath) throw new Error('Approved amoeba body path is missing');

  await page.route('http://127.0.0.1:4173/', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',
  }));
  await page.goto('/');
  const results: RendererResult[] = [];
  for (const renderer of ['graphics', 'texture', 'shared-frames'] as const) {
    await page.evaluate(async ({ renderer, bodyPath, sampleDurationMs }) => {
      const phaserModule = await new Function('specifier', 'return import(specifier)')(
        '/node_modules/phaser/dist/phaser.esm.js',
      ) as { default: typeof import('phaser') };
      const Phaser = phaserModule.default;
      const mount = document.createElement('div');
      const boardSize = Math.min(800, window.innerWidth - 24);
      mount.style.position = 'fixed';
      mount.style.left = '12px';
      mount.style.top = '12px';
      mount.style.zIndex = '2147483647';
      mount.style.width = `${boardSize}px`;
      mount.style.height = `${boardSize}px`;
      document.body.append(mount);

      const sourcePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      sourcePath.setAttribute('d', bodyPath);
      const pathLength = sourcePath.getTotalLength();
      const pointCount = 64;
      const scale = 0.105;
      const restPoints = Array.from({ length: pointCount }, (_, index) => {
        const distance = pathLength * index / pointCount;
        const point = sourcePath.getPointAtLength(distance);
        const previous = sourcePath.getPointAtLength((distance - 0.5 + pathLength) % pathLength);
        const next = sourcePath.getPointAtLength((distance + 0.5) % pathLength);
        const tangentX = next.x - previous.x;
        const tangentY = next.y - previous.y;
        const tangentLength = Math.hypot(tangentX, tangentY) || 1;
        return {
          x: (point.x - 400) * scale,
          y: (point.y - 390) * scale,
          nx: tangentY / tangentLength,
          ny: -tangentX / tangentLength,
          fraction: index / pointCount,
        };
      });

      const probe = {
        renderer,
        game: null as unknown as Phaser.Game,
        mount,
        inputRequestedAt: 0,
        inputLatencyMs: null as number | null,
        fixtureCount: 0,
        frameIntervals: [] as number[],
        startTime: 0,
        endTime: 0,
        visibilityChanges: [document.visibilityState],
        sampleDurationMs,
      };
      (window as unknown as { amoebaRendererSpike?: typeof probe }).amoebaRendererSpike = probe;

      probe.game = new Phaser.Game({
        type: Phaser.CANVAS,
        width: 800,
        height: 800,
        parent: mount,
        backgroundColor: '#f7f3e8',
        audio: { noAudio: true },
        scene: {
          create(this: Phaser.Scene) {
            const scene = this;
            const redraws: Array<(elapsed: number) => void> = [];
            const refreshes: Array<() => void> = [];
            const frameKeys: string[] = [];
            if (renderer === 'shared-frames') {
              for (let frameIndex = 0; frameIndex < 32; frameIndex += 1) {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 96;
                const context = canvas.getContext('2d');
                if (!context) throw new Error('2D canvas unavailable');
                const phase = frameIndex * Math.PI * 2 / 32;
                const points = restPoints.map(point => {
                  const lobeWeight = Math.exp(-((point.fraction - 0.15) ** 2) / (2 * 0.04 ** 2));
                  const offset = 4.5 * Math.sin(phase + point.fraction * Math.PI * 6)
                    + 7 * Math.sin(phase * 1.47) * lobeWeight;
                  return { x: 48 + (point.x + point.nx * offset) * 0.92, y: 48 + (point.y + point.ny * offset) * 0.92 };
                });
                context.beginPath();
                points.forEach((point, index) => {
                  if (index === 0) context.moveTo(point.x, point.y);
                  else context.lineTo(point.x, point.y);
                });
                context.closePath();
                context.fillStyle = '#f4c84c';
                context.fill();
                context.strokeStyle = '#111111';
                context.lineWidth = 2.2;
                context.stroke();
                const key = `amoeba-spike-${renderer}-${frameIndex}`;
                scene.textures.addCanvas(key, canvas);
                frameKeys.push(key);
              }
            }
            for (let index = 0; index < 64; index += 1) {
              const row = Math.floor(index / 8);
              const col = index % 8;
              const position = { x: col * 100 + 50, y: row * 100 + 50 };
              const phase = index * 0.31;
              let graphics: Phaser.GameObjects.Graphics | null = null;
              let image: Phaser.GameObjects.Image | null = null;
              let context: CanvasRenderingContext2D | null = null;
              if (renderer === 'graphics') {
                graphics = scene.add.graphics().setPosition(position.x, position.y);
                graphics.setInteractive(
                  new Phaser.Geom.Rectangle(-48, -48, 96, 96), Phaser.Geom.Rectangle.Contains,
                );
                } else if (renderer === 'texture') {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = 96;
                    context = canvas.getContext('2d');
                    if (!context) throw new Error('2D canvas unavailable');
                    const key = `amoeba-spike-${renderer}-${index}`;
                    scene.textures.addCanvas(key, canvas);
                    image = scene.add.image(position.x, position.y, key);
                    image.setInteractive(new Phaser.Geom.Rectangle(-48, -48, 96, 96), Phaser.Geom.Rectangle.Contains);
                    refreshes.push(() => (scene.textures.get(key) as Phaser.Textures.CanvasTexture).refresh());
              } else {
                image = scene.add.image(position.x, position.y, frameKeys[0]!);
                image.setInteractive(new Phaser.Geom.Rectangle(-48, -48, 96, 96), Phaser.Geom.Rectangle.Contains);
              }
              const renderBody = (elapsed: number): void => {
                const points = restPoints.map(point => {
                  const lobeWeight = Math.exp(-((point.fraction - 0.15) ** 2) / (2 * 0.04 ** 2));
                  const offset = 4.5 * Math.sin(elapsed * 1.5 + point.fraction * Math.PI * 6 + phase)
                    + 7 * Math.sin(elapsed * 2.2 + phase) * lobeWeight;
                  return new Phaser.Math.Vector2(point.x + point.nx * offset, point.y + point.ny * offset);
                });
                if (renderer === 'graphics') {
                  graphics!.clear();
                  graphics!.fillStyle(0xf4c84c, 1).fillPoints(points, true);
                  graphics!.lineStyle(2.2, 0x111111, 1).strokePoints(points, true);
                } else if (renderer === 'texture') {
                  const targetContext = context!;
                  targetContext.clearRect(0, 0, 96, 96);
                  targetContext.beginPath();
                  points.forEach((point, pointIndex) => {
                    const x = 48 + point.x * 0.92;
                    const y = 48 + point.y * 0.92;
                    if (pointIndex === 0) targetContext.moveTo(x, y);
                    else targetContext.lineTo(x, y);
                  });
                  targetContext.closePath();
                  targetContext.fillStyle = '#f4c84c';
                  targetContext.fill();
                  targetContext.strokeStyle = '#111111';
                  targetContext.lineWidth = 2.2;
                  targetContext.stroke();
                } else {
                  const frame = (Math.floor(elapsed * 10) + index * 5) % frameKeys.length;
                  image!.setTexture(frameKeys[frame]!);
                }
              };
              renderBody(0);
              redraws.push(renderBody);
              probe.fixtureCount += 1;
            }
            scene.input.on('gameobjectdown', () => {
              if (probe.inputRequestedAt) probe.inputLatencyMs = performance.now() - probe.inputRequestedAt;
            });
            scene.events.on('update', (_time: number, deltaMs: number) => {
              const elapsed = scene.time.now / 1000;
              if (Math.floor(scene.time.now / 100) !== Math.floor((scene.time.now - deltaMs) / 100)) {
                redraws.forEach(redraw => redraw(elapsed));
                refreshes.forEach(refresh => refresh());
              }
            });
            mount.querySelector('canvas')!.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
            probe.fixtureCount = 64;
          },
        },
      });
      await new Promise<void>((resolve, reject) => {
        const deadline = window.setTimeout(() => reject(new Error('Timed out creating the renderer fixture')), 10_000);
        const poll = (): void => {
          if (probe.fixtureCount === 64 && mount.querySelector('canvas')) {
            window.clearTimeout(deadline);
            resolve();
          } else window.setTimeout(poll, 25);
        };
        poll();
      });
      document.addEventListener('visibilitychange', () => probe.visibilityChanges.push(document.visibilityState));
    }, { renderer, bodyPath, sampleDurationMs });

    const bounds = await page.locator('body > div[style*="z-index: 2147483647"] canvas').boundingBox();
    if (!bounds) throw new Error('Renderer fixture canvas has no bounds');
    await page.evaluate(() => {
      const probe = (window as unknown as { amoebaRendererSpike: { inputRequestedAt: number } }).amoebaRendererSpike;
      probe.inputRequestedAt = performance.now();
    });
    await page.mouse.click(bounds.x + bounds.width / 16, bounds.y + bounds.height / 16);

    const sample = await page.evaluate(async () => {
      const probe = (window as unknown as { amoebaRendererSpike: {
        frameIntervals: number[];
        startTime: number;
        endTime: number;
        sampleDurationMs: number;
        visibilityChanges: string[];
        inputLatencyMs: number | null;
      } }).amoebaRendererSpike;
      let previous: number | null = null;
      await new Promise<void>(resolve => {
        const tick = (timestamp: number): void => {
          if (!probe.startTime) probe.startTime = timestamp;
          if (previous !== null) probe.frameIntervals.push(timestamp - previous);
          previous = timestamp;
          if (timestamp - probe.startTime >= probe.sampleDurationMs) {
            probe.endTime = timestamp;
            resolve();
          } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      const sorted = [...probe.frameIntervals].sort((first, second) => first - second);
      const quantile = (fraction: number): number => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
      return {
        durationMs: probe.endTime - probe.startTime,
        frameIntervals: probe.frameIntervals,
        visibilityChanges: probe.visibilityChanges,
        inputLatencyMs: probe.inputLatencyMs,
        p95Ms: quantile(0.95),
        p99Ms: quantile(0.99),
      };
    });
    const ordered = [...sample.frameIntervals].sort((first, second) => first - second);
    results.push({
      renderer,
      durationMs: sample.durationMs,
      sampleCount: sample.frameIntervals.length,
      fractionAtOrBelow33_4Ms: sample.frameIntervals.filter(interval => interval <= frameBudgetMs).length / Math.max(1, sample.frameIntervals.length),
      p95Ms: sample.p95Ms,
      p99Ms: sample.p99Ms,
      longestIntervalsMs: [...ordered].reverse().slice(0, 10),
      inputLatencyMs: sample.inputLatencyMs,
    });
    await page.evaluate(() => (window as unknown as { amoebaRendererSpike: { game: Phaser.Game; mount: HTMLElement } }).amoebaRendererSpike.game.destroy(true));
    await page.waitForTimeout(100);
  }

  const report = {
    browser: { name: browserName, version: browser.version() },
    viewport: page.viewportSize(),
    devicePixelRatio: await page.evaluate(() => window.devicePixelRatio),
    isMobile,
    visible: await page.evaluate(() => document.visibilityState === 'visible'),
    results,
  };
  console.log(`AMOEBA_RENDERER_SPIKE ${JSON.stringify(report)}`);
  expect(results).toHaveLength(3);
  expect(results.every(result => result.durationMs >= sampleDurationMs && result.sampleCount > 0)).toBe(true);
  expect(results.every(result => result.inputLatencyMs !== null)).toBe(true);
});
