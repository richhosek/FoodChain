import { chromium } from 'playwright';
import { readFile, mkdir, writeFile, unlink, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const preview = await readFile('docs/art/paramecium-resting-preview.html', 'utf8');
const master = await readFile('docs/art/paramecium-concept.svg');
const directory = resolve('src/assets/paramecium');
const size = 896;
const eyeTransform = 'translate(451 202) scale(1.5) translate(-451 -202)';
const layers = ['body', 'detail-0', 'detail-1', 'detail-2', 'eye', 'pupil', 'outline',
  ...Array.from({ length: 10 }, (_, index) => `lid-${index + 1}`),
  ...Array.from({ length: 32 }, (_, index) => `cilia-${index}`)];
await mkdir(directory, { recursive: true });
let previousLayers = [];
try {
  previousLayers = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8')).layers ?? [];
} catch { }
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const layer of layers) {
    const output = await page.evaluate(async ({ preview, layer, size, eyeTransform }) => {
      const documentSource = new DOMParser().parseFromString(preview, 'text/html');
      const source = documentSource.querySelector('svg.creature');
      if (!source) throw new Error('Preview artwork missing');
      const namespace = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(namespace, 'svg');
      svg.setAttribute('xmlns', namespace);
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
      svg.setAttribute('viewBox', '-64 -64 896 896');
      const copy = selector => {
        const element = source.querySelector(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        return element.cloneNode(true);
      };
      if (layer === 'body') svg.append(copy('#body'));
      else if (layer.startsWith('detail-')) {
        const group = copy('#internal-details');
        const element = group.children[Number(layer.slice(7))];
        group.replaceChildren(element);
        svg.append(group);
      } else if (layer === 'eye' || layer === 'pupil') {
        const element = copy(layer === 'eye' ? '#eye-white' : '#pupil');
        element.setAttribute('transform', eyeTransform);
        svg.append(element);
      }
      else if (layer === 'outline') {
        const eye = copy('#eye');
        const outline = eye.lastElementChild;
        eye.replaceChildren(outline);
        svg.append(eye);
      } else if (layer.startsWith('lid-')) {
        const eye = copy('#eye');
        const lids = eye.querySelector('#eyelids');
        const closure = Number(layer.slice(4)) / 10;
        lids.querySelector('#upper-lid').setAttribute('transform', `translate(0 ${65 * closure})`);
        lids.querySelector('#lower-lid').setAttribute('transform', `translate(0 ${-65 * closure})`);
        eye.querySelector('#eye-white').remove();
        eye.querySelector('#pupil').remove();
        eye.lastElementChild.remove();
        svg.append(eye);
      } else {
        const cilia = copy('#cilia');
        const original = cilia.querySelector('path');
        const segments = [...original.getAttribute('d').matchAll(/M(-?[\d.]+)\s+(-?[\d.]+)\s+L(-?[\d.]+)\s+(-?[\d.]+)/g)];
        original.remove();
        const phase = Number(layer.slice(6)) * Math.PI * 2 / 32;
        segments.forEach((segment, index) => {
          const [startX, startY, endX, endY] = segment.slice(1).map(Number);
          const line = document.createElementNS(namespace, 'line');
          for (const [name, value] of Object.entries({ x1: startX, y1: startY, x2: endX, y2: endY })) line.setAttribute(name, String(value));
          const angle = 30 * Math.sin(phase - index * Math.PI * 4 / segments.length);
          line.setAttribute('transform', `rotate(${angle} ${startX} ${startY})`);
          cilia.append(line);
        });
        svg.append(cilia);
      }
      const image = new Image();
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      try {
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const normal = canvas.toDataURL('image/png').split(',')[1];
        const pixels = context.getImageData(0, 0, size, size);
        for (let index = 0; index < pixels.data.length; index += 4) {
          pixels.data[index] = 255 - pixels.data[index];
          pixels.data[index + 1] = 255 - pixels.data[index + 1];
          pixels.data[index + 2] = 255 - pixels.data[index + 2];
        }
        context.putImageData(pixels, 0, 0);
        return [normal, canvas.toDataURL('image/png').split(',')[1]];
      } finally { URL.revokeObjectURL(url); }
    }, { preview, layer, size, eyeTransform });
    await writeFile(resolve(directory, `${layer}.png`), Buffer.from(output[0], 'base64'));
    await writeFile(resolve(directory, `${layer}-inverse.png`), Buffer.from(output[1], 'base64'));
  }
  const activeLayers = new Set(layers);
  const activeFiles = new Set(layers.flatMap(layer => [`${layer}.png`, `${layer}-inverse.png`]));
  for (const layer of previousLayers) {
    if (!activeLayers.has(layer)) {
      await Promise.all([
        unlink(resolve(directory, `${layer}.png`)).catch(() => {}),
        unlink(resolve(directory, `${layer}-inverse.png`)).catch(() => {}),
      ]);
    }
  }
  for (const { name } of await readdir(directory, { withFileTypes: true })) {
    if (/^cilia-\d+(?:-inverse)?\.png$/.test(name) && !activeFiles.has(name)) {
      await unlink(resolve(directory, name)).catch(() => {});
    }
  }
  const hash = value => createHash('sha256').update(value).digest('hex');
  await writeFile(resolve(directory, 'manifest.json'), JSON.stringify({
    size,
    ciliaCount: 32,
    ciliaLengthScale: 2,
    ciliaSwingDegrees: 30,
    eyeScale: 1.5,
    masterSha256: hash(master),
    previewSha256: hash(preview),
    layers,
  }, null, 2) + '\n');
} finally { await browser.close(); }