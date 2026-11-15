import { expect, test } from '@playwright/test';
import { cellPoint, dragState, moveToCell, piecePosition, setupDragBoard } from './refill-drag-helpers.ts';

test('two pointer taps still submit one neighboring move', async ({ page }) => {
  await setupDragBoard(page);
  const first = { row: 1, col: 1 }, second = { row: 1, col: 2 };
  for (const cell of [first, second]) {
    const point = await cellPoint(page, cell);
    await page.mouse.click(point.x, point.y);
  }
  expect((await dragState(page)).moves).toEqual([{ first, second }]);
});

test('a small movement across a cell boundary remains a tap', async ({ page }) => {
  await setupDragBoard(page);
  const center = await cellPoint(page, { row: 1, col: 1 });
  const bounds = await page.locator('#drag-test-board canvas').boundingBox();
  if (!bounds) throw new Error('Missing canvas');
  const edge = center.x + bounds.width / 16;
  await page.mouse.move(edge - 1, center.y);
  await page.mouse.down();
  await page.mouse.move(edge + 1, center.y);
  await page.mouse.up();
  await moveToCell(page, { row: 1, col: 2 });
  await page.mouse.click((await cellPoint(page, { row: 1, col: 2 })).x, center.y);
  expect((await dragState(page)).moves).toEqual([{ first: { row: 1, col: 1 }, second: { row: 1, col: 2 } }]);
});

test('drag coordinates follow the current canvas bounds after resize', async ({ page }) => {
  await setupDragBoard(page);
  const origin = { row: 3, col: 3 }, neighbor = { row: 3, col: 4 };
  await moveToCell(page, origin);
  await page.mouse.down();
  await page.locator('#drag-test-board').evaluate(element => { (element as HTMLElement).style.width = '200px'; });
  await moveToCell(page, neighbor);
  await expect.poll(() => piecePosition(page, origin)).toEqual({ x: 450, y: 350 });
  await expect.poll(() => piecePosition(page, neighbor)).toEqual({ x: 350, y: 350 });
  await page.mouse.up();
  expect((await dragState(page)).moves).toEqual([{ first: origin, second: neighbor }]);
});

test('touch taps and drag use the same preview and commit path', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touchscreen is configured for the mobile project');
  await setupDragBoard(page);
  const origin = { row: 3, col: 3 }, neighbor = { row: 3, col: 4 };
  const first = await cellPoint(page, origin), second = await cellPoint(page, neighbor);
  await page.touchscreen.tap(first.x, first.y);
  await page.touchscreen.tap(second.x, second.y);
  expect((await dragState(page)).moves).toEqual([{ first: origin, second: neighbor }]);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [second] });
  await expect.poll(() => piecePosition(page, origin)).toEqual({ x: 450, y: 350 });
  await expect.poll(() => piecePosition(page, neighbor)).toEqual({ x: 350, y: 350 });
  expect((await dragState(page)).moves).toHaveLength(1);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect((await dragState(page)).moves).toEqual([{ first: origin, second: neighbor }, { first: origin, second: neighbor }]);
});