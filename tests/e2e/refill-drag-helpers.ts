import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export type Cell = { row: number; col: number };

export async function setupDragBoard(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/src/view/board-view.ts';
    const { BoardView } = await import(path);
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({ id: `${row}-${col}`, level: (row + col) % 5 })));
    const mount = document.createElement('div');
    mount.id = 'drag-test-board';
    Object.assign(mount.style, { position: 'fixed', left: '20px', top: '20px', width: 'min(80vw, 600px)', zIndex: '1000' });
    document.body.append(mount);
    const moves: Array<{ first: Cell; second: Cell }> = [];
    const control = { allowed: true };
    const view = new BoardView(mount, board, (first: Cell, second: Cell) => moves.push({ first, second }), () => control.allowed);
    (window as unknown as { dragTest: unknown }).dragTest = { view, board, moves, control };
  });
  await expect(page.locator('#drag-test-board canvas')).toBeVisible();
  await page.locator('#drag-test-board canvas').evaluate(canvas => {
    (canvas as HTMLCanvasElement).style.width = '100%';
    (canvas as HTMLCanvasElement).style.height = 'auto';
  });
  await expect.poll(() => piecePosition(page, { row: 0, col: 0 })).toEqual({ x: 50, y: 50 });
}

export async function cellPoint(page: Page, cell: Cell): Promise<{ x: number; y: number }> {
  const bounds = await page.locator('#drag-test-board canvas').boundingBox();
  if (!bounds) throw new Error('Test board canvas has no bounds');
  return { x: bounds.x + bounds.width * (cell.col + .5) / 8, y: bounds.y + bounds.height * (cell.row + .5) / 8 };
}

export async function piecePosition(page: Page, cell: Cell): Promise<{ x: number; y: number }> {
  return page.evaluate(({ row, col }) => {
    const { view } = (window as unknown as { dragTest: { view: { pieces: Array<{ x: number; y: number }> } } }).dragTest;
    const piece = view.pieces[row * 8 + col];
    return piece ? { x: piece.x, y: piece.y } : null;
  }, cell) as Promise<{ x: number; y: number }>;
}

export async function dragState(page: Page): Promise<{ moves: Array<{ first: Cell; second: Cell }>; board: unknown }> {
  return page.evaluate(() => {
    const { moves, board } = (window as unknown as { dragTest: { moves: Array<{ first: Cell; second: Cell }>; board: unknown } }).dragTest;
    return { moves, board: structuredClone(board) };
  });
}

export async function moveToCell(page: Page, cell: Cell): Promise<void> {
  const point = await cellPoint(page, cell);
  await page.mouse.move(point.x, point.y);
}