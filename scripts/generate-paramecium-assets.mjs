import { chromium } from 'playwright';
import { readFile, mkdir, writeFile, unlink, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const checkOnly = process.argv.includes('--check');
const sourcePath = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  if (index < 0) return fallback;
  if (!checkOnly || !process.argv[index + 1] || process.argv[index + 1].startsWith('--')) throw new Error(`${flag} requires --check and a path`);
  return process.argv[index + 1];
};
const preview = await readFile(sourcePath('--preview', 'docs/art/paramecium-resting-preview.html'), 'utf8');
const master = await readFile(sourcePath('--master', 'docs/art/paramecium-concept.svg'));
const outputIndex = process.argv.indexOf('--output-dir');
if (outputIndex >= 0 && (!process.argv[outputIndex + 1] || process.argv[outputIndex + 1].startsWith('--'))) throw new Error('--output-dir requires a path');
const directory = resolve(outputIndex < 0 ? 'src/assets/paramecium' : process.argv[outputIndex + 1]);
const size = 896;
const eyeTransform = 'translate(451 202) scale(1.5) translate(-451 -202)';
const layers = ['body', 'detail-0', 'detail-1', 'detail-2', 'eye', 'pupil', 'outline',
  ...Array.from({ length: 10 }, (_, index) => `lid-${index + 1}`),
  ...Array.from({ length: 32 }, (_, index) => `cilia-${index}`)];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const design = await page.evaluate(async ({ master, preview, size, eyeTransform }) => {
    const masterSvg = new DOMParser().parseFromString(master, 'image/svg+xml').documentElement;
    const previewSvg = new DOMParser().parseFromString(preview, 'text/html').querySelector('svg.creature');
    if (masterSvg.localName !== 'svg' || !previewSvg) throw new Error('Invalid paramecium design source');
    const signature = element => {
      if (!element) throw new Error('Missing design geometry');
      return JSON.stringify([element.localName,
        [...element.attributes].map(attribute => [attribute.name, attribute.value]).sort(([first], [second]) => first.localeCompare(second)),
        [...element.children].map(child => JSON.parse(signature(child)))]);
    };
    for (const selector of ['#cilia', '#body', '#internal-details', '#eye-white', '#pupil', '#eye > circle:last-child', '#neutral-bounds']) {
      if (signature(masterSvg.querySelector(selector)) !== signature(previewSvg.querySelector(selector))) {
        throw new Error(`Master and preview geometry differ: ${selector}`);
      }
    }
    for (const svg of [masterSvg, previewSvg]) {
      if (svg.getAttribute('viewBox') !== '-32 -32 832 832'
        || svg.querySelector('#eye')?.getAttribute('transform') !== eyeTransform
        || svg.querySelector('#eye')?.getAttribute('stroke') !== '#172b29'
        || svg.querySelector('#eye')?.getAttribute('stroke-width') !== '12') throw new Error('Invalid design coordinate system or eye');
      const eye = svg.querySelector('#eye-white');
      const pupil = svg.querySelector('#pupil');
      if (!eye || !pupil || pupil.getAttribute('cx') !== eye.getAttribute('cx')
        || pupil.getAttribute('cy') !== eye.getAttribute('cy') || pupil.hasAttribute('transform')
        || svg.querySelector('#eye-orientation')?.hasAttribute('transform')
        || svg.querySelector('#upper-lid')?.hasAttribute('transform')
        || svg.querySelector('#lower-lid')?.hasAttribute('transform')) throw new Error('Invalid neutral eye pose');
      if ([...svg.querySelectorAll('#cilia, #cilia *, #body, #body *, #internal-details, #internal-details *')]
        .some(element => element.hasAttribute('transform'))) throw new Error('Invalid neutral body pose');
    }
    const eye = previewSvg.querySelector('#eye-white');
    const clip = previewSvg.querySelector('#eye-clip circle');
    const upperLid = previewSvg.querySelector('#upper-lid rect');
    const lowerLid = previewSvg.querySelector('#lower-lid rect');
    const eyeTop = Number(eye.getAttribute('cy')) - Number(eye.getAttribute('r'));
    const eyeBottom = Number(eye.getAttribute('cy')) + Number(eye.getAttribute('r'));
    if (!clip || ['cx', 'cy', 'r'].some(attribute => clip.getAttribute(attribute) !== eye.getAttribute(attribute))
      || previewSvg.querySelector('#eyelids')?.getAttribute('clip-path') !== 'url(#eye-clip)'
      || !upperLid || !lowerLid || Number(upperLid.getAttribute('y')) + Number(upperLid.getAttribute('height')) !== eyeTop
      || Number(lowerLid.getAttribute('y')) !== eyeBottom
      || previewSvg.querySelector('#upper-lid path')?.getAttribute('d') !== 'M380 137 H522'
      || previewSvg.querySelector('#lower-lid path')?.getAttribute('d') !== 'M380 267 H522') throw new Error('Invalid neutral eye pose');
    const metadata = masterSvg.querySelector('#neutral-bounds');
    const neutralBounds = Object.fromEntries(['left', 'top', 'right', 'bottom'].map(key => [key, Number(metadata.getAttribute(`data-${key}`))]));
    const neutralPose = metadata.getAttribute('data-pose');
    const coordinates = metadata.getAttribute('data-coordinates');
    if (neutralPose !== 'unrotated body; undeformed cilia; open eye; centered gaze; stationary details'
      || coordinates !== 'SVG user units; includes strokes and round cilia caps'
      || !Object.values(neutralBounds).every(Number.isFinite)
      || neutralBounds.left >= neutralBounds.right || neutralBounds.top >= neutralBounds.bottom) throw new Error('Invalid neutral bounds or pose');
    const path = masterSvg.querySelector('#cilia path')?.getAttribute('d') ?? '';
    const segments = [...path.matchAll(/M(-?[\d.]+)\s+(-?[\d.]+)\s+L(-?[\d.]+)\s+(-?[\d.]+)/g)];
    if (segments.length !== 32 || path.replace(/M(-?[\d.]+)\s+(-?[\d.]+)\s+L(-?[\d.]+)\s+(-?[\d.]+)/g, '').trim()) throw new Error('Invalid cilia geometry');
    const points = segments.flatMap(segment => [[Number(segment[1]), Number(segment[2])], [Number(segment[3]), Number(segment[4])]]);
    const ciliaBounds = [Math.min(...points.map(point => point[0])) - 5, Math.min(...points.map(point => point[1])) - 5,
      Math.max(...points.map(point => point[0])) + 5, Math.max(...points.map(point => point[1])) + 5];
    if (ciliaBounds.some((value, index) => Math.abs(value - Object.values(neutralBounds)[index]) > 1e-9)) throw new Error('Authored bounds do not match neutral cilia caps');
    for (const svg of [masterSvg, previewSvg]) {
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('viewBox', '-64 -64 896 896');
      const image = new Image();
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
      try {
        image.src = url;
        await image.decode();
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = sourceCanvas.height = size;
        const sourceContext = sourceCanvas.getContext('2d');
        if (!sourceContext) throw new Error('Canvas unavailable');
        sourceContext.drawImage(image, 0, 0, size, size);
        for (const resolution of [size, 112]) {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = resolution;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas unavailable');
          context.drawImage(sourceCanvas, 0, 0, resolution, resolution);
          const pixels = context.getImageData(0, 0, resolution, resolution).data;
          const edges = [resolution, resolution, 0, 0];
          for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
            if (pixels[(y * resolution + x) * 4 + 3] >= 16) {
              edges[0] = Math.min(edges[0], x); edges[1] = Math.min(edges[1], y);
              edges[2] = Math.max(edges[2], x + 1); edges[3] = Math.max(edges[3], y + 1);
            }
          }
          const pixelSize = size / resolution;
          if (edges.some((edge, index) => Math.abs(edge * pixelSize - 64 - Object.values(neutralBounds)[index]) > pixelSize)) {
            throw new Error(`Neutral composite is not tight at ${resolution}px`);
          }
        }
      } finally { URL.revokeObjectURL(url); }
    }
    return { neutralBounds, neutralPose, coordinates, designViewBox: [-32, -32, 832, 832],
      raster: { viewBox: [-64, -64, 896, 896], width: size, height: size, scaleX: 1, scaleY: 1, offsetX: 64, offsetY: 64 } };
  }, { master: master.toString('utf8'), preview, size, eyeTransform });
  if (checkOnly) {
    console.log('Paramecium design validation passed');
  } else {
  await mkdir(directory, { recursive: true });
  let previousLayers = [];
  try {
    previousLayers = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8')).layers ?? [];
  } catch { }
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
    ...design,
    layers,
  }, null, 2) + '\n');
  }
} finally { await browser.close(); }