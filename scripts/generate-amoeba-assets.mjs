import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const masterPath = 'docs/art/amoeba-concept.svg';
const previewPath = 'docs/art/amoeba-resting-preview.html';
const outputIndex = process.argv.indexOf('--output-dir');
if (outputIndex >= 0 && (!process.argv[outputIndex + 1] || process.argv[outputIndex + 1].startsWith('--'))) throw new Error('--output-dir requires a path');
const directory = resolve(outputIndex < 0 ? 'src/assets/amoeba' : process.argv[outputIndex + 1]);
const size = 832;
const contourFrameCount = 32;
const faceFrameCount = 33;
const layers = [
  ...Array.from({ length: contourFrameCount }, (_, index) => `body-frame-${String(index).padStart(2, '0')}`),
  ...Array.from({ length: faceFrameCount }, (_, index) => `face-frame-${String(index).padStart(2, '0')}`),
  ...Array.from({ length: 11 }, (_, index) => `lid-${index}`),
];
const master = await readFile(masterPath, 'utf8');
const preview = await readFile(previewPath, 'utf8');
await mkdir(directory, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const outputs = await page.evaluate(async ({ master, layers, size, contourFrameCount, faceFrameCount }) => {
    const namespace = 'http://www.w3.org/2000/svg';
    const parsed = new DOMParser().parseFromString(master, 'image/svg+xml');
    if (parsed.querySelector('parsererror')) throw new Error('Amoeba SVG master is invalid');
    const sourceSvg = parsed.documentElement;
    sourceSvg.setAttribute('width', String(size));
    sourceSvg.setAttribute('height', String(size));
    sourceSvg.style.cssText = 'position:fixed;left:-2000px;top:0;width:832px;height:832px';
    document.body.append(sourceSvg);
    const body = sourceSvg.querySelector('#body-shape');
    if (!body) throw new Error('Amoeba body shape is missing');

    const contourLength = body.getTotalLength();
    const pointCount = 160;
    const restPoints = Array.from({ length: pointCount }, (_, index) => {
      const distance = contourLength * index / pointCount;
      const position = body.getPointAtLength(distance);
      const previous = body.getPointAtLength((distance - 0.5 + contourLength) % contourLength);
      const next = body.getPointAtLength((distance + 0.5) % contourLength);
      const tangentX = next.x - previous.x;
      const tangentY = next.y - previous.y;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      return {
        x: position.x,
        y: position.y,
        normalX: tangentY / tangentLength,
        normalY: -tangentX / tangentLength,
        fraction: index / pointCount,
      };
    });
    const lobeIndex = restPoints.reduce((bestIndex, point, index) => {
      const best = restPoints[bestIndex];
      return Math.hypot(point.x - 610, point.y - 220) < Math.hypot(best.x - 610, best.y - 220) ? index : bestIndex;
    }, 0);
    const lobeFraction = lobeIndex / pointCount;

    function smoothClosedPath(points) {
      let path = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
      for (let index = 0; index < points.length; index += 1) {
        const previous = points[(index + points.length - 1) % points.length];
        const current = points[index];
        const next = points[(index + 1) % points.length];
        const following = points[(index + 2) % points.length];
        const firstControl = {
          x: current.x + (next.x - previous.x) / 6,
          y: current.y + (next.y - previous.y) / 6,
        };
        const secondControl = {
          x: next.x - (following.x - current.x) / 6,
          y: next.y - (following.y - current.y) / 6,
        };
        path += ` C${firstControl.x.toFixed(2)} ${firstControl.y.toFixed(2)} ${secondControl.x.toFixed(2)} ${secondControl.y.toFixed(2)} ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
      }
      return `${path} Z`;
    }

    function makeSvg() {
      const svg = document.createElementNS(namespace, 'svg');
      svg.setAttribute('xmlns', namespace);
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
      svg.setAttribute('viewBox', '-32 -32 832 832');
      return svg;
    }

    function cloneRequired(selector) {
      const source = sourceSvg.querySelector(selector);
      if (!source) throw new Error(`Missing amoeba source layer ${selector}`);
      return source.cloneNode(true);
    }

    function appendContour(svg, frameIndex) {
      const phase = frameIndex * Math.PI * 2 / contourFrameCount;
      const points = restPoints.map(point => {
        const distance = Math.min(Math.abs(point.fraction - lobeFraction), 1 - Math.abs(point.fraction - lobeFraction));
        const lobeWeight = Math.exp(-(distance * distance) / (2 * 0.035 * 0.035));
        const ripple = 8 * Math.sin(phase + point.fraction * Math.PI * 6)
          + 3.5 * Math.sin(phase * 0.75 - point.fraction * Math.PI * 8 + 0.7);
        const lobeWave = 8.5 * Math.sin(phase * 1.25 + 0.45) * lobeWeight;
        const offset = ripple + lobeWave;
        return {
          x: point.x + point.normalX * offset,
          y: point.y + point.normalY * offset,
        };
      });
      const contourPath = smoothClosedPath(points);
      const defs = document.createElementNS(namespace, 'defs');
      const clip = document.createElementNS(namespace, 'clipPath');
      clip.setAttribute('id', 'body-frame-clip');
      const clipShape = document.createElementNS(namespace, 'path');
      clipShape.setAttribute('d', contourPath);
      clip.append(clipShape);
      defs.append(clip);
      svg.append(defs);

      const bodyPath = document.createElementNS(namespace, 'path');
      bodyPath.setAttribute('d', contourPath);
      bodyPath.setAttribute('fill', body.getAttribute('fill') ?? '#f4c84c');
      bodyPath.setAttribute('stroke', body.getAttribute('stroke') ?? '#111111');
      bodyPath.setAttribute('stroke-width', body.getAttribute('stroke-width') ?? '12');
      bodyPath.setAttribute('stroke-linejoin', body.getAttribute('stroke-linejoin') ?? 'round');
      svg.append(bodyPath);

      const highlight = cloneRequired('#body-highlight');
      highlight.setAttribute('clip-path', 'url(#body-frame-clip)');
      svg.append(highlight);
      appendInteriorDetails(svg, frameIndex);
      const eyeBase = cloneRequired('#eye');
      eyeBase.querySelector('#pupil')?.remove();
      svg.append(eyeBase);
    }

    function appendInteriorDetails(svg, frameIndex) {
      const source = sourceSvg.querySelector('#internal-details');
      if (!source) throw new Error('Amoeba interior details are missing');
      const shapes = [
        { selectors: ['#large-vacuole', '#vacuole-glint'], x: 196, y: 460, radius: 55, amplitudeX: 3.2, amplitudeY: 2.4 },
        { selectors: ['[data-vacuole="true"][cx="236"]'], x: 236, y: 563, radius: 24, amplitudeX: 7.5, amplitudeY: 6 },
        { selectors: ['[data-vacuole="true"][cx="300"]'], x: 300, y: 520, radius: 14, amplitudeX: 8.5, amplitudeY: 6.8 },
        { selectors: ['path:not(#large-vacuole)'], x: 645, y: 418.5, radius: 34, amplitudeX: 2.8, amplitudeY: 2.2 },
        { selectors: ['[data-vacuole="true"][cx="590"]'], x: 590, y: 455, radius: 14, amplitudeX: 6.8, amplitudeY: 5.3 },
        { selectors: ['[data-vacuole="true"][cx="400"]'], x: 400, y: 490, radius: 24, amplitudeX: 8, amplitudeY: 6.2 },
      ];
      const phase = frameIndex * Math.PI * 2 / contourFrameCount;
      const placed = [];
      const group = document.createElementNS(namespace, 'g');
      group.setAttribute('stroke', source.getAttribute('stroke') ?? '#111111');
      group.setAttribute('stroke-width', source.getAttribute('stroke-width') ?? '9');
      group.setAttribute('stroke-linejoin', source.getAttribute('stroke-linejoin') ?? 'round');
      for (let index = 0; index < shapes.length; index += 1) {
        const detail = shapes[index];
        const requested = {
          x: detail.amplitudeX * Math.sin(phase * (1 + index * 0.035) + index * 1.7),
          y: detail.amplitudeY * Math.cos(phase * (0.83 + index * 0.025) + index * 1.19),
        };
        const clear = scale => placed.every(previous => Math.hypot(
          detail.x + requested.x * scale - previous.x,
          detail.y + requested.y * scale - previous.y,
        ) > detail.radius + previous.radius + 3);
        let scale = 1;
        if (!clear(scale)) {
          let low = 0;
          let high = 1;
          for (let attempt = 0; attempt < 18; attempt += 1) {
            const middle = (low + high) / 2;
            if (clear(middle)) low = middle;
            else high = middle;
          }
          scale = low;
        }
        const offsetX = requested.x * scale;
        const offsetY = requested.y * scale;
        placed.push({ x: detail.x + offsetX, y: detail.y + offsetY, radius: detail.radius });
        const item = document.createElementNS(namespace, 'g');
        item.setAttribute('transform', `translate(${offsetX} ${offsetY})`);
        for (const selector of detail.selectors) {
          const element = source.querySelector(selector);
          if (!element) throw new Error(`Missing amoeba detail ${selector}`);
          item.append(element.cloneNode(true));
        }
        group.append(item);
      }
      svg.append(group);
    }

    function appendLayer(svg, layer) {
      if (layer.startsWith('body-frame-')) {
        appendContour(svg, Number(layer.slice('body-frame-'.length)));
        return;
      }
      if (layer.startsWith('face-frame-')) {
        const frameIndex = Number(layer.slice('face-frame-'.length));
        const eye = cloneRequired('#eye');
        const gazeIndex = frameIndex === 0 ? null : Math.floor((frameIndex - 1) / 4);
        const gazeStep = frameIndex === 0 ? 0 : ((frameIndex - 1) % 4 + 1) / 4;
        const gazeDirection = gazeIndex === null ? 0 : gazeIndex * Math.PI / 4;
        const gazeX = gazeIndex === null ? 0 : 39 * Math.cos(gazeDirection) * gazeStep;
        const gazeY = gazeIndex === null ? 0 : 39 * Math.sin(gazeDirection) * gazeStep;
        const pupil = eye.querySelector('#pupil');
        pupil.setAttribute('transform', `translate(${gazeX * 1.5} ${gazeY * 1.5})`);
        eye.querySelector('#eye-white')?.remove();
        eye.querySelector('#eye-outline')?.remove();
        const eyebrow = cloneRequired('#eyebrow');
        eyebrow.setAttribute('transform', `rotate(${-gazeX / 39 * 10} 360 153.5)`);
        svg.append(eye, eyebrow);
        return;
      }
      if (layer === 'eye' || layer === 'eye-outline' || layer === 'pupil') {
        const sourceSelector = layer === 'eye' ? '#eye-white' : layer === 'eye-outline' ? '#eye-outline' : '#pupil';
        const eye = sourceSvg.querySelector('#eye');
        const element = cloneRequired(sourceSelector);
        const group = document.createElementNS(namespace, 'g');
        group.setAttribute('transform', eye?.getAttribute('transform') ?? '');
        if (layer !== 'eye') {
          group.setAttribute('stroke', '#111111');
          group.setAttribute('stroke-width', '12');
        }
        group.append(element);
        svg.append(group);
        return;
      }
      if (layer === 'eyebrow') {
        svg.append(cloneRequired('#eyebrow'));
        return;
      }
      if (layer.startsWith('lid-')) {
        const closure = Number(layer.slice(4)) / 10;
        const group = document.createElementNS(namespace, 'g');
        group.setAttribute('transform', sourceSvg.querySelector('#eye')?.getAttribute('transform') ?? '');
        group.setAttribute('stroke', '#111111');
        group.setAttribute('stroke-width', '12');
        const defs = document.createElementNS(namespace, 'defs');
        const clip = document.createElementNS(namespace, 'clipPath');
        clip.setAttribute('id', 'eye-lid-clip');
        const circle = document.createElementNS(namespace, 'circle');
        circle.setAttribute('cx', '360');
        circle.setAttribute('cy', '260');
        circle.setAttribute('r', '65');
        clip.append(circle);
        defs.append(clip);
        svg.append(defs);
        group.setAttribute('clip-path', 'url(#eye-lid-clip)');
        const upper = document.createElementNS(namespace, 'g');
        upper.setAttribute('transform', `translate(0 ${65 * closure})`);
        const upperFill = document.createElementNS(namespace, 'rect');
        upperFill.setAttribute('x', '285');
        upperFill.setAttribute('y', '130');
        upperFill.setAttribute('width', '150');
        upperFill.setAttribute('height', '65');
        upperFill.setAttribute('fill', '#f4c84c');
        upperFill.setAttribute('stroke', 'none');
        const upperEdge = document.createElementNS(namespace, 'path');
        upperEdge.setAttribute('d', 'M285 195 H435');
        upperEdge.setAttribute('fill', 'none');
        upper.append(upperFill, upperEdge);
        const lower = document.createElementNS(namespace, 'g');
        lower.setAttribute('transform', `translate(0 ${-65 * closure})`);
        const lowerFill = document.createElementNS(namespace, 'rect');
        lowerFill.setAttribute('x', '285');
        lowerFill.setAttribute('y', '325');
        lowerFill.setAttribute('width', '150');
        lowerFill.setAttribute('height', '65');
        lowerFill.setAttribute('fill', '#f4c84c');
        lowerFill.setAttribute('stroke', 'none');
        const lowerEdge = document.createElementNS(namespace, 'path');
        lowerEdge.setAttribute('d', 'M285 325 H435');
        lowerEdge.setAttribute('fill', 'none');
        lower.append(lowerFill, lowerEdge);
        group.append(upper, lower);
        svg.append(group);
        return;
      }
      throw new Error(`Unknown amoeba layer ${layer}`);
    }

    const boundsElement = sourceSvg.querySelector('defs > #neutral-bounds');
    if (!boundsElement || boundsElement.tagName !== 'rect') throw new Error('Missing non-rendering amoeba neutral bounds');
    const values = ['x', 'y', 'width', 'height'].map(attribute => {
      const value = boundsElement.getAttribute(attribute);
      if (value === null || value.trim() === '' || !Number.isFinite(Number(value))) throw new Error(`Invalid neutral bounds ${attribute}`);
      return Number(value);
    });
    const [left, top, width, height] = values;
    const neutralBounds = { left, top, right: left + width, bottom: top + height };
    const neutralPose = {
      body: boundsElement.getAttribute('data-body'),
      face: boundsElement.getAttribute('data-face'),
      lid: boundsElement.getAttribute('data-lid'),
      rotationDegrees: Number(boundsElement.getAttribute('data-rotation-degrees')),
    };
    const viewBoxValues = sourceSvg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
    if (!viewBoxValues || viewBoxValues.length !== 4 || viewBoxValues.some(value => !Number.isFinite(value))) throw new Error('Invalid amoeba source viewBox');
    const [viewX, viewY, viewWidth, viewHeight] = viewBoxValues;
    if (viewX !== -32 || viewY !== -32 || viewWidth !== size || viewHeight !== size
      || width <= 0 || height <= 0 || left < viewX || top < viewY
      || neutralBounds.right > viewX + viewWidth || neutralBounds.bottom > viewY + viewHeight
      || neutralPose.body !== 'body-frame-00' || neutralPose.face !== 'face-frame-00'
      || neutralPose.lid !== 'open' || boundsElement.getAttribute('data-rotation-degrees') !== '0') {
      throw new Error('Invalid amoeba neutral bounds, pose, or coordinate transform');
    }

    const results = [];
    for (const layer of layers) {
      const svg = makeSvg();
      appendLayer(svg, layer);
      const image = new Image();
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      try {
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(image, 0, 0);
        const normal = canvas.toDataURL('image/png').split(',')[1];
        const pixels = context.getImageData(0, 0, size, size);
        for (let index = 0; index < pixels.data.length; index += 4) {
          pixels.data[index] = 255 - pixels.data[index];
          pixels.data[index + 1] = 255 - pixels.data[index + 1];
          pixels.data[index + 2] = 255 - pixels.data[index + 2];
        }
        context.putImageData(pixels, 0, 0);
        const inverse = canvas.toDataURL('image/png').split(',')[1];
        results.push({ layer, normal, inverse });
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    const neutralCanvas = document.createElement('canvas');
    neutralCanvas.width = neutralCanvas.height = size;
    const neutralContext = neutralCanvas.getContext('2d');
    if (!neutralContext) throw new Error('Canvas unavailable');
    for (const layer of [neutralPose.body, neutralPose.face]) {
      const output = results.find(result => result.layer === layer);
      if (!output) throw new Error(`Missing neutral layer ${layer}`);
      const image = new Image();
      image.src = `data:image/png;base64,${output.normal}`;
      await image.decode();
      neutralContext.drawImage(image, 0, 0);
    }
    const pixels = neutralContext.getImageData(0, 0, size, size).data;
    let pixelLeft = size, pixelTop = size, pixelRight = 0, pixelBottom = 0;
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
      if (pixels[(y * size + x) * 4 + 3] < 128) continue;
      pixelLeft = Math.min(pixelLeft, x); pixelTop = Math.min(pixelTop, y);
      pixelRight = Math.max(pixelRight, x + 1); pixelBottom = Math.max(pixelBottom, y + 1);
    }
    if (pixelRight <= pixelLeft || pixelBottom <= pixelTop
      || Math.abs(pixelLeft + viewX - left) > 1 || Math.abs(pixelTop + viewY - top) > 1
      || Math.abs(pixelRight + viewX - neutralBounds.right) > 1
      || Math.abs(pixelBottom + viewY - neutralBounds.bottom) > 1) {
      throw new Error('Authored amoeba neutral bounds do not match the composite');
    }
    sourceSvg.remove();
    return { results, neutralBounds, neutralPose, coordinates: { viewBox: { x: viewX, y: viewY, width: viewWidth, height: viewHeight }, rasterSize: size, runtimeSize: 112 } };
  }, { master, layers, size, contourFrameCount, faceFrameCount });

  for (const { layer, normal, inverse } of outputs.results) {
    await Promise.all([
      writeFile(resolve(directory, `${layer}.png`), Buffer.from(normal, 'base64')),
      writeFile(resolve(directory, `${layer}-inverse.png`), Buffer.from(inverse, 'base64')),
    ]);
  }
  const expectedFiles = new Set(layers.flatMap(layer => [`${layer}.png`, `${layer}-inverse.png`]));
  for (const filename of await readdir(directory)) {
    if (filename.endsWith('.png') && !expectedFiles.has(filename)) {
      await unlink(resolve(directory, filename));
    }
  }
  const hash = value => createHash('sha256').update(value).digest('hex');
  await writeFile(resolve(directory, 'manifest.json'), JSON.stringify({
    size,
    contourFrameCount,
    faceFrameCount,
    masterSha256: hash(master),
    previewSha256: hash(preview),
    neutralBounds: outputs.neutralBounds,
    neutralPose: outputs.neutralPose,
    coordinates: outputs.coordinates,
    layers,
  }, null, 2) + '\n');
} finally {
  await browser.close();
}
