import { expect, test } from '@playwright/test';
import { dragState, moveToCell, piecePosition, setupDragBoard } from './refill-drag-helpers.ts';
import type { Page } from '@playwright/test';

async function delayAmoebaImages(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    (window as unknown as { releaseAmoebaImages: () => void }).releaseAmoebaImages = release;
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this);
      if (this.src.includes('/assets/amoeba/')) await gate;
    };
  });
}

test('amoeba readiness during a drag preserves the preview and commits once', async ({ page }) => {
  test.setTimeout(60_000);
  await delayAmoebaImages(page);
  await setupDragBoard(page);
  await expect.poll(() => page.evaluate(() => (window as any).dragTest.view.amoebaAssetStatus)).toBe('loading');

  const origin = { row: 3, col: 3 }, neighbor = { row: 3, col: 4 };
  await moveToCell(page, origin);
  await page.mouse.down();
  await moveToCell(page, neighbor);
  await expect.poll(() => piecePosition(page, neighbor)).toEqual({ x: 350, y: 350 });
  await page.evaluate(() => (window as any).releaseAmoebaImages());
  await expect.poll(() => page.evaluate(() => (window as any).dragTest.view.amoebaAssetStatus), { timeout: 30_000 }).toBe('ready');

  expect(await piecePosition(page, origin)).toEqual({ x: 450, y: 350 });
  expect(await piecePosition(page, neighbor)).toEqual({ x: 350, y: 350 });
  expect((await dragState(page)).moves).toEqual([]);
  await page.mouse.up();
  expect((await dragState(page)).moves).toEqual([{ first: origin, second: neighbor }]);
  await expect.poll(() => page.evaluate(() => (window as any).dragTest.view.amoebae.size)).toBeGreaterThan(0);
});

test('pending readiness upgrades the replacement board and ignores a stale release', async ({ page }) => {
  test.setTimeout(60_000);
  await delayAmoebaImages(page);
  await setupDragBoard(page);
  const origin = { row: 3, col: 3 }, neighbor = { row: 3, col: 4 };
  await moveToCell(page, origin);
  await page.mouse.down();
  await moveToCell(page, neighbor);
  await expect.poll(() => piecePosition(page, neighbor)).toEqual({ x: 350, y: 350 });
  await page.evaluate(() => {
    const { view } = (window as any).dragTest;
    const replacement = Array.from({ length: 8 }, () => Array.from({ length: 8 }, (): { id: string; level: number } | null => null));
    replacement[0][0] = { id: 'replacement', level: 1 };
    view.render(replacement, new Set(['0,0']));
    (window as any).releaseAmoebaImages();
  });
  await expect.poll(() => page.evaluate(() => {
    const { view } = (window as any).dragTest;
    const entry = view.amoebae.get('replacement');
    return [view.amoebaAssetStatus, view.amoebae.size, entry?.inverted, entry?.piece === view.cells.get('0,0')];
  }), { timeout: 30_000 }).toEqual(['ready', 1, true, true]);
  await page.mouse.up();
  expect((await dragState(page)).moves).toEqual([]);
});

test('amoeba readiness preserves an active refill tween', async ({ page }) => {
  test.setTimeout(60_000);
  await delayAmoebaImages(page);
  await setupDragBoard(page);
  await page.evaluate(() => {
    const { view } = (window as any).dragTest;
    const board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, (): { id: string; level: number } | null => null));
    const creature = { id: 'falling-amoeba', level: 1 };
    board[1][0] = creature;
    const refill = { board, movements: [{ creature, from: { row: 0, col: 0 }, to: { row: 1, col: 0 } }], candidates: [] };
    const pending = view.effect({ type: 'refill', refill, signal: new AbortController().signal });
    view.scene.tweens.pauseAll();
    (window as any).refillReadiness = { pending, piece: view.pieces[0] };
    (window as any).releaseAmoebaImages();
  });
  await expect.poll(() => page.evaluate(() => {
    const { view } = (window as any).dragTest;
    const { piece } = (window as any).refillReadiness;
    return [view.amoebaAssetStatus, view.amoebae.get('falling-amoeba')?.piece === piece, piece.y];
  }), { timeout: 30_000 }).toEqual(['ready', true, 50]);
  const destination = await page.evaluate(async () => {
    const { view } = (window as any).dragTest;
    const { pending, piece } = (window as any).refillReadiness;
    view.scene.tweens.resumeAll();
    await pending;
    return piece.y;
  });
  expect(destination).toBe(150);
});