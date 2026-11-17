import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('authored sizing preserves registration, eye pivot, and transparent composition', async ({ page }) => {
  const preview = await readFile(resolve('docs/art/paramecium-resting-preview.html'), 'utf8');
  await page.goto('/');
  await page.evaluate(() => {
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `sizing-${row}-${col}`, level: row === 0 && col === 0 ? 0 : 4,
    })));
    const mount = document.createElement('div');
    document.body.append(mount);
    const path = '/src/view/board-view.ts';
    void import(path).then(({ BoardView }) => {
      const view = new BoardView(mount, board, () => {}, () => false);
      (window as any).sizingProbe = { view, mount };
    });
  });
  await page.waitForFunction(() => (window as any).sizingProbe?.view.assetStatus === 'ready');

  const result = await page.evaluate(async ({ preview }) => {
    const view = (window as any).sizingProbe.view;
    const viewPath = '/src/view/paramecium-view.ts';
    const motionPath = '/src/view/paramecium-motion.ts';
    const assetsPath = '/src/view/paramecium-assets.ts';
    const { createParameciumArtwork } = await import(viewPath);
    const { createParameciumMotion } = await import(motionPath);
    const { parameciumLayerCanvas } = await import(assetsPath);
    const svg = new DOMParser().parseFromString(preview, 'text/html').querySelector('svg.creature')!;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('viewBox', '-64 -64 896 896');
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
    const image = new Image();
    image.src = url;
    await image.decode();
    URL.revokeObjectURL(url);

    const measurements = [];
    for (const cellSize of [100, 64]) for (const inverted of [false, true]) {
      const state = createParameciumMotion('sizing');
      const artwork = createParameciumArtwork(view.scene, state, cellSize, inverted);
      const container = artwork.container;
      const body = container.list[0] as any;
      const eye = container.getByName('paramecium-eye') as any;
      const scale = body.scaleX / 8;
      const surface = document.createElement('canvas');
      surface.width = surface.height = 1600;
      const context = surface.getContext('2d')!;
      context.scale(4, 4);
      context.translate(200 + body.x, 200 + body.y);
      context.drawImage(image, -448 * scale, -448 * scale, 896 * scale, 896 * scale);
      const pixels = context.getImageData(0, 0, 1600, 1600).data;
      let left = 1600, top = 1600, right = 0, bottom = 0;
      for (let y = 0; y < 1600; y++) for (let x = 0; x < 1600; x++) {
        if (pixels[(y * 1600 + x) * 4 + 3] >= 16) {
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
        }
      }
      state.rotationFromDegrees = state.rotationTargetDegrees = 24;
      artwork.advance(0.2, false);
      measurements.push({ cellSize, inverted, scale, bodyX: body.x, bodyY: body.y,
        eyeX: eye.x, eyeY: eye.y, bodyRotation: container.rotation, eyeRotation: eye.rotation,
        bounds: [left / 4 - 200, top / 4 - 200, right / 4 - 200, bottom / 4 - 200] });
      container.destroy();
    }

    const clipped: string[] = [];
    const sourceEdges: string[] = [];
    let maximumExtent = 0;
    const envelopeScale = 75 / 797;
    for (const inverted of [false, true]) {
      const layers = [
        ...Array.from({ length: 32 }, (_, index) => ({ name: `cilia-${index}`, offsets: [[0, 0]] })),
        { name: 'body', offsets: [[0, 0]] },
        ...[3, 4, 5].map((amplitude, index) => ({ name: `detail-${index}`,
          offsets: [[-amplitude / 8, -amplitude * 0.7 / 8], [amplitude / 8, amplitude * 0.7 / 8]] })),
        ...['eye', 'outline', ...Array.from({ length: 10 }, (_, index) => `lid-${index + 1}`)]
          .map(name => ({ name, offsets: [[(448 - 515) / 8, (448 - 266) / 8]] })),
        { name: 'pupil', offsets: [-1, 1].flatMap(x => [-1, 1].map(y =>
          [(448 - 515 + x * 39 * 1.5) / 8, (448 - 266 + y * 39 * 1.5) / 8])) },
      ];
      for (const layer of layers) for (const [offsetX, offsetY] of layer.offsets) {
        const source = parameciumLayerCanvas(view.scene, layer.name, inverted) as HTMLCanvasElement;
        const sourcePixels = source.getContext('2d')!.getImageData(0, 0, 112, 112).data;
        if (layer.name === 'body' || layer.name.startsWith('cilia-')) {
          for (let y = 0; y < 112; y++) for (let x = 0; x < 112; x++) {
            if (sourcePixels[(y * 112 + x) * 4 + 3] < 16) continue;
            if (x === 0 || y === 0 || x === 111 || y === 111) sourceEdges.push(layer.name);
            for (let angle = -24; angle <= 24; angle += 0.5) {
              const radians = angle * Math.PI / 180;
              for (const cornerX of [x, x + 1]) for (const cornerY of [y, y + 1]) {
                const relativeX = (cornerX * 8 - 426.4) * envelopeScale;
                const relativeY = (cornerY * 8 - 446.5) * envelopeScale;
                maximumExtent = Math.max(maximumExtent,
                  Math.abs(relativeX * Math.cos(radians) - relativeY * Math.sin(radians)),
                  Math.abs(relativeX * Math.sin(radians) + relativeY * Math.cos(radians)));
              }
            }
          }
        }
        const surface = document.createElement('canvas');
        surface.width = surface.height = 160;
        const context = surface.getContext('2d')!;
        context.drawImage(source, 24 + offsetX, 24 + offsetY);
        const pixels = context.getImageData(0, 0, 160, 160).data;
        for (let y = 0; y < 160; y++) for (let x = 0; x < 160; x++) {
          if ((x < 24 || x >= 136 || y < 24 || y >= 136) && pixels[(y * 160 + x) * 4 + 3] > 0) {
            clipped.push(`${inverted ? 'inverse ' : ''}${layer.name}`);
            y = 160; break;
          }
        }
      }
    }
    view.destroy();
    (window as any).sizingProbe.mount.remove();
    return { measurements, clipped, sourceEdges: [...new Set(sourceEdges)], maximumExtent };
  }, { preview });

  for (const measurement of result.measurements) {
    const { cellSize, scale, bodyX, bodyY, eyeX, eyeY, bodyRotation, eyeRotation, bounds } = measurement;
    expect(scale).toBeCloseTo(cellSize * 0.75 / 797, 10);
    expect(bodyX + (426.4 - 448) * scale).toBeCloseTo(0, 10);
    expect(bodyY + (446.5 - 448) * scale).toBeCloseTo(0, 10);
    expect(eyeX - bodyX).toBeCloseTo((515 - 448) * scale, 10);
    expect(eyeY - bodyY).toBeCloseTo((266 - 448) * scale, 10);
    expect(bodyRotation).toBeCloseTo(24 * Math.PI / 180, 10);
    expect(eyeRotation).toBeCloseTo(-bodyRotation, 10);
    expect(Math.abs((bounds[3] - bounds[1]) / cellSize - 0.75)).toBeLessThanOrEqual(0.01);
    expect(Math.abs((bounds[0] + bounds[2]) / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs((bounds[1] + bounds[3]) / 2)).toBeLessThanOrEqual(1);
  }
  expect(result.clipped).toEqual([]);
  expect(result.sourceEdges).toEqual([]);
  console.log(`Sampled body/cilia extent: ${result.maximumExtent.toFixed(3)}px from cell center (100px cell, 0.5-degree steps)`);
  expect(result.maximumExtent + 0.25).toBeLessThanOrEqual(50);
});