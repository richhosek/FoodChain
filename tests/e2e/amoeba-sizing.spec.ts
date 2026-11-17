import { expect, test } from '@playwright/test';

test('amoeba authored bounds size and center aligned layers without changing cell rendering', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const assetsPath = '/src/view/amoeba-assets.ts';
    const viewPath = '/src/view/amoeba-view.ts';
    const motionPath = '/src/view/amoeba-motion.ts';
    const assets = await import(assetsPath);
    const { AmoebaBoardRenderer } = await import(viewPath);
    const { createAmoebaMotion } = await import(motionPath);
    const textures = new Map<string, HTMLCanvasElement>();
    let refreshes = 0;
    const scene = {
      textures: {
        addCanvas: (key: string, canvas: HTMLCanvasElement) => {
          textures.set(key, canvas);
          return { refresh: () => { refreshes += 1; } };
        },
        get: (key: string) => ({ getSourceImage: () => textures.get(key) }),
        remove: (key: string) => textures.delete(key),
      },
      add: { image: () => ({ setDepth() { return this; }, once() { return this; }, destroy() {} }) },
    };
    if (!await assets.registerAmoebaAssets(scene)) throw new Error('Amoeba assets unavailable');
    const renderer = new AmoebaBoardRenderer(scene);
    const context = renderer.canvas.getContext('2d') as CanvasRenderingContext2D;
    const ink = document.createElement('canvas');
    ink.width = ink.height = 800;
    const inkContext = ink.getContext('2d')!;
    const draws: Array<{ key: string; rect: number[] }> = [];
    const clears: number[][] = [];
    const rounds: number[][] = [];
    const drawImage = context.drawImage.bind(context);
    const clearRect = context.clearRect.bind(context);
    const roundRect = context.roundRect.bind(context);
    context.drawImage = ((image: CanvasImageSource, x: number, y: number, width: number, height: number) => {
      const key = [...textures].find(([, canvas]) => canvas === image)?.[0] ?? '';
      draws.push({ key, rect: [x, y, width, height] });
      inkContext.drawImage(image, x, y, width, height);
      drawImage(image, x, y, width, height);
    }) as typeof context.drawImage;
    context.clearRect = (x, y, width, height) => { clears.push([x, y, width, height]); clearRect(x, y, width, height); };
    context.roundRect = (x, y, width, height, radii) => {
      rounds.push([x, y, width, height]);
      return roundRect(x, y, width, height, radii);
    };
    const piece = { x: 350, y: 350 };
    const state = createAmoebaMotion('sizing');
    state.bodyFramePhase = 0;
    const entry = { creatureId: 'sizing', state, piece, inverted: false, selected: true };
    renderer.setEntries([entry]);
    const normal = { draws: draws.splice(0), clears: clears.splice(0), rounds: rounds.splice(0), refreshes };
    const pixels = inkContext.getImageData(0, 0, 800, 800).data;
    let left = 800, top = 800, right = 0, bottom = 0;
    for (let y = 250; y < 450; y += 1) for (let x = 250; x < 450; x += 1) {
      if (pixels[(y * 800 + x) * 4 + 3]! < 128) continue;
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
    }
    renderer.setEntries([{ ...entry, inverted: true }]);
    const inverse = { draws: draws.splice(0), rounds: rounds.splice(0) };
    clears.length = 0;
    piece.x = 375;
    piece.y = 370;
    const beforeMoveRefreshes = refreshes;
    renderer.advance(0, true);
    const moved = { draws: draws.splice(0), clears: clears.splice(0), rounds: rounds.splice(0), refreshes: refreshes - beforeMoveRefreshes };
    const cell = renderer.cells.get('sizing');
    cell.frame.blinkClosure = 0.6;
    renderer.drawCell(cell);
    const blink = draws.splice(0);
    renderer.destroy();
    return { normal, inverse, moved, blink, ink: { left, top, right, bottom }, elapsedSeconds: state.elapsedSeconds };
  });

  const scale = 80 / (702.5625 - 94.75);
  const expectedRect = [
    350 + (-32 - (94.75 + 702.5625) / 2) * scale,
    350 + (-32 - (67.625 + 631) / 2) * scale,
    832 * scale,
    832 * scale,
  ];
  expect(result.normal.draws.map(draw => draw.key)).toEqual(['amoeba-body-frame-00', 'amoeba-face-frame-00']);
  for (const draw of result.normal.draws) draw.rect.forEach((value, index) => expect(value).toBeCloseTo(expectedRect[index]!, 8));
  expect(result.normal.clears).toEqual([[0, 0, 800, 800]]);
  expect(result.normal.rounds).toEqual([[305, 305, 90, 90], [307, 307, 86, 86]]);
  expect(result.ink.right - result.ink.left).toBeGreaterThanOrEqual(79);
  expect(result.ink.right - result.ink.left).toBeLessThanOrEqual(81);
  expect((result.ink.left + result.ink.right) / 2).toBeCloseTo(350, 0);
  expect((result.ink.top + result.ink.bottom) / 2).toBeCloseTo(350, 0);
  expect(result.inverse.draws.map(draw => draw.key)).toEqual(['amoeba-body-frame-00-inverse', 'amoeba-face-frame-00-inverse']);
  expect(result.inverse.draws.map(draw => draw.rect)).toEqual(result.normal.draws.map(draw => draw.rect));
  expect(result.inverse.rounds).toEqual(result.normal.rounds);
  expect(result.moved.clears).toEqual([[300, 300, 100, 100]]);
  expect(result.moved.refreshes).toBe(1);
  expect(result.moved.rounds).toEqual([[330, 325, 90, 90], [332, 327, 86, 86]]);
  for (const draw of result.moved.draws) {
    expect(draw.rect).toEqual([expectedRect[0]! + 25, expectedRect[1]! + 20, expectedRect[2], expectedRect[3]]);
  }
  expect(result.blink.map(draw => draw.key)).toEqual(['amoeba-body-frame-00-inverse', 'amoeba-face-frame-00-inverse', 'amoeba-lid-6-inverse']);
  expect(result.blink.map(draw => draw.rect)).toEqual([result.moved.draws[0]!.rect, result.moved.draws[0]!.rect, result.moved.draws[0]!.rect]);
  expect(result.elapsedSeconds).toBe(0);
});