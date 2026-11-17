import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('paramecium exporter validates designs without writing assets', async ({}, testInfo) => {
  const { stdout } = await promisify(execFile)(process.execPath, ['scripts/generate-paramecium-assets.mjs', '--check']);
  expect(stdout).toContain('Paramecium design validation passed');
  const preview = await readFile(resolve('docs/art/paramecium-resting-preview.html'), 'utf8');
  const alteredPreview = testInfo.outputPath('altered-preview.html');
  await writeFile(alteredPreview, preview.replace('M474 37 L474 -11', 'M474 37 L474 -12'));
  await expect(promisify(execFile)(process.execPath, [
    'scripts/generate-paramecium-assets.mjs', '--check', '--preview', alteredPreview,
  ])).rejects.toThrow('Master and preview geometry differ: #cilia');
  const master = await readFile(resolve('docs/art/paramecium-concept.svg'), 'utf8');
  const alteredMaster = testInfo.outputPath('off-center-master.svg');
  const offCenterPreview = testInfo.outputPath('off-center-preview.html');
  await writeFile(alteredMaster, master.replace('id="pupil" cx="451"', 'id="pupil" cx="452"'));
  await writeFile(offCenterPreview, preview.replace('id="pupil" cx="451"', 'id="pupil" cx="452"'));
  await expect(promisify(execFile)(process.execPath, [
    'scripts/generate-paramecium-assets.mjs', '--check', '--master', alteredMaster, '--preview', offCenterPreview,
  ])).rejects.toThrow('Invalid neutral eye pose');
  const closedPreview = testInfo.outputPath('closed-preview.html');
  await writeFile(closedPreview, preview.replace('x="380" y="72" width="142"', 'x="380" y="82" width="142"'));
  await expect(promisify(execFile)(process.execPath, [
    'scripts/generate-paramecium-assets.mjs', '--check', '--preview', closedPreview,
  ])).rejects.toThrow('Invalid neutral eye pose');
});

test('paramecium metadata validation rejects malformed coordinates and preserves fallback', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const modulePath = '/src/view/paramecium-assets.ts';
    const assets = await import(/* @vite-ignore */ modulePath);
    const metadata = {
      size: 896,
      masterSha256: 'a'.repeat(64), previewSha256: 'b'.repeat(64),
      neutralBounds: { left: 54, top: -16, right: 670.8, bottom: 781 },
      neutralPose: 'unrotated body; undeformed cilia; open eye; centered gaze; stationary details',
      coordinates: 'SVG user units; includes strokes and round cilia caps',
      designViewBox: [-32, -32, 832, 832],
      raster: { viewBox: [-64, -64, 896, 896], width: 896, height: 896, scaleX: 1, scaleY: 1, offsetX: 64, offsetY: 64 },
    };
    return {
      valid: assets.validateParameciumMetadata(metadata),
      invalidBounds: assets.validateParameciumMetadata({ ...metadata, neutralBounds: { ...metadata.neutralBounds, right: 54 } }),
      invalidTransform: assets.validateParameciumMetadata({ ...metadata, raster: { ...metadata.raster, offsetX: 0 } }),
      invalidHash: assets.validateParameciumMetadata({ ...metadata, previewSha256: '' }),
      missing: assets.validateParameciumMetadata({}),
      registered: await assets.registerParameciumAssets({ textures: { addCanvas: () => { throw new Error('partial registration'); } } }),
    };
  });
  expect(result.valid).toEqual({ left: 118, top: 48, right: 734.8, bottom: 845 });
  expect([result.invalidBounds, result.invalidTransform, result.invalidHash, result.missing]).toEqual([null, null, null, null]);
  expect(result.registered).toBe(false);
});

test('valid paramecium metadata permits registration and failed registration rolls back', async ({ page }) => {
  const metadata = {
    size: 896, masterSha256: 'a'.repeat(64), previewSha256: 'b'.repeat(64),
    neutralBounds: { left: 54, top: -16, right: 670.8, bottom: 781 },
    neutralPose: 'unrotated body; undeformed cilia; open eye; centered gaze; stationary details',
    coordinates: 'SVG user units; includes strokes and round cilia caps',
    designViewBox: [-32, -32, 832, 832],
    raster: { viewBox: [-64, -64, 896, 896], width: 896, height: 896, scaleX: 1, scaleY: 1, offsetX: 64, offsetY: 64 },
  };
  await page.route('**/src/assets/paramecium/manifest.json?*', route => route.fulfill({
    contentType: 'application/javascript', body: `export default ${JSON.stringify(JSON.stringify(metadata))};`,
  }));
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const modulePath = '/src/view/paramecium-assets.ts';
    const assets = await import(/* @vite-ignore */ modulePath);
    const added: string[] = [], removed: string[] = [];
    const success = await assets.registerParameciumAssets({ textures: {
      addCanvas: (key: string) => added.push(key), remove: (key: string) => removed.push(key),
    } });
    const failedAdded: string[] = [], failedRemoved: string[] = [];
    const failure = await assets.registerParameciumAssets({ textures: {
      addCanvas: (key: string) => { if (failedAdded.length === 2) throw new Error('registration failure'); failedAdded.push(key); },
      remove: (key: string) => failedRemoved.push(key),
    } });
    return { bounds: assets.parameciumNeutralBounds, success, added: added.length, removed,
      failure, failedAdded, failedRemoved };
  });
  expect(result.bounds).toEqual({ left: 118, top: 48, right: 734.8, bottom: 845 });
  expect(result.success).toBe(true);
  expect(result.added).toBe(98);
  expect(result.removed).toEqual([]);
  expect(result.failure).toBe(false);
  expect(result.failedAdded).toHaveLength(2);
  expect(result.failedRemoved).toEqual(result.failedAdded);
});

test('authored neutral paramecium bounds match the master and preview silhouette', async ({ page }) => {
  const master = await readFile(resolve('docs/art/paramecium-concept.svg'), 'utf8');
  const preview = await readFile(resolve('docs/art/paramecium-resting-preview.html'), 'utf8');
  const result = await page.evaluate(async ({ master, preview }) => {
    const masterSvg = new DOMParser().parseFromString(master, 'image/svg+xml').documentElement;
    const previewSvg = new DOMParser().parseFromString(preview, 'text/html').querySelector('svg.creature')!;
    const box = (svg: Element) => {
      const metadata = svg.querySelector('#neutral-bounds');
      return metadata && ['left', 'top', 'right', 'bottom'].map(key => Number(metadata.getAttribute(`data-${key}`)));
    };
    const raster = async (svg: Element, size: number) => {
      const clone = svg.cloneNode(true) as SVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('viewBox', '-64 -64 896 896');
      const image = new Image();
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
      try {
        image.src = url;
        await image.decode();
        const source = document.createElement('canvas');
        source.width = source.height = 896;
        source.getContext('2d')!.drawImage(image, 0, 0, 896, 896);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d')!;
        context.drawImage(source, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        let left = size, top = size, right = 0, bottom = 0;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          if (pixels[(y * size + x) * 4 + 3] >= 16) {
            left = Math.min(left, x); top = Math.min(top, y);
            right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
          }
        }
        return [left, top, right, bottom].map(value => value * 896 / size - 64);
      } finally { URL.revokeObjectURL(url); }
    };
    return { masterBox: box(masterSvg), previewBox: box(previewSvg),
      masterPixels: await raster(masterSvg, 896), previewPixels: await raster(previewSvg, 896),
      runtimePixels: await raster(previewSvg, 112) };
  }, { master, preview });
  const expected = [54, -16, 670.8, 781];
  for (const pixels of [result.masterPixels, result.previewPixels]) {
    pixels.forEach((value, index) => expect(Math.abs(value - expected[index])).toBeLessThanOrEqual(1));
  }
  result.runtimePixels.forEach((value, index) => expect(Math.abs(value - expected[index])).toBeLessThanOrEqual(8));
  expect(result.masterBox).toEqual(expected);
  expect(result.previewBox).toEqual(expected);
});

test('runtime paramecium layers preserve alpha and neutral composite bounds', async ({ page }) => {
  const directory = resolve('src/assets/paramecium');
  const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8')) as { layers: string[] };
  const preview = await readFile(resolve('docs/art/paramecium-resting-preview.html'), 'utf8');
  const images = await Promise.all(manifest.layers.map(async layer => ({
    layer,
    normal: (await readFile(resolve(directory, `${layer}.png`))).toString('base64'),
    inverse: (await readFile(resolve(directory, `${layer}-inverse.png`))).toString('base64'),
  })));
  const result = await page.evaluate(async ({ images, preview }) => {
    const svg = new DOMParser().parseFromString(preview, 'text/html').querySelector('svg.creature')!;
    const cilia = svg.querySelector('#cilia')!.cloneNode(true);
    const neutralSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    neutralSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    neutralSvg.setAttribute('viewBox', '-64 -64 896 896');
    neutralSvg.setAttribute('width', '896'); neutralSvg.setAttribute('height', '896');
    neutralSvg.append(cilia);
    const ciliaUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(neutralSvg)], { type: 'image/svg+xml' }));
    const load = async (url: string) => { const image = new Image(); image.src = url; await image.decode(); return image; };
    const canvas = (size: number) => { const element = document.createElement('canvas'); element.width = element.height = size; return element; };
    const normalComposite = canvas(896), inverseComposite = canvas(896);
    try {
      const neutralCilia = await load(ciliaUrl);
      normalComposite.getContext('2d')!.drawImage(neutralCilia, 0, 0);
      inverseComposite.getContext('2d')!.drawImage(neutralCilia, 0, 0);
      const mismatches: string[] = [];
      const neutralLayers = new Set(['body', 'detail-0', 'detail-1', 'detail-2', 'eye', 'pupil', 'outline']);
      for (const { layer, normal, inverse } of images) {
        const [normalImage, inverseImage] = await Promise.all([load(`data:image/png;base64,${normal}`), load(`data:image/png;base64,${inverse}`)]);
        if (normalImage.width !== 896 || normalImage.height !== 896 || inverseImage.width !== 896 || inverseImage.height !== 896) {
          mismatches.push(`${layer}: dimensions`); continue;
        }
        for (const size of [896, 112]) {
          const first = canvas(size), second = canvas(size);
          first.getContext('2d')!.drawImage(normalImage, 0, 0, size, size);
          second.getContext('2d')!.drawImage(inverseImage, 0, 0, size, size);
          const firstPixels = first.getContext('2d')!.getImageData(0, 0, size, size).data;
          const secondPixels = second.getContext('2d')!.getImageData(0, 0, size, size).data;
          for (let index = 3; index < firstPixels.length; index += 4) {
            if (firstPixels[index] !== secondPixels[index]) { mismatches.push(`${layer}: ${size}px alpha`); break; }
          }
        }
        if (neutralLayers.has(layer)) {
          normalComposite.getContext('2d')!.drawImage(normalImage, 0, 0);
          inverseComposite.getContext('2d')!.drawImage(inverseImage, 0, 0);
        }
      }
      const edges = (source: HTMLCanvasElement, size: number) => {
        const target = canvas(size), context = target.getContext('2d')!;
        context.drawImage(source, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        const bounds = [size, size, 0, 0];
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          if (pixels[(y * size + x) * 4 + 3] >= 16) {
            bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
            bounds[2] = Math.max(bounds[2], x + 1); bounds[3] = Math.max(bounds[3], y + 1);
          }
        }
        return bounds.map(value => value * 896 / size - 64);
      };
      return { mismatches, bounds: [edges(normalComposite, 896), edges(inverseComposite, 896),
        edges(normalComposite, 112), edges(inverseComposite, 112)] };
    } finally { URL.revokeObjectURL(ciliaUrl); }
  }, { images, preview });
  expect(result.mismatches).toEqual([]);
  const expected = [54, -16, 670.8, 781];
  result.bounds.forEach((bounds, resolutionIndex) => bounds.forEach((value, index) => {
    expect(Math.abs(value - expected[index]), `composite ${resolutionIndex} edge ${index}`).toBeLessThanOrEqual(resolutionIndex < 2 ? 1 : 8);
  }));
});

test('resting preview animates all 32 cilia, including the top stem', async ({ page }) => {
  await page.goto(pathToFileURL(resolve('docs/art/paramecium-resting-preview.html')).href);
  await expect.poll(() => page.locator('svg.creature').first().locator('#cilia line').count()).toBe(32);
  await expect.poll(() => page.locator('svg.creature').first().evaluate(svg => {
    const bodyRotation = Number(svg.style.transform.match(/rotate\(([-\d.]+)deg\)/)?.[1] ?? 0);
    const eyeRotation = Number(svg.querySelector('#eye-orientation')?.getAttribute('transform')?.match(/rotate\(([-\d.]+)/)?.[1] ?? 0);
    return Math.abs(bodyRotation) > 0.1 && Math.abs(bodyRotation + eyeRotation) < 0.001;
  })).toBe(true);
});

test('paramecium assets contain aligned transparent layers and inverse variants', async ({ page }) => {
  const directory = resolve('src/assets/paramecium');
  const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8')) as {
    size: number;
    ciliaCount: number;
    ciliaLengthScale: number;
    ciliaSwingDegrees: number;
    eyeScale: number;
    masterSha256: string;
    previewSha256: string;
    neutralBounds: { left: number; top: number; right: number; bottom: number };
    neutralPose: string;
    coordinates: string;
    designViewBox: number[];
    raster: { viewBox: number[]; width: number; height: number; scaleX: number; scaleY: number; offsetX: number; offsetY: number };
    layers: string[];
  };
  const master = await readFile(resolve('docs/art/paramecium-concept.svg'));
  expect(manifest.masterSha256).toBe(createHash('sha256').update(master).digest('hex'));
  const preview = await readFile(resolve('docs/art/paramecium-resting-preview.html'));
  expect(manifest.previewSha256).toBe(createHash('sha256').update(preview).digest('hex'));
  expect(manifest.neutralBounds).toEqual({ left: 54, top: -16, right: 670.8, bottom: 781 });
  expect(manifest.neutralPose).toBe('unrotated body; undeformed cilia; open eye; centered gaze; stationary details');
  expect(manifest.coordinates).toBe('SVG user units; includes strokes and round cilia caps');
  expect(manifest.designViewBox).toEqual([-32, -32, 832, 832]);
  expect(manifest.raster).toEqual({ viewBox: [-64, -64, 896, 896], width: 896, height: 896, scaleX: 1, scaleY: 1, offsetX: 64, offsetY: 64 });
  const masterSource = master.toString('utf8');
  const ciliaPath = masterSource.match(/<g id="cilia"[^>]*>\s*<path d="([^"]+)"/)?.[1];
  const ciliaSegments = [...(ciliaPath ?? '').matchAll(/M([\d.]+)\s+([-\d.]+)\s+L([-\d.]+)\s+([-\d.]+)/g)];
  expect(ciliaSegments).toHaveLength(32);
  const ciliaBases = ciliaSegments.map(segment => segment.slice(1, 3).map(Number));
  const ciliaSpacing = ciliaBases.map((base, index) => {
    const next = ciliaBases[(index + 1) % ciliaBases.length];
    return Math.hypot(next[0] - base[0], next[1] - base[1]);
  });
  expect(Math.max(...ciliaSpacing) - Math.min(...ciliaSpacing)).toBeLessThan(5);
  for (const segment of ciliaSegments) {
    const [startX, startY, endX, endY] = segment.slice(1).map(Number);
    expect(Math.hypot(endX - startX, endY - startY)).toBeGreaterThan(40);
  }
  expect(masterSource).toMatch(/id="eye" transform="[^"]*scale\(1\.5\)/);
  expect(manifest.ciliaCount).toBe(32);
  expect(manifest.ciliaLengthScale).toBe(2);
  expect(manifest.ciliaSwingDegrees).toBe(30);
  expect(manifest.eyeScale).toBe(1.5);
  expect(manifest.size).toBeGreaterThan(768);
  expect(manifest.layers).toEqual(expect.arrayContaining(['body', 'eye', 'pupil', 'outline', 'detail-0', 'detail-1', 'detail-2']));
  expect(manifest.layers.filter(layer => layer.startsWith('cilia-')).length).toBe(32);

  const images = await Promise.all(manifest.layers.map(async layer => ({
    layer,
    normal: (await readFile(resolve(directory, `${layer}.png`))).toString('base64'),
    inverse: (await readFile(resolve(directory, `${layer}-inverse.png`))).toString('base64'),
  })));
  const results = await page.evaluate(async ({ images, size }) => {
    async function pixels(data: string): Promise<ImageData> {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      if (image.width !== size || image.height !== size) throw new Error('Misaligned artwork dimensions');
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, size, size);
    }
    const topCilium = images.find(image => image.layer === 'cilia-0');
    if (!topCilium) throw new Error('First cilia frame is missing');
    const firstCiliaPixels = (await pixels(topCilium.normal)).data;
    const topCiliumAlpha = firstCiliaPixels[(53 * size + 538) * 4 + 3];
    return {
      topCiliumAlpha,
      layers: await Promise.all(images.map(async ({ layer, normal, inverse }) => {
      const original = (await pixels(normal)).data;
      const inverted = (await pixels(inverse)).data;
      let alphaMismatch = false;
      let visible = false;
      for (let index = 3; index < original.length; index += 4) {
        if (original[index] !== inverted[index]) alphaMismatch = true;
        if (original[index]) visible = true;
      }
      return { layer, alphaMismatch, visible, cornerAlpha: original[3] };
      })),
    };
  }, { images, size: manifest.size });
  expect(results.topCiliumAlpha).toBeGreaterThan(0);
  for (const result of results.layers) {
    expect(result, result.layer).toMatchObject({ alphaMismatch: false, visible: true, cornerAlpha: 0 });
  }
});