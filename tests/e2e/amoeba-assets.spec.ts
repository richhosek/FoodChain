import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type Phaser from 'phaser';

const assetDirectory = resolve('src/assets/amoeba');
const bodyFrames = Array.from({ length: 32 }, (_, index) => `body-frame-${String(index).padStart(2, '0')}`);
const requiredLayers = [
  ...bodyFrames,
  ...Array.from({ length: 33 }, (_, index) => `face-frame-${String(index).padStart(2, '0')}`),
  ...Array.from({ length: 11 }, (_, index) => `lid-${index}`),
];

async function useValidManifest(page: import('@playwright/test').Page): Promise<void> {
  const manifest = JSON.parse(await readFile(resolve(assetDirectory, 'manifest.json'), 'utf8'));
  Object.assign(manifest, {
    neutralBounds: { left: 94.75, top: 67.625, right: 702.5625, bottom: 631 },
    neutralPose: { body: 'body-frame-00', face: 'face-frame-00', lid: 'open', rotationDegrees: 0 },
    coordinates: { viewBox: { x: -32, y: -32, width: 832, height: 832 }, rasterSize: 832, runtimeSize: 112 },
  });
  await page.route('**/src/assets/amoeba/manifest.json*', route => route.fulfill({
    status: 200, contentType: 'application/javascript', body: `export default ${JSON.stringify(manifest)};`,
  }));
}

test('authored neutral bounds match the frame-zero composite in source and runtime coordinates', async ({ page }) => {
  const master = await readFile(resolve('docs/art/amoeba-concept.svg'), 'utf8');
  const manifest = JSON.parse(await readFile(resolve(assetDirectory, 'manifest.json'), 'utf8'));
  const images = await Promise.all(['body-frame-00', 'face-frame-00'].flatMap(layer =>
    ['', '-inverse'].map(async variant => ({
      layer, variant, data: (await readFile(resolve(assetDirectory, `${layer}${variant}.png`))).toString('base64'),
    }))));
  const measurement = await page.evaluate(async ({ master, images }) => {
    const svg = new DOMParser().parseFromString(master, 'image/svg+xml');
    const rect = svg.querySelector('#neutral-bounds');
    const box = rect && {
      left: Number(rect.getAttribute('x')), top: Number(rect.getAttribute('y')),
      right: Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')),
      bottom: Number(rect.getAttribute('y')) + Number(rect.getAttribute('height')),
    };
    const results = [];
    for (const size of [832, 112]) {
      for (const variant of ['', '-inverse']) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d')!;
        for (const item of images.filter(image => image.variant === variant)) {
          const image = new Image();
          image.src = `data:image/png;base64,${item.data}`;
          await image.decode();
          context.drawImage(image, 0, 0, size, size);
        }
        const pixels = context.getImageData(0, 0, size, size).data;
        let left = size, top = size, right = 0, bottom = 0;
        for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
          if (pixels[(y * size + x) * 4 + 3]! < 128) continue;
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
        }
        results.push({ size, variant, left, top, right, bottom });
      }
    }
    return { box, nonRendering: rect?.closest('defs') !== null, results };
  }, { master, images });

  expect(measurement.nonRendering).toBe(true);
  expect(measurement.box).toEqual({ left: 94.75, top: 67.625, right: 702.5625, bottom: 631 });
  for (const result of measurement.results) {
    for (const edge of ['left', 'top', 'right', 'bottom'] as const) {
      const designEdge = result[edge] * 832 / result.size - 32;
      expect(Math.abs(designEdge - measurement.box![edge])).toBeLessThanOrEqual(832 / result.size);
    }
  }
  expect(measurement.results[0]).toMatchObject({ ...measurement.results[1], variant: '' });
  expect(measurement.results[2]).toMatchObject({ ...measurement.results[3], variant: '' });
  expect(manifest.neutralBounds).toEqual(measurement.box);
  expect(manifest.neutralPose).toEqual({ body: 'body-frame-00', face: 'face-frame-00', lid: 'open', rotationDegrees: 0 });
  expect(manifest.coordinates).toEqual({ viewBox: { x: -32, y: -32, width: 832, height: 832 }, rasterSize: 832, runtimeSize: 112 });
});

test('exporter validates the authored box against its actual neutral layers without writing assets', async ({ page }) => {
  const master = await readFile(resolve('docs/art/amoeba-concept.svg'), 'utf8');
  const source = await readFile(resolve('scripts/generate-amoeba-assets.mjs'), 'utf8');
  const start = source.indexOf('async ({ master, layers, size, contourFrameCount, faceFrameCount }) => {');
  const end = source.indexOf('  }, { master, layers, size, contourFrameCount, faceFrameCount });', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const exporter = source.slice(start, end + 3);
  const result = await page.evaluate(async ({ exporter, master }) => {
    const generate = new Function(`return (${exporter})`)() as (input: unknown) => Promise<any>;
    const run = (svg: string) => generate({ master: svg, layers: ['body-frame-00', 'face-frame-00'], size: 832, contourFrameCount: 32, faceFrameCount: 33 });
    const valid = await run(master);
    let rejected = false;
    try { await run(master.replace('x="94.75"', 'x="100"')); } catch { rejected = true; }
    return { bounds: valid.neutralBounds, pose: valid.neutralPose, coordinates: valid.coordinates, rejected };
  }, { exporter, master });
  expect(result).toEqual({
    bounds: { left: 94.75, top: 67.625, right: 702.5625, bottom: 631 },
    pose: { body: 'body-frame-00', face: 'face-frame-00', lid: 'open', rotationDegrees: 0 },
    coordinates: { viewBox: { x: -32, y: -32, width: 832, height: 832 }, rasterSize: 832, runtimeSize: 112 },
    rejected: true,
  });
});

test('amoeba metadata validation rejects missing, malformed, and incompatible bounds', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const path = '/src/view/amoeba-assets.ts';
    const module = await import(path);
    const valid = {
      size: 832, contourFrameCount: 32, faceFrameCount: 33,
      masterSha256: 'a'.repeat(64), previewSha256: 'b'.repeat(64),
      layers: [...Array.from({ length: 32 }, (_, index) => `body-frame-${String(index).padStart(2, '0')}`),
        ...Array.from({ length: 33 }, (_, index) => `face-frame-${String(index).padStart(2, '0')}`),
        ...Array.from({ length: 11 }, (_, index) => `lid-${index}`)],
      neutralBounds: { left: 94.75, top: 67.625, right: 702.5625, bottom: 631 },
      neutralPose: { body: 'body-frame-00', face: 'face-frame-00', lid: 'open', rotationDegrees: 0 },
      coordinates: { viewBox: { x: -32, y: -32, width: 832, height: 832 }, rasterSize: 832, runtimeSize: 112 },
    };
    return [
      module.validateAmoebaManifest(valid), module.validateAmoebaManifest({}),
      module.validateAmoebaManifest({ ...valid, neutralBounds: null }),
      module.validateAmoebaManifest({ ...valid, neutralBounds: { ...valid.neutralBounds, right: 94.75 } }),
      module.validateAmoebaManifest({ ...valid, neutralBounds: { ...valid.neutralBounds, left: -33 } }),
      module.validateAmoebaManifest({ ...valid, coordinates: { ...valid.coordinates, runtimeSize: 111 } }),
      module.validateAmoebaManifest({ ...valid, neutralPose: { ...valid.neutralPose, body: 'body-frame-01' } }),
    ];
  });
  expect(results).toEqual([true, false, false, false, false, false, false]);
});

test('invalid bundled metadata keeps artwork unavailable without registering textures', async ({ page }) => {
  await page.route('**/src/assets/amoeba/manifest.json*', route => route.fulfill({
    status: 200, contentType: 'application/javascript', body: 'export default {};',
  }));
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/view/amoeba-assets.ts';
    const module = await import(path);
    let registrations = 0;
    const scene = { textures: { addCanvas: () => { registrations += 1; } } };
    const loaded = await module.registerAmoebaAssets(scene);
    return { loaded, registrations, metadata: module.getAmoebaArtworkMetadata() };
  });
  expect(result).toEqual({ loaded: false, registrations: 0, metadata: null });
});

test('a decode failure with valid metadata keeps artwork unavailable', async ({ page }) => {
  await useValidManifest(page);
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/view/amoeba-assets.ts';
    const module = await import(path);
    const originalDecode = HTMLImageElement.prototype.decode;
    let registrations = 0;
    HTMLImageElement.prototype.decode = () => Promise.reject(new Error('Simulated decode failure'));
    try {
      const loaded = await module.registerAmoebaAssets({ textures: { addCanvas: () => { registrations += 1; } } });
      return { loaded, registrations };
    } finally {
      HTMLImageElement.prototype.decode = originalDecode;
    }
  });
  expect(result).toEqual({ loaded: false, registrations: 0 });
});

test('amoeba assets are reproducible, aligned, independently layered, and alpha-safe', async ({ page }) => {
  test.setTimeout(60_000);
  const manifest = JSON.parse(await readFile(resolve(assetDirectory, 'manifest.json'), 'utf8')) as {
    size: number;
    contourFrameCount: number;
    masterSha256: string;
    previewSha256: string;
    layers: string[];
  };
  const master = await readFile(resolve('docs/art/amoeba-concept.svg'));
  const preview = await readFile(resolve('docs/art/amoeba-resting-preview.html'));

  expect(manifest.size).toBe(832);
  expect(manifest.contourFrameCount).toBe(32);
  expect(manifest.layers).toEqual(requiredLayers);

  const alphaPairs = [];
  for (const layer of requiredLayers) {
    for (const variant of ['', '-inverse']) {
      const image = await readFile(resolve(assetDirectory, `${layer}${variant}.png`));
      expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(image.readUInt32BE(16)).toBe(manifest.size);
      expect(image.readUInt32BE(20)).toBe(manifest.size);
      alphaPairs.push({ layer, variant, base64: image.toString('base64') });
    }
  }

  const alphaResults = await page.evaluate(async ({ alphaPairs, size }) => {
    const results = [];
    for (const layer of [...new Set(alphaPairs.map(pair => pair.layer))]) {
      const decoded = [];
      for (const pair of alphaPairs.filter(item => item.layer === layer)) {
        const image = new Image();
        image.src = `data:image/png;base64,${pair.base64}`;
        await image.decode();
        if (image.width !== size || image.height !== size) throw new Error(`Invalid dimensions for ${pair.layer}`);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        decoded.push(context.getImageData(0, 0, size, size).data);
      }
      const [normal, inverse] = decoded;
      let alphaMatches = true;
      let visible = false;
      for (let index = 3; index < normal!.length; index += 4) {
        if (normal![index] !== inverse![index]) alphaMatches = false;
        if (normal![index]! > 0) visible = true;
      }
      results.push({ layer, alphaMatches, visible, cornerAlpha: normal![3] });
    }
    return results;
  }, { alphaPairs, size: manifest.size });

  for (const result of alphaResults) {
    expect(result, result.layer).toMatchObject({ alphaMatches: true, visible: true, cornerAlpha: 0 });
  }
  expect(manifest.masterSha256).toBe(createHash('sha256').update(master).digest('hex'));
  expect(manifest.previewSha256).toBe(createHash('sha256').update(preview).digest('hex'));
});

test('complete amoeba artwork set registers as shared Canvas textures', async ({ page }) => {
  test.setTimeout(60_000);
  await useValidManifest(page);
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const phaserModule = await new Function('specifier', 'return import(specifier)')(
      '/node_modules/phaser/dist/phaser.esm.js',
    ) as { default: typeof import('phaser') };
    const Phaser = phaserModule.default;
    const assetModule = await new Function('specifier', 'return import(specifier)')('/src/view/amoeba-assets.ts') as {
      registerAmoebaAssets(scene: Phaser.Scene): Promise<boolean>;
    };
    const mount = document.createElement('div');
    mount.style.cssText = 'position:fixed;left:0;top:0;width:100px;height:100px;z-index:2147483647';
    document.body.append(mount);

    let game: Phaser.Game;
    const result = await new Promise<{ loaded: boolean; textureCount: number; allTextures112: boolean }>((resolve, reject) => {
      game = new Phaser.Game({
        type: Phaser.CANVAS,
        width: 100,
        height: 100,
        parent: mount,
        audio: { noAudio: true },
        scene: {
          create(this: Phaser.Scene) {
            void assetModule.registerAmoebaAssets(this).then((loaded: boolean) => {
              const keys = this.textures.getTextureKeys().filter(key => key.startsWith('amoeba-'));
              const allTextures112 = keys.every(key => {
                const source = this.textures.get(key).getSourceImage() as HTMLCanvasElement;
                return source.width === 112 && source.height === 112;
              });
              resolve({ loaded, textureCount: keys.length, allTextures112 });
            }, reject);
          },
        },
      });
    });
    game!.destroy(true);
    mount.remove();
    return result;
  });

  expect(result).toEqual({ loaded: true, textureCount: requiredLayers.length * 2, allTextures112: true });
});
