import { expect, test } from '@playwright/test';
import { cellPoint, dragState, moveToCell, piecePosition, setupDragBoard } from './refill-drag-helpers.ts';

for (const { origin, direction } of [
  { origin: { row: 0, col: 0 }, direction: { x: -1, y: -1 } },
  { origin: { row: 0, col: 7 }, direction: { x: 1, y: -1 } },
  { origin: { row: 7, col: 0 }, direction: { x: -1, y: 1 } },
  { origin: { row: 7, col: 7 }, direction: { x: 1, y: 1 } },
]) {
  test(`confines outward dragging at corner ${origin.row},${origin.col}`, async ({ page }) => {
    await setupDragBoard(page);
    const point = await cellPoint(page, origin);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + direction.x * 1000, point.y + direction.y * 1000);
    const position = await piecePosition(page, origin);
    expect(position.x).toBeGreaterThanOrEqual(origin.col * 100);
    expect(position.x).toBeLessThan((origin.col + 1) * 100);
    expect(position.y).toBeGreaterThanOrEqual(origin.row * 100);
    expect(position.y).toBeLessThan((origin.row + 1) * 100);
    await page.mouse.up();
    expect((await dragState(page)).moves).toEqual([]);
  });
}

test('capture keeps an outside release constrained to one neighbor and commits once', async ({ page }) => {
  await setupDragBoard(page);
  const origin = { row: 3, col: 1 }, neighbor = { row: 3, col: 0 };
  await moveToCell(page, origin);
  await page.mouse.down();
  await moveToCell(page, neighbor);
  await page.mouse.move(-100, (await cellPoint(page, neighbor)).y);
  const position = await piecePosition(page, origin);
  expect(position.x).toBeGreaterThanOrEqual(0);
  expect(position.x).toBeLessThan(100);
  expect(await piecePosition(page, neighbor)).toEqual({ x: 150, y: 350 });
  expect((await dragState(page)).moves).toEqual([]);
  await page.mouse.up();
  expect((await dragState(page)).moves).toEqual([{ first: origin, second: neighbor }]);
});

test('diagonal movement never previews a diagonal or nonadjacent creature', async ({ page }) => {
  await setupDragBoard(page);
  const origin = { row: 3, col: 3 };
  await moveToCell(page, origin);
  await page.mouse.down();
  await moveToCell(page, { row: 7, col: 7 });
  const position = await piecePosition(page, origin);
  const row = Math.floor(position.y / 100), col = Math.floor(position.x / 100);
  expect(Math.abs(row - origin.row) + Math.abs(col - origin.col)).toBeLessThanOrEqual(1);
  await page.mouse.up();
  const moves = (await dragState(page)).moves;
  expect(moves).toHaveLength(1);
  expect(Math.abs(moves[0].second.row - origin.row) + Math.abs(moves[0].second.col - origin.col)).toBe(1);
});