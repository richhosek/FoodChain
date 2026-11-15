import { expect, test } from '@playwright/test';
import { cellPoint, dragState, moveToCell, piecePosition, setupDragBoard } from './refill-drag-helpers.ts';

test('previews a neighbor and restores it before release without changing the board', async ({ page }) => {
  await setupDragBoard(page);
  const origin = { row: 3, col: 3 };
  const neighbor = { row: 3, col: 4 };
  const initial = await dragState(page);
  await page.mouse.move(...Object.values(await cellPoint(page, origin)) as [number, number]);
  await page.mouse.down();
  await page.mouse.move(...Object.values(await cellPoint(page, neighbor)) as [number, number]);
  await expect.poll(() => piecePosition(page, origin)).toEqual({ x: 450, y: 350 });
  await expect.poll(() => piecePosition(page, neighbor)).toEqual({ x: 350, y: 350 });
  expect(await dragState(page)).toEqual(initial);
  await page.mouse.move(...Object.values(await cellPoint(page, origin)) as [number, number]);
  await expect.poll(() => piecePosition(page, origin)).toEqual({ x: 350, y: 350 });
  await expect.poll(() => piecePosition(page, neighbor)).toEqual({ x: 450, y: 350 });
  expect(await dragState(page)).toEqual(initial);
  await page.mouse.up();
  expect(await dragState(page)).toEqual(initial);
});

test('switches neighbors and submits only the final preview', async ({ page }) => {
  await setupDragBoard(page);
  const origin = { row: 3, col: 3 }, right = { row: 3, col: 4 }, above = { row: 2, col: 3 };
  const initial = await dragState(page);
  const counters = await Promise.all(['turns', 'free-moves', 'removed'].map(id => page.getByTestId(id).textContent()));
  await moveToCell(page, origin);
  await page.mouse.down();
  await moveToCell(page, right);
  await expect.poll(() => piecePosition(page, right)).toEqual({ x: 350, y: 350 });
  await moveToCell(page, above);
  await expect.poll(() => piecePosition(page, right)).toEqual({ x: 450, y: 350 });
  await expect.poll(() => piecePosition(page, above)).toEqual({ x: 350, y: 350 });
  expect(await dragState(page)).toEqual(initial);
  expect(await Promise.all(['turns', 'free-moves', 'removed'].map(id => page.getByTestId(id).textContent()))).toEqual(counters);
  await page.mouse.up();
  expect((await dragState(page)).moves).toEqual([{ first: origin, second: above }]);
  expect(await piecePosition(page, origin)).toEqual({ x: 350, y: 350 });
  expect(await piecePosition(page, above)).toEqual({ x: 350, y: 250 });
});

test('retains the grab offset and follows partial movement inside the origin', async ({ page }) => {
  await setupDragBoard(page);
  const center = await cellPoint(page, { row: 3, col: 3 });
  const bounds = await page.locator('#drag-test-board canvas').boundingBox();
  if (!bounds) throw new Error('Missing canvas');
  const scale = bounds.width / 800;
  await page.mouse.move(center.x + 10 * scale, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 30 * scale, center.y);
  await expect.poll(async () => (await piecePosition(page, { row: 3, col: 3 })).x).toBeCloseTo(370, 2);
  expect((await piecePosition(page, { row: 3, col: 3 })).y).toBeCloseTo(350, 2);
  expect((await dragState(page)).moves).toEqual([]);
  await page.mouse.up();
  expect((await dragState(page)).moves).toEqual([]);
});