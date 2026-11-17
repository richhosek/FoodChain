import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type Cell = { row: number; col: number; level: number };
type Ink = Cell & { left: number; top: number; right: number; bottom: number; width: number; height: number; sourceRatio: number | null };

const mixed: Cell[] = [
  ...[0, 1, 2, 3, 4, 0, 1, 2].map((level, col) => ({ row: 0, col, level })),
  { row: 7, col: 0, level: 3 }, { row: 7, col: 7, level: 4 },
];

async function measureBoard(page: Page, cells: Cell[]) {
  return page.evaluate(async cells => {
    const path = '/src/view/board-view.ts';
    const { BoardView } = await import(path);
    await document.fonts.ready;
    const mount = document.createElement('div');
    mount.className = 'board';
    mount.style.width = `${document.querySelector('#board')!.getBoundingClientRect().width}px`;
    document.body.append(mount);
    const board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null as any));
    for (const cell of cells) board[cell.row]![cell.col] = { id: `test-${cell.row}-${cell.col}`, level: cell.level };
    const view = new BoardView(mount, board, () => {}, () => false);
    const deadline = performance.now() + 30000;
    while (!view.scene || view.assetStatus === 'loading' || (cells.some(cell => cell.level === 1) && view.amoebaAssetStatus === 'loading')) {
      if (performance.now() > deadline) throw new Error('Timed out waiting for board artwork');
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    for (const cell of cells) {
      const id = `test-${cell.row}-${cell.col}`;
      if (cell.level === 0) {
        const state = view.parameciumStates.getOrCreate(id);
        state.ciliaPhase = 0;
        state.rotationFromDegrees = state.rotationTargetDegrees = 0;
        for (const detail of state.details) detail.amplitude = 0;
      }
      if (cell.level === 1) view.amoebaStates.getOrCreate(id).bodyFramePhase = 0;
    }
    const renderer = view.amoebaRenderer;
    const artCanvas = document.createElement('canvas');
    artCanvas.width = artCanvas.height = 800;
    const artContext = artCanvas.getContext('2d')!;
    const drawArtwork = renderer.context.drawImage.bind(renderer.context);
    renderer.context.drawImage = (...args: Parameters<CanvasRenderingContext2D['drawImage']>) => {
      (artContext.drawImage as Function)(...args);
      (drawArtwork as Function)(...args);
    };
    renderer.setEntries([]);
    view.render(board);
    const frames = async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    };
    await frames();
    const canvas = view.game.canvas as HTMLCanvasElement;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    const painted = context.getImageData(0, 0, 800, 800).data;
    for (const piece of view.cells.values()) {
      for (const child of piece.list.slice(1)) child.setVisible(false);
    }
    const artworkPixels = artContext.getImageData(0, 0, 800, 800).data;
    const originalDrawImage = renderer.context.drawImage;
    renderer.context.drawImage = () => {};
    renderer.setEntries([...view.amoebae.values()]);
    await frames();
    const background = context.getImageData(0, 0, 800, 800).data;
    renderer.context.drawImage = originalDrawImage;
    let emptyCellInkPixels = 0;
    const occupied = new Set(cells.map(cell => `${cell.row},${cell.col}`));
    for (let y = 0; y < 800; y++) for (let x = 0; x < 800; x++) {
      if (occupied.has(`${Math.floor(y / 100)},${Math.floor(x / 100)}`)) continue;
      const index = (y * 800 + x) * 4;
      if (Math.max(...[0, 1, 2].map(channel => Math.abs(painted[index + channel]! - background[index + channel]!))) >= 8) emptyCellInkPixels++;
    }
    const ink: Ink[] = cells.map(cell => {
      let left = 100, top = 100, right = 0, bottom = 0;
      for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) {
        const index = ((cell.row * 100 + y) * 800 + cell.col * 100 + x) * 4;
        const difference = Math.max(...[0, 1, 2].map(channel => Math.abs(painted[index + channel]! - background[index + channel]!)));
        if (cell.level === 1 && view.amoebaAssetStatus === 'ready' ? artworkPixels[index + 3]! < 128 : difference < 8) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
      }
      const label = view.cells.get(`${cell.row},${cell.col}`)?.list[1];
      let sourceRatio: number | null = null;
      if (label?.canvas && label?.context) {
        const source = label.context.getImageData(0, 0, label.canvas.width, label.canvas.height).data;
        let minX = label.canvas.width, minY = label.canvas.height, maxX = 0, maxY = 0;
        for (let y = 0; y < label.canvas.height; y++) for (let x = 0; x < label.canvas.width; x++) {
          if (!source[(y * label.canvas.width + x) * 4 + 3]) continue;
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + 1); maxY = Math.max(maxY, y + 1);
        }
        sourceRatio = (maxX - minX) / (maxY - minY);
      }
      return { ...cell, left, top, right, bottom, width: right - left, height: bottom - top, sourceRatio };
    });
    const result = {
      ink, assetStatus: view.assetStatus, amoebaAssetStatus: view.amoebaAssetStatus,
      occupied: view.cells.size, emptyCellInkPixels,
      displayWidth: canvas.getBoundingClientRect().width, displayHeight: canvas.getBoundingClientRect().height, devicePixelRatio,
      fonts: [...document.fonts].map(font => ({ family: font.family, status: font.status })),
    };
    view.destroy();
    mount.remove();
    return result;
  }, cells);
}

function verifyInk(ink: Ink[]) {
  for (const box of ink) {
    const description = `level ${box.level} at ${box.row},${box.col}: ${JSON.stringify(box)}`;
    expect.soft(box.width, description).toBeGreaterThan(0);
    expect.soft(box.height, description).toBeGreaterThan(0);
    expect.soft(Math.abs(Math.max(box.width, box.height) - (75 + 5 * box.level)), description).toBeLessThanOrEqual(1);
    expect.soft(Math.abs((box.left + box.right) / 2 - 50), description).toBeLessThanOrEqual(1);
    expect.soft(Math.abs((box.top + box.bottom) / 2 - 50), description).toBeLessThanOrEqual(1);
    const ratio = box.sourceRatio ?? (box.level === 0 ? 616.8 / 797 : 607.8125 / 563.375);
    expect.soft(Math.abs(box.width / box.height - ratio), description).toBeLessThanOrEqual(0.06);
  }
}

test('authored undeformed paramecium neutral pose has the correct board-pixel bounds', async ({ page }) => {
  test.setTimeout(90_000);
  const preview = await readFile(resolve('docs/art/paramecium-resting-preview.html'), 'utf8');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const result = await page.evaluate(async preview => {
    const path = '/src/view/board-view.ts';
    const { BoardView } = await import(path);
    const positions = [[0, 0], [0, 4], [0, 7], [4, 0], [4, 7], [7, 0], [7, 4], [7, 7]];
    const board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null as any));
    for (const [row, col] of positions) board[row]![col!] = { id: `neutral-${row}-${col}`, level: 0 };
    const mount = document.createElement('div');
    mount.className = 'board';
    mount.style.width = `${document.querySelector('#board')!.getBoundingClientRect().width}px`;
    document.body.append(mount);
    const view = new BoardView(mount, board, () => {}, () => false);
    const deadline = performance.now() + 30000;
    while (view.assetStatus === 'loading' || !view.scene) {
      if (performance.now() > deadline) throw new Error('Timed out waiting for paramecium artwork');
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (view.assetStatus !== 'ready') throw new Error('Paramecium artwork unavailable');
    const svg = new DOMParser().parseFromString(preview, 'text/html').querySelector('svg.creature')!;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('viewBox', '-64 -64 896 896');
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
    const image = new Image();
    try { image.src = url; await image.decode(); } finally { URL.revokeObjectURL(url); }
    const source = document.createElement('canvas');
    source.width = source.height = 896;
    source.getContext('2d')!.drawImage(image, 0, 0, 896, 896);
    for (const [row, col] of positions) {
      const piece = view.cells.get(`${row},${col}`);
      const artwork = piece.list[1];
      artwork.setRotation(0);
      const body = artwork.list[0];
      const eye = artwork.getByName('paramecium-eye');
      eye.setVisible(false);
      const texture = body.texture;
      const canvas = texture.getSourceImage() as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      context.clearRect(0, 0, 112, 112);
      context.drawImage(source, 0, 0, 112, 112);
      texture.refresh();
    }
    const frames = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await frames();
    const context = view.game.canvas.getContext('2d', { willReadFrequently: true })!;
    const painted = context.getImageData(0, 0, 800, 800).data;
    for (const piece of view.cells.values()) piece.list[1].setVisible(false);
    await frames();
    const background = context.getImageData(0, 0, 800, 800).data;
    const measurements = positions.map(([row, col]) => {
      let left = 100, top = 100, right = 0, bottom = 0;
      for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) {
        const index = (((row! * 100 + y) * 800) + col! * 100 + x) * 4;
        if (Math.max(...[0, 1, 2].map(channel => Math.abs(painted[index + channel]! - background[index + channel]!))) < 8) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
      }
      return { row, col, left, top, right, bottom, width: right - left, height: bottom - top, sourceRatio: 616.8 / 797, level: 0 };
    });
    const display = { width: view.game.canvas.getBoundingClientRect().width, devicePixelRatio };
    view.destroy();
    mount.remove();
    return { measurements, display };
  }, preview);
  console.log('AUTHORED NEUTRAL BOARD PIXELS', JSON.stringify(result));
  expect(result.display.width).toBeGreaterThan(0);
  verifyInk(result.measurements);
  expect(result.measurements.map(box => [box.width, box.height])).toEqual(result.measurements.map(() => [result.measurements[0]!.width, result.measurements[0]!.height]));
});

test('mixed board sampled ink follows the five ranks and retains the hierarchy key', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const result = await measureBoard(page, mixed);
  console.log('MIXED BOARD INK', JSON.stringify(result));
  test.info().annotations.push({ type: 'measurement', description: 'Amoeba uses alpha >= 128 on actual transparent board draw; other levels use RGB difference >= 8. Pixel-edge bounds on 800px canvas; level 0 uses cilia frame 0, not an undeformed cilia composite.' });
  expect(result.assetStatus).toBe('ready');
  expect(result.amoebaAssetStatus).toBe('ready');
  expect(result.displayWidth).toBeGreaterThan(0);
  expect(result.displayHeight).toBeCloseTo(result.displayWidth, 1);
  expect(result.fonts.some(font => font.family === 'Space Grotesk' && font.status === 'loaded'), 'Preferred web font must actually load').toBe(true);
  verifyInk(result.ink);
  for (const level of [0, 1, 2, 3, 4]) {
    const boxes = result.ink.filter(box => box.level === level);
    if (boxes.length > 1) expect.soft(boxes.map(box => [box.width, box.height])).toEqual(boxes.map(() => [boxes[0]!.width, boxes[0]!.height]));
  }
  const key = page.getByLabel('Creature levels from 0 to 4');
  await expect(key).toBeVisible();
  await expect(key.locator('span')).toHaveText(['0', '1', '2', '3', '4']);
});

test('sparse and empty boards keep the full-chain rank sizes', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const full = await measureBoard(page, mixed);
  const sparse = await measureBoard(page, [
    { row: 3, col: 2, level: 2 }, { row: 5, col: 5, level: 4 },
    { row: 7, col: 0, level: 2 },
  ]);
  const empty = await measureBoard(page, []);
  console.log('SPARSE BOARD INK', JSON.stringify(sparse));
  expect(sparse.occupied).toBe(3);
  expect(sparse.emptyCellInkPixels).toBe(0);
  expect(empty.occupied).toBe(0);
  expect(empty.emptyCellInkPixels).toBe(0);
  expect(empty.ink).toEqual([]);
  verifyInk(sparse.ink);
  for (const box of sparse.ink) {
    const reference = full.ink.find(candidate => candidate.level === box.level)!;
    expect.soft([box.width, box.height]).toEqual([reference.width, reference.height]);
  }
});

test('failed artwork and unavailable web fonts use correctly sized numbered fallbacks', async ({ page }) => {
  test.setTimeout(90_000);
  await page.route(/\/src\/assets\/(amoeba|paramecium)\/.*\.png/, route =>
    route.request().resourceType() === 'image' ? route.abort() : route.continue());
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const result = await measureBoard(page, mixed);
  console.log('FALLBACK BOARD INK', JSON.stringify(result));
  expect(result.assetStatus).toBe('unavailable');
  expect(result.amoebaAssetStatus).toBe('unavailable');
  expect(result.fonts.some(font => font.family === 'Space Grotesk' && font.status === 'loaded')).toBe(false);
  verifyInk(result.ink);
});

test('delayed artwork replaces numbered loading placeholders on the same board', async ({ page }) => {
  test.setTimeout(90_000);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/src\/assets\/(amoeba|paramecium)\/.*\.png/, async route => {
    if (route.request().resourceType() === 'image') await gate;
    await route.continue();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      const path = '/src/view/board-view.ts';
      const { BoardView } = await import(path);
      const mount = document.createElement('div');
      document.body.append(mount);
      const board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null as any));
      board[0]![0] = { id: 'loading-zero', level: 0 };
      board[0]![1] = { id: 'loading-one', level: 1 };
      (window as any).sizingLoadingProbe = new BoardView(mount, board, () => {}, () => false);
    });
    await expect.poll(() => page.evaluate(() => {
      const view = (window as any).sizingLoadingProbe;
      return view.scene && [view.assetStatus, view.amoebaAssetStatus, view.cells.get('0,0')?.list[1]?.text, view.cells.get('0,1')?.list[1]?.text];
    })).toEqual(['loading', 'loading', '0', '1']);
    release();
    await expect.poll(() => page.evaluate(() => {
      const view = (window as any).sizingLoadingProbe;
      return [view.assetStatus, view.amoebaAssetStatus, view.paramecia.size, view.amoebae.size];
    }), { timeout: 30000 }).toEqual(['ready', 'ready', 1, 1]);
    await page.evaluate(() => (window as any).sizingLoadingProbe.destroy());
  } finally {
    release();
  }
});