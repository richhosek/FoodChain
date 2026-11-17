import { expect, test } from '@playwright/test';

test('amoeba runtime layers and composites stay inside the logical cell', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const assetsPath = '/src/view/amoeba-assets.ts';
    const viewPath = '/src/view/amoeba-view.ts';
    const motionPath = '/src/view/amoeba-motion.ts';
    const assets = await import(assetsPath);
    const { AmoebaBoardRenderer } = await import(viewPath);
    const { createAmoebaMotion } = await import(motionPath);
    const textures = new Map<string, HTMLCanvasElement>();
    const scene = {
      textures: {
        addCanvas: (key: string, canvas: HTMLCanvasElement) => {
          textures.set(key, canvas);
          return { refresh() {} };
        },
        get: (key: string) => ({ getSourceImage: () => textures.get(key) }),
        remove: (key: string) => textures.delete(key),
      },
      add: { image: () => ({ setDepth() { return this; }, once() { return this; }, destroy() {} }) },
    };
    if (!await assets.registerAmoebaAssets(scene)) throw new Error('Amoeba assets unavailable');
    const metadata = assets.getAmoebaArtworkMetadata();
    if (!metadata) throw new Error('Amoeba metadata unavailable');
    const { neutralBounds: bounds, coordinates: { viewBox } } = metadata;
    const scale = 80 / Math.max(bounds.right - bounds.left, bounds.bottom - bounds.top);
    const center = 128;
    const cell = { left: center - 50, top: center - 50, right: center + 50, bottom: center + 50 };
    const rect = [
      center + (viewBox.x - (bounds.left + bounds.right) / 2) * scale,
      center + (viewBox.y - (bounds.top + bounds.bottom) / 2) * scale,
      viewBox.width * scale,
      viewBox.height * scale,
    ];
    const surface = document.createElement('canvas');
    surface.width = surface.height = 256;
    const context = surface.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas unavailable');

    function measure(name: string) {
      const pixels = context!.getImageData(0, 0, surface.width, surface.height).data;
      let left = surface.width, top = surface.height, right = 0, bottom = 0, outside = 0, edge = 0;
      for (let y = 0; y < surface.height; y += 1) {
        for (let x = 0; x < surface.width; x += 1) {
          if (!pixels[(y * surface.width + x) * 4 + 3]) continue;
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
          if (x < cell.left || x >= cell.right || y < cell.top || y >= cell.bottom) outside += 1;
          if (x === 0 || y === 0 || x === surface.width - 1 || y === surface.height - 1) edge += 1;
        }
      }
      return { name, bounds: right ? { left: left - center, top: top - center, right: right - center, bottom: bottom - center } : null, outside, edge };
    }

    const renderer = new AmoebaBoardRenderer(scene);
    const rendererContext = renderer.canvas.getContext('2d') as CanvasRenderingContext2D;
    const originalDraw = rendererContext.drawImage.bind(rendererContext);
    let captured: Array<{ key: string; rect: number[] }> = [];
    rendererContext.drawImage = ((image: CanvasImageSource, x: number, y: number, width: number, height: number) => {
      const key = [...textures].find(([, canvas]) => canvas === image)?.[0];
      if (!key) throw new Error('Unknown renderer layer');
      captured.push({ key, rect: [x - 350 + center, y - 350 + center, width, height] });
      context.drawImage(image, x - 350 + center, y - 350 + center, width, height);
      originalDraw(image, x, y, width, height);
    }) as typeof rendererContext.drawImage;

    const layers = [
      ...Array.from({ length: 32 }, (_, index) => `body-frame-${String(index).padStart(2, '0')}`),
      ...Array.from({ length: 33 }, (_, index) => `face-frame-${String(index).padStart(2, '0')}`),
      ...Array.from({ length: 11 }, (_, index) => `lid-${index}`),
    ];
    const measurements: ReturnType<typeof measure>[] = [];
    const composites: ReturnType<typeof measure>[] = [];
    const layoutErrors: string[] = [];
    for (const inverted of [false, true]) {
      const suffix = inverted ? '-inverse' : '';
      const entry = { creatureId: 'containment', state: createAmoebaMotion('containment'), piece: { x: 350, y: 350 }, inverted, selected: false };
      renderer.setEntries([entry]);
      const cellState = renderer.cells.get('containment');
      if (!cellState) throw new Error('Renderer cell unavailable');
      for (const layer of layers) {
        const key = `amoeba-${layer}${suffix}`;
        const image = textures.get(key);
        if (!image) throw new Error(`Missing ${key}`);
        context.clearRect(0, 0, surface.width, surface.height);
        context.drawImage(image, rect[0]!, rect[1]!, rect[2]!, rect[3]!);
        measurements.push(measure(key));

        const body = layer.startsWith('body-frame-') ? Number(layer.slice(-2)) : 0;
        const face = layer.startsWith('face-frame-') ? Number(layer.slice(-2)) : 0;
        const lid = layer.startsWith('lid-') ? Number(layer.slice(4)) : 0;
        cellState.frame = { ...cellState.frame, bodyFrameIndex: body, faceFrameIndex: face, blinkClosure: lid / 10 };
        captured = [];
        context.clearRect(0, 0, surface.width, surface.height);
        renderer.drawCell(cellState);
        const expected = [`amoeba-body-frame-${String(body).padStart(2, '0')}${suffix}`, `amoeba-face-frame-${String(face).padStart(2, '0')}${suffix}`];
        if (lid > 0) expected.push(`amoeba-lid-${lid}${suffix}`);
        if (JSON.stringify(captured.map(draw => draw.key)) !== JSON.stringify(expected)
          || captured.some(draw => draw.rect.some((value, index) => Math.abs(value - rect[index]!) > 1e-9))) {
          layoutErrors.push(key);
        }
        composites.push(measure(key));
      }
    }
    renderer.destroy();
    return { bounds, viewBox, scale, cell, surface: { width: surface.width, height: surface.height, center }, rect, measurements, composites, layoutErrors };
  });

  console.log(`AMOEBA_CONTAINMENT ${testInfo.project.name} ${JSON.stringify(result)}`);
  expect(result.measurements).toHaveLength(152);
  expect(result.composites).toHaveLength(152);
  expect(result.layoutErrors).toEqual([]);
  expect(result.measurements.filter(item => item.edge || item.outside)).toEqual([]);
  expect(result.composites.filter(item => item.edge || item.outside)).toEqual([]);
});