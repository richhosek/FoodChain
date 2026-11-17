import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function createProbe(page: Page, failedArt?: 'paramecium' | 'amoeba'): Promise<void> {
  await page.goto('/');
  await page.evaluate(async failed => {
    if (failed) {
      const original = HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode = function () {
        if (this.src.includes(failed === 'paramecium' ? '/paramecium/body.png' : '/amoeba/body-frame-00.png')) {
          return Promise.reject(new Error(`Simulated ${failed} decode failure`));
        }
        return original.call(this);
      };
    }
    const path = '/src/view/board-view.ts';
    const { BoardView } = await import(path);
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `access-${row}-${col}`, level: row === 0 && col < 2 ? col : 4,
    })));
    const mount = document.createElement('div');
    Object.assign(mount.style, { position: 'fixed', left: '10px', top: '10px', width: 'min(80vw, 600px)', zIndex: '1000' });
    document.body.append(mount);
    const moves: unknown[] = [];
    const view = new BoardView(mount, board, (...args: unknown[]) => moves.push(args), () => true);
    (window as any).sizingAccess = { view, mount, moves };
  }, failedArt);
  await expect.poll(() => page.evaluate(() => {
    const view = (window as any).sizingAccess.view;
    return [view.assetStatus, view.amoebaAssetStatus];
  }), { timeout: 30_000 }).toEqual([
    failedArt === 'paramecium' ? 'unavailable' : 'ready',
    failedArt === 'amoeba' ? 'unavailable' : 'ready',
  ]);
  await page.evaluate(() => {
    const canvas = (window as any).sizingAccess.mount.querySelector('canvas') as HTMLCanvasElement;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
  });
}

test('startup and live reduced motion freeze both ranks and resume their existing states', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await createProbe(page);
  const states = () => page.evaluate(() => {
    const view = (window as any).sizingAccess.view;
    return [view.parameciumStates.get('access-0-0').elapsedSeconds, view.amoebaStates.get('access-0-1').elapsedSeconds];
  });
  const initial = await states();
  await page.waitForTimeout(500);
  expect(await states()).toEqual(initial);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(async () => (await states()).every((value, index) => value > initial[index] + 0.1)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  const frozen = await states();
  await page.waitForTimeout(500);
  expect(await states()).toEqual(frozen);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(async () => (await states()).every((value, index) => value > frozen[index] + 0.1)).toBe(true);
});

for (const failedArt of ['paramecium', 'amoeba'] as const) {
  test(`${failedArt} decode failure uses a correctly sized playable number`, async ({ page, isMobile }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await createProbe(page, failedArt);
    const fallback = await page.evaluate(failed => {
      const { view } = (window as any).sizingAccess;
      const col = failed === 'paramecium' ? 0 : 1;
      const label = view.cells.get(`0,${col}`).list[1];
      const canvas = label.canvas as HTMLCanvasElement;
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (!data[(y * canvas.width + x) * 4 + 3]) continue;
        left = Math.min(left, x); right = Math.max(right, x + 1);
        top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
      }
      return { text: label.text, longest: Math.max(right - left, bottom - top) * label.scaleX, centerX: label.x + ((left + right) / 2 - label.displayOriginX) * label.scaleX, centerY: label.y + ((top + bottom) / 2 - label.displayOriginY) * label.scaleY, uniform: label.scaleX === label.scaleY, aria: view.game.canvas.getAttribute('aria-label') };
    }, failedArt);
    const level = failedArt === 'paramecium' ? 0 : 1;
    expect(fallback.text).toBe(String(level));
    expect(fallback.longest).toBeCloseTo(75 + level * 5, 5);
    expect(fallback.centerX).toBeCloseTo(0, 5);
    expect(fallback.centerY).toBeCloseTo(0, 5);
    expect(fallback.uniform).toBe(true);
    expect(fallback.aria.toLowerCase()).toContain(`level ${level === 0 ? 'zero' : 'one'} creatures are numbered`);
    const box = await page.evaluate(() => {
      const rect = (window as any).sizingAccess.mount.querySelector('canvas').getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    for (const col of [0, 1]) {
      const x = box.x + box.width * (col + 0.05) / 8;
      const y = box.y + box.height * 0.05 / 8;
      if (isMobile) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
    }
    expect(await page.evaluate(() => (window as any).sizingAccess.moves)).toEqual([[{ row: 0, col: 0 }, { row: 0, col: 1 }]]);
  });
}

test('font resolution recalibrates a live fallback label to its rank', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const viewPath = '/src/view/board-view.ts';
    const labelPath = '/src/view/creature-label.ts';
    const { BoardView } = await import(viewPath);
    const { createCreatureLabelRenderer } = await import(labelPath);
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({ id: `${row}-${col}`, level: 4 })));
    const mount = document.createElement('div');
    document.body.append(mount);
    const view = new BoardView(mount, board, () => {}, () => false) as any;
    while (!view.scene) await new Promise(resolve => requestAnimationFrame(resolve));
    const renderer = createCreatureLabelRenderer(view.scene);
    const label = renderer.create('4', 100, .95, '#000', 'SizingLateFont, monospace');
    const measure = () => {
      const canvas = label.canvas as HTMLCanvasElement;
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (!data[(y * canvas.width + x) * 4 + 3]) continue;
        left = Math.min(left, x); right = Math.max(right, x + 1);
        top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
      }
      return { scale: label.scaleX, longest: Math.max(right - left, bottom - top) * label.scaleX };
    };
    const before = measure();
    const face = new FontFace('SizingLateFont', 'local("Arial")', { weight: '700' });
    document.fonts.add(face);
    const loaded = new Promise<void>(resolve => document.fonts.addEventListener('loadingdone', () => resolve(), { once: true }));
    await face.load();
    await loaded;
    const after = measure();
    document.fonts.delete(face);
    renderer.destroy();
    view.destroy();
    mount.remove();
    return { before, after };
  });
  expect(result.before.longest).toBeCloseTo(95, 5);
  expect(result.after.longest).toBeCloseTo(95, 5);
  expect(result.after.scale).not.toBe(result.before.scale);
});