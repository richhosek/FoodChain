import { expect, test } from '@playwright/test';

test('amoeba dirty updates match full composites during overlapping movement and animation', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  const results = await page.evaluate(async () => {
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
    const context = renderer.canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
    const first = { x: 250, y: 250 };
    const second = { x: 350, y: 250 };
    const third = { x: 450, y: 250 };
    const entries = [
      { creatureId: 'first', state: createAmoebaMotion('first'), piece: first, inverted: false, selected: true },
      { creatureId: 'second', state: createAmoebaMotion('second'), piece: second, inverted: true, selected: false },
      { creatureId: 'third', state: createAmoebaMotion('third'), piece: third, inverted: false, selected: false },
    ];
    renderer.setEntries(entries);
    const observations: Array<{ name: string; differentPixels: number; refreshes: number; samples: number[][] }> = [];
    function check(name: string, delta: number, reducedMotion: boolean): void {
      const before = refreshes;
      renderer.advance(delta, reducedMotion);
      const incremental = context.getImageData(0, 0, 800, 800).data;
      const updateRefreshes = refreshes - before;
      renderer.setEntries(entries);
      const reference = context.getImageData(0, 0, 800, 800).data;
      let differentPixels = 0;
      const samples: number[][] = [];
      for (let index = 0; index < incremental.length; index += 4) {
        if (incremental[index] !== reference[index] || incremental[index + 1] !== reference[index + 1]
          || incremental[index + 2] !== reference[index + 2] || incremental[index + 3] !== reference[index + 3]) {
          differentPixels += 1;
          if (samples.length < 8) samples.push([(index / 4) % 800, Math.floor(index / 4 / 800), ...incremental.slice(index, index + 4), ...reference.slice(index, index + 4)]);
        }
      }
      observations.push({ name, differentPixels, refreshes: updateRefreshes, samples });
    }
    first.x = 275;
    check('moving behind a stationary neighbor', 0, true);
    first.x = 250;
    check('moving away from a stationary neighbor', 0, true);
    second.x = 275;
    check('moving in front of a stationary neighbor', 0, true);
    second.x = 370;
    third.x = 440;
    check('prepare chained overlap', 0, true);
    first.x = 300;
    check('chained overlap', 0, true);
    first.x = 325.5;
    second.x = 250;
    check('simultaneous movement', 0, true);
    first.x = 375.25;
    third.x = 400.75;
    check('overlapping movement', 0, true);
    check('overlapping animation', 0.25, false);
    first.x = 250;
    second.x = 350;
    third.x = 450;
    check('separation', 0, true);
    check('unchanged', 0, true);
    renderer.destroy();
    return observations;
  });
  for (const result of results) {
    expect(result.differentPixels, `${result.name}: ${JSON.stringify(result.samples)}`).toBe(0);
    expect(result.refreshes, result.name).toBe(result.name === 'unchanged' ? 0 : 1);
  }
});