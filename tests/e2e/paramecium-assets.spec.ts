import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

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
    layers: string[];
  };
  const master = await readFile(resolve('docs/art/paramecium-concept.svg'));
  expect(manifest.masterSha256).toBe(createHash('sha256').update(master).digest('hex'));
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