import { expect, test } from '@playwright/test';

test('paramecium motion envelope is contained without clipping', async ({ page, browser, browserName, isMobile }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  const report = await page.evaluate(async () => {
    const boardPath = '/src/view/board-view.ts';
    const assetsPath = '/src/view/paramecium-assets.ts';
    const sizingPath = '/src/view/creature-sizing.ts';
    const artworkPath = '/src/view/paramecium-view.ts';
    const motionPath = '/src/view/paramecium-motion.ts';
    const { BoardView } = await import(boardPath);
    const { parameciumLayerCanvas, parameciumNeutralBounds } = await import(assetsPath);
    const { creatureBoxTransform, creatureSizeFraction } = await import(sizingPath);
    const { createParameciumArtwork } = await import(artworkPath);
    const { createParameciumMotion } = await import(motionPath);
    const mount = document.createElement('div');
    document.body.append(mount);
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `envelope-${row}-${col}`, level: row === 0 && col === 0 ? 0 : 4,
    })));
    const view = new BoardView(mount, board, () => {}, () => false);
    await new Promise<void>((resolve, reject) => {
      const deadline = performance.now() + 15000;
      const check = () => {
        if (view.assetStatus === 'ready') resolve();
        else if (view.assetStatus === 'unavailable' || performance.now() > deadline) reject(new Error('Paramecium assets unavailable'));
        else setTimeout(check, 20);
      };
      check();
    });
    if (!parameciumNeutralBounds) throw new Error('Missing authored bounds');
    const transform = creatureBoxTransform(parameciumNeutralBounds, 100, creatureSizeFraction(0, 0));
    const state = createParameciumMotion('containment-probe');
    state.rotationFromDegrees = state.rotationTargetDegrees = 24;
    const artwork = createParameciumArtwork(view.scene, state, 100, false);
    artwork.advance(0.2, false);
    const body = artwork.container.list[0];
    const eye = artwork.container.getByName('paramecium-eye');
    const runtime = { bodyX: body.x, bodyY: body.y, bodyScale: body.scaleX,
      eyeX: eye.x, eyeY: eye.y, bodyRotation: artwork.container.rotation, eyeRotation: eye.rotation };
    artwork.container.destroy();
    const stepDegrees = 0.5;
    const surfaceSize = 192;
    const padding = 40;
    const eyeCenter = { x: 515, y: 266 };
    const extrema: Record<string, { value: number; layer: string; variant: string; angle: number; offset: number[] }> = {};
    const groupExtrema: Record<string, Record<string, number>> = {};
    const clipped: string[] = [];
    let minimumCompositeClearance = Infinity;
    let maximumRadius = 0;
    let testedConfigurations = 0;
    const surface = document.createElement('canvas');
    surface.width = surface.height = surfaceSize;
    const context = surface.getContext('2d', { willReadFrequently: true })!;
    type Point = { x: number; y: number };
    const hull = (points: Point[]): Point[] => {
      points.sort((first, second) => first.x - second.x || first.y - second.y);
      const cross = (origin: Point, first: Point, second: Point) =>
        (first.x - origin.x) * (second.y - origin.y) - (first.y - origin.y) * (second.x - origin.x);
      const lower: Point[] = [];
      const upper: Point[] = [];
      for (const point of points) {
        while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0) lower.pop();
        lower.push(point);
      }
      for (const point of points.reverse()) {
        while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0) upper.pop();
        upper.push(point);
      }
      return lower.slice(0, -1).concat(upper.slice(0, -1));
    };
    const record = (key: string, value: number, layer: string, variant: string, angle: number, offset: number[]) => {
      const family = layer.startsWith('cilia-') ? 'cilia' : layer.startsWith('detail-') ? 'details'
        : layer === 'body' ? 'body' : 'eye';
      const group = groupExtrema[`${variant}:${family}`] ??= {};
      if (group[key] === undefined || (key === 'left' || key === 'top' ? value < group[key]! : value > group[key]!)) group[key] = value;
      if (!extrema[key] || (key === 'left' || key === 'top' ? value < extrema[key]!.value : value > extrema[key]!.value)) {
        extrema[key] = { value, layer, variant, angle, offset };
      }
    };
    for (const inverted of [false, true]) {
      const variant = inverted ? 'inverse' : 'normal';
      const detailOffsets = (amplitude: number) => [-1, 1].flatMap(horizontal => [-1, 1].map(vertical =>
        [horizontal * amplitude / 8, vertical * amplitude * 0.7 / 8]));
      const gazeOffsets = [[0, 0], ...Array.from({ length: 8 }, (_, direction) => [
        39 * 1.5 * Math.cos(direction * Math.PI / 4) / 8,
        39 * 1.5 * Math.sin(direction * Math.PI / 4) / 8,
      ])];
      const eyeOffset = [(448 - eyeCenter.x) / 8, (448 - eyeCenter.y) / 8];
      const layers = [
        ...Array.from({ length: 32 }, (_, index) => ({ name: `cilia-${index}`, eye: false, offsets: [[0, 0]] })),
        { name: 'body', eye: false, offsets: [[0, 0]] },
        ...[3, 4, 5].map((amplitude, index) => ({ name: `detail-${index}`, eye: false, offsets: detailOffsets(amplitude) })),
        ...['eye', 'outline', ...Array.from({ length: 10 }, (_, index) => `lid-${index + 1}`)]
          .map(name => ({ name, eye: true, offsets: [eyeOffset] })),
        { name: 'pupil', eye: true, offsets: gazeOffsets.map(offset => [offset[0]! + eyeOffset[0]!, offset[1]! + eyeOffset[1]!]) },
      ];
      for (const layer of layers) for (const offset of layer.offsets) {
        testedConfigurations++;
        context.clearRect(0, 0, surfaceSize, surfaceSize);
        context.drawImage(parameciumLayerCanvas(view.scene, layer.name, inverted), padding + offset[0]!, padding + offset[1]!);
        const pixels = context.getImageData(0, 0, surfaceSize, surfaceSize).data;
        const points: Point[] = [];
        let outside = false;
        let touchesSurface = false;
        for (let y = 0; y < surfaceSize; y++) for (let x = 0; x < surfaceSize; x++) {
          if (!pixels[(y * surfaceSize + x) * 4 + 3]) continue;
          if (x < padding || x >= padding + 112 || y < padding || y >= padding + 112) outside = true;
          if (x === 0 || y === 0 || x === surfaceSize - 1 || y === surfaceSize - 1) touchesSurface = true;
          minimumCompositeClearance = Math.min(minimumCompositeClearance,
            x - padding, y - padding, padding + 111 - x, padding + 111 - y);
          points.push({ x: x - padding, y: y - padding }, { x: x + 1 - padding, y: y + 1 - padding },
            { x: x + 1 - padding, y: y - padding }, { x: x - padding, y: y + 1 - padding });
        }
        if (!points.length) throw new Error(`Empty layer ${variant} ${layer.name}`);
        if (outside || touchesSurface) clipped.push(`${variant}:${layer.name}:${offset.join(',')}:${touchesSurface ? 'surface' : 'composite'}`);
        const vertices = hull(points);
        for (let angleIndex = -48; angleIndex <= 48; angleIndex++) {
          const angle = angleIndex * stepDegrees;
          const radians = angle * Math.PI / 180;
          const cosine = Math.cos(radians), sine = Math.sin(radians);
          for (const point of vertices) {
            const localX = (point.x * 8 + transform.offsetX / transform.scale) * transform.scale;
            const localY = (point.y * 8 + transform.offsetY / transform.scale) * transform.scale;
            let x: number, y: number;
            if (layer.eye) {
              const pivotX = eyeCenter.x * transform.scale + transform.offsetX;
              const pivotY = eyeCenter.y * transform.scale + transform.offsetY;
              x = pivotX * cosine - pivotY * sine + (point.x * 8 - 448) * transform.scale;
              y = pivotX * sine + pivotY * cosine + (point.y * 8 - 448) * transform.scale;
              maximumRadius = Math.max(maximumRadius, Math.hypot(pivotX, pivotY));
            } else {
              x = localX * cosine - localY * sine;
              y = localX * sine + localY * cosine;
              maximumRadius = Math.max(maximumRadius, Math.hypot(localX, localY));
            }
            record('left', x, layer.name, variant, angle, offset);
            record('right', x, layer.name, variant, angle, offset);
            record('top', y, layer.name, variant, angle, offset);
            record('bottom', y, layer.name, variant, angle, offset);
          }
        }
      }
    }
    const rotationMargin = 2 * maximumRadius * Math.sin(stepDegrees * Math.PI / 180 / 4);
    const interpolationMargin = 2 * 8 * transform.scale;
    const margin = rotationMargin + interpolationMargin;
    const bounds = Object.fromEntries(Object.entries(extrema).map(([key, entry]) => [key, entry.value]));
    const conservativeBounds = { left: bounds.left! - margin, right: bounds.right! + margin,
      top: bounds.top! - margin, bottom: bounds.bottom! + margin };
    view.destroy();
    mount.remove();
    return { cellSize: 100, authoredBounds: parameciumNeutralBounds, transform, runtime, alphaThreshold: 1,
      ciliaFrames: 32, lidFrames: 10, gazeDirections: 8, testedConfigurations, stepDegrees,
      oversizedSurface: { width: surfaceSize, height: surfaceSize, compositeOrigin: padding, compositeSize: 112 },
      extrema, groupExtrema, maximumRadius, rotationMargin, interpolationMargin, conservativeBounds, clipped, minimumCompositeClearance,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio }, userAgent: navigator.userAgent };
  });
  const evidence = { browser: browserName, version: browser.version(), isMobile, ...report };
  const json = JSON.stringify(evidence, null, 2);
  console.log(`PARAMECIUM CONTAINMENT REPORT\n${json}`);
  await test.info().attach('paramecium-containment-report.json', { body: json, contentType: 'application/json' });
  expect(report.runtime.bodyScale).toBeCloseTo(report.transform.scale * 8, 10);
  expect(report.runtime.bodyX).toBeCloseTo(report.transform.offsetX + 448 * report.transform.scale, 10);
  expect(report.runtime.bodyY).toBeCloseTo(report.transform.offsetY + 448 * report.transform.scale, 10);
  expect(report.runtime.eyeX).toBeCloseTo(report.transform.offsetX + 515 * report.transform.scale, 10);
  expect(report.runtime.eyeY).toBeCloseTo(report.transform.offsetY + 266 * report.transform.scale, 10);
  expect(report.runtime.bodyRotation).toBeCloseTo(24 * Math.PI / 180, 10);
  expect(report.runtime.eyeRotation).toBeCloseTo(-report.runtime.bodyRotation, 10);
  expect(report.clipped, 'Unclipped oversized layers must fit their runtime composite canvases').toEqual([]);
  expect(report.minimumCompositeClearance, 'Allow one texture pixel for unsampled fractional offsets').toBeGreaterThanOrEqual(1);
  expect(report.conservativeBounds.left).toBeGreaterThanOrEqual(-50);
  expect(report.conservativeBounds.right).toBeLessThanOrEqual(50);
  expect(report.conservativeBounds.top).toBeGreaterThanOrEqual(-50);
  expect(report.conservativeBounds.bottom).toBeLessThanOrEqual(50);
});