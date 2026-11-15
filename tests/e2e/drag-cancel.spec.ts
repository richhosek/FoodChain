import { expect, test } from '@playwright/test';
import { dragState, moveToCell, piecePosition, setupDragBoard } from './refill-drag-helpers.ts';

for (const cancellation of ['pointercancel', 'lostpointercapture', 'blur', 'hidden', 'clearSelection', 'render', 'permission'] as const) {
  test(`${cancellation} cancels the preview and ignores a stale release`, async ({ page }) => {
    await setupDragBoard(page);
    const origin = { row: 3, col: 3 }, neighbor = { row: 3, col: 4 };
    await moveToCell(page, origin);
    await page.mouse.down();
    await moveToCell(page, neighbor);
    await expect.poll(() => piecePosition(page, neighbor)).toEqual({ x: 350, y: 350 });
    await page.evaluate(kind => {
      const { view, board, control } = (window as unknown as { dragTest: { view: { clearSelection(): void; render(board: unknown): void }; board: unknown; control: { allowed: boolean } } }).dragTest;
      const canvas = document.querySelector('#drag-test-board canvas')!;
      if (kind === 'pointercancel' || kind === 'lostpointercapture') canvas.dispatchEvent(new PointerEvent(kind, { pointerId: 1 }));
      else if (kind === 'blur') window.dispatchEvent(new Event('blur'));
      else if (kind === 'hidden') {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      } else if (kind === 'clearSelection') view.clearSelection();
      else if (kind === 'render') view.render(board);
      else control.allowed = false;
    }, cancellation);
    await page.mouse.up();
    expect(await piecePosition(page, origin)).toEqual({ x: 350, y: 350 });
    expect(await piecePosition(page, neighbor)).toEqual({ x: 450, y: 350 });
    expect((await dragState(page)).moves).toEqual([]);
  });
}

test('secondary pointers cannot change or cancel the owning gesture', async ({ page }) => {
  await setupDragBoard(page);
  const origin = { row: 3, col: 3 }, neighbor = { row: 3, col: 4 };
  await moveToCell(page, origin);
  await page.mouse.down();
  await moveToCell(page, neighbor);
  await page.evaluate(() => {
    const canvas = document.querySelector('#drag-test-board canvas')!;
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
      canvas.dispatchEvent(new PointerEvent(type, { pointerId: 99, isPrimary: false, button: 0, clientX: 30, clientY: 30 }));
    }
  });
  expect(await piecePosition(page, neighbor)).toEqual({ x: 350, y: 350 });
  expect((await dragState(page)).moves).toEqual([]);
  await page.mouse.up();
  expect((await dragState(page)).moves).toEqual([{ first: origin, second: neighbor }]);
});

test('destroyed pieces and detached canvases cannot commit stale gestures', async ({ page }) => {
  for (const kind of ['piece', 'canvas'] as const) {
    await setupDragBoard(page);
    await moveToCell(page, { row: 3, col: 3 });
    await page.mouse.down();
    await moveToCell(page, { row: 3, col: 4 });
    await page.evaluate(target => {
      const { view } = (window as unknown as { dragTest: { view: { pieces: Array<{ destroy(): void }> } } }).dragTest;
      const canvas = document.querySelector('#drag-test-board canvas')!;
      if (target === 'piece') view.pieces[27].destroy();
      else canvas.remove();
      canvas.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 100, clientY: 100 }));
    }, kind);
    await page.mouse.up();
    expect((await dragState(page)).moves).toEqual([]);
  }
});

test('gesture state and capture are cleared before invoking the move callback', async ({ page }) => {
  await setupDragBoard(page);
  await page.evaluate(() => {
    const { view } = (window as unknown as { dragTest: { view: { gesture: unknown; onMove: (...args: unknown[]) => void } } }).dragTest;
    const original = view.onMove;
    view.onMove = (...args) => {
      const canvas = document.querySelector('#drag-test-board canvas') as HTMLCanvasElement;
      (window as unknown as { releaseState: unknown }).releaseState = { gesture: view.gesture, captured: canvas.hasPointerCapture(1) };
      original(...args);
    };
  });
  await moveToCell(page, { row: 3, col: 3 });
  await page.mouse.down();
  await moveToCell(page, { row: 3, col: 4 });
  await page.mouse.up();
  expect(await page.evaluate(() => (window as unknown as { releaseState: unknown }).releaseState)).toEqual({ gesture: null, captured: false });
  expect((await dragState(page)).moves).toHaveLength(1);
});