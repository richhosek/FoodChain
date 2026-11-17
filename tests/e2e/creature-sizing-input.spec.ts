import { expect, test } from '@playwright/test';
import type { Board } from '../../src/game/creature.ts';
import { cascadeLevels, startWithLevels, swap } from './helpers.ts';
import { dragState, piecePosition, setupDragBoard } from './refill-drag-helpers.ts';

test('all five ranks remain selectable at cell edges', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setupDragBoard(page);
  await expect.poll(() => page.evaluate(() => [(window as any).dragTest.view.assetStatus, (window as any).dragTest.view.amoebaAssetStatus]), { timeout: 30_000 }).toEqual(['ready', 'ready']);
  const canvas = page.locator('#drag-test-board canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Test board canvas has no bounds');

  for (let col = 0; col < 5; col++) {
    const x = bounds.x + bounds.width * (col + 0.02) / 8;
    const y = bounds.y + bounds.height * 0.02 / 8;
    if (isMobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await expect.poll(() => page.evaluate(() => (window as any).dragTest.view.selected)).toEqual({ row: 0, col });
    if (isMobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await expect.poll(() => page.evaluate(() => (window as any).dragTest.view.selected)).toBeNull();
  }
  expect((await dragState(page)).moves).toEqual([]);
});

test('edge-origin mouse drag cancels without changing the board', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setupDragBoard(page);
  await expect.poll(() => page.evaluate(() => [(window as any).dragTest.view.assetStatus, (window as any).dragTest.view.amoebaAssetStatus]), { timeout: 30_000 }).toEqual(['ready', 'ready']);
  const before = await dragState(page);
  const bounds = await page.locator('#drag-test-board canvas').boundingBox();
  if (!bounds) throw new Error('Test board canvas has no bounds');
  const x = bounds.x + bounds.width * 3.02 / 8;
  const y = bounds.y + bounds.height * 3.02 / 8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + bounds.width * 1.15 / 8, y);
  await expect.poll(() => piecePosition(page, { row: 3, col: 4 })).toEqual({ x: 350, y: 350 });
  await page.locator('#drag-test-board canvas').evaluate(canvas => canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })));
  await page.mouse.up();
  expect(await piecePosition(page, { row: 3, col: 3 })).toEqual({ x: 350, y: 350 });
  expect(await piecePosition(page, { row: 3, col: 4 })).toEqual({ x: 450, y: 350 });
  expect(await dragState(page)).toEqual(before);
});

test('edge-origin touch drag cancels without committing', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touchscreen requires the mobile project');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setupDragBoard(page);
  await expect.poll(() => page.evaluate(() => [(window as any).dragTest.view.assetStatus, (window as any).dragTest.view.amoebaAssetStatus]), { timeout: 30_000 }).toEqual(['ready', 'ready']);
  const before = await dragState(page);
  const bounds = await page.locator('#drag-test-board canvas').boundingBox();
  if (!bounds) throw new Error('Test board canvas has no bounds');
  const x = bounds.x + bounds.width * 3.02 / 8;
  const y = bounds.y + bounds.height * 3.02 / 8;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + bounds.width * 1.15 / 8, y }] });
  await expect.poll(() => piecePosition(page, { row: 3, col: 4 })).toEqual({ x: 350, y: 350 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect.poll(() => piecePosition(page, { row: 3, col: 4 })).toEqual({ x: 450, y: 350 });
  expect(await piecePosition(page, { row: 3, col: 3 })).toEqual({ x: 350, y: 350 });
  expect(await dragState(page)).toEqual(before);
  await cdp.detach();
});

test('seeded mouse and touch swaps commit identical identities and counters', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touchscreen requires the mobile project');
  const outcomes = [];
  for (const touch of [false, true]) {
    const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await startWithLevels(page, cascadeLevels(), [.2, .2, .2], 10);
    await page.evaluate(async () => {
      const gamePath = '/src/game/level.ts';
      const randomPath = '/src/game/random.ts';
      const viewPath = '/src/view/board-view.ts';
      const { GameLevel } = await import(gamePath);
      const { seededRandom } = await import(randomPath);
      const originalMove = GameLevel.prototype.move;
      GameLevel.prototype.move = function (...args: Parameters<typeof originalMove>) {
        const seeded = seededRandom(10);
        let draws = 0;
        (this as any).random = () => draws++ < 3 ? 0.2 : seeded();
        return originalMove.apply(this, args);
      };
      const { BoardView } = await import(viewPath);
      const originalCommit = BoardView.prototype.commitMove;
      BoardView.prototype.commitMove = function (board: Board) {
        (window as any).sizingCommitted = structuredClone(board);
        return originalCommit.call(this, board);
      };
    });
    await expect(page.locator('canvas')).toHaveAttribute('aria-label', /animated amoebae/, { timeout: 30_000 });
    await swap(page, { row: 3, col: 3 }, { row: 3, col: 4 }, touch);
    await expect(page.getByTestId('turns')).toHaveText('1');
    await expect(page.getByTestId('removed')).toHaveText('2');
    await expect.poll(() => page.evaluate(() => (window as any).sizingCommitted?.flat().length)).toBe(64);
    outcomes.push({
      board: await page.evaluate(() => (window as any).sizingCommitted),
      counters: await Promise.all(['removed', 'target', 'turns', 'free-moves'].map(id => page.getByTestId(id).textContent())),
    });
    await context.close();
  }
  expect(outcomes[0]).toEqual(outcomes[1]);
});