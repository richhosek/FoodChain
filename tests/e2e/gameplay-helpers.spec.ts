import { expect, test } from '@playwright/test';
import type { BoardView as BoardViewType } from '../../src/view/board-view.ts';
import type { Position } from '../../src/game/creature.ts';
import { boardLevels, readLevels, startWithLevels, swap } from './helpers.ts';

const winningBoard = boardLevels([[2, 2], [2, 3], [2, 4], [3, 2], [4, 2]]);
const oneReactingGroupBoard = boardLevels([[2, 2], [2, 3], [2, 4]]);
const apexBoard = Array.from({ length: 64 }, () => 0);
apexBoard[3 * 8 + 3] = 3;
for (const [row, col] of [[2, 3], [3, 4], [4, 3], [3, 1]]) apexBoard[row * 8 + col] = 4;
apexBoard[61] = 1;
apexBoard[62] = 2;
const noMoveRefill = Array.from({ length: 64 }, (_, index) => (Math.floor(index / 8) + index % 8) % 2 === 0 ? 0 : .9);

async function settleWithoutMoves(page: import('@playwright/test').Page): Promise<void> {
  await startWithLevels(page, apexBoard, noMoveRefill, 123);
  await swap(page, { row: 3, col: 1 }, { row: 3, col: 2 });
}

async function exhaustFreeMoves(page: import('@playwright/test').Page): Promise<void> {
  await settleWithoutMoves(page);
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  const swaps = [
    [{ row: 0, col: 0 }, { row: 1, col: 0 }],
    [{ row: 0, col: 0 }, { row: 1, col: 0 }],
    [{ row: 0, col: 0 }, { row: 1, col: 0 }],
  ] as const;
  for (const [index, [first, second]] of swaps.entries()) {
    await swap(page, first, second);
    await expect(page.getByTestId('turns')).toHaveText(String(index + 2));
    await expect(page.getByTestId('free-moves')).toHaveText(String(2 - index));
  }
}

test('lost level shows a dismissible failure dialog and reset clears it', async ({ page }) => {
  await exhaustFreeMoves(page);
  const dialog = page.getByRole('dialog', { name: 'Level failed' });
  await expect(dialog).toBeVisible();
  const before = { levels: await readLevels(page), turns: await page.getByTestId('turns').textContent(), freeMoves: await page.getByTestId('free-moves').textContent() };
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  expect(await readLevels(page)).toEqual(before.levels);
  await expect(page.getByTestId('turns')).toHaveText(before.turns!);
  await expect(page.getByTestId('free-moves')).toHaveText(before.freeMoves!);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('free-moves')).toHaveText('3');
});

test('failure dialog can be dismissed with Escape', async ({ page }) => {
  await exhaustFreeMoves(page);
  const dialog = page.getByRole('dialog', { name: 'Level failed' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('No moves left. Reset to try again.');
});

test('failure dialog does not appear while free moves or reacting swaps remain', async ({ page }) => {
  await startWithLevels(page, oneReactingGroupBoard);
  const dialog = page.getByRole('dialog', { name: 'Level failed' });
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('free-moves')).toHaveText('3');
  await startWithLevels(page, winningBoard);
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('free-moves')).toHaveText('3');
});

test('idle move hint flashes a legal participant without changing game state', async ({ page }) => {
  await page.clock.install();
  await startWithLevels(page, winningBoard);
  await page.evaluate(async () => {
    const viewPath = '/src/view/board-view.ts';
    const { BoardView } = await import(viewPath);
    const original = BoardView.prototype.hint;
    (window as unknown as { hints: Array<{ row: number; col: number }> }).hints = [];
    (window as unknown as { hintComplete: boolean }).hintComplete = false;
    BoardView.prototype.hint = async function (this: BoardViewType, position: Position, signal: AbortSignal) {
      (window as unknown as { hints: Array<{ row: number; col: number }> }).hints.push(position);
      try { await original.call(this, position, signal); }
      finally { (window as unknown as { hintComplete: boolean }).hintComplete = true; }
    };
  });
  const before = { levels: await readLevels(page), turns: await page.getByTestId('turns').textContent(), freeMoves: await page.getByTestId('free-moves').textContent(), removed: await page.getByTestId('removed').textContent() };
  await page.clock.runFor(10_050);
  await expect.poll(() => page.evaluate(() => (window as unknown as { hints: unknown[] }).hints.length)).toBe(1);
  await page.clock.runFor(600);
  await expect.poll(() => page.evaluate(() => (window as unknown as { hintComplete: boolean }).hintComplete)).toBe(true);
  const hints = await page.evaluate(() => (window as unknown as { hints: Array<{ row: number; col: number }> }).hints);
  expect(hints[0].row).toBeGreaterThanOrEqual(0);
  expect(hints[0].row).toBeLessThan(8);
  expect(hints[0].col).toBeGreaterThanOrEqual(0);
  expect(hints[0].col).toBeLessThan(8);
  expect(await readLevels(page)).toEqual(before.levels);
  await expect(page.getByTestId('turns')).toHaveText(before.turns!);
  await expect(page.getByTestId('free-moves')).toHaveText(before.freeMoves!);
  await expect(page.getByTestId('removed')).toHaveText(before.removed!);
  await page.clock.runFor(10_600);
  await expect.poll(() => page.evaluate(() => (window as unknown as { hints: unknown[] }).hints.length)).toBe(2);
  await page.clock.runFor(600);
  expect(await readLevels(page)).toEqual(before.levels);
});

test('starting a move cancels the pending idle hint timer', async ({ page }) => {
  await page.clock.install();
  await startWithLevels(page, winningBoard);
  await page.evaluate(async () => {
    const viewPath = '/src/view/board-view.ts';
    const { BoardView } = await import(viewPath);
    (window as unknown as { hintCount: number }).hintCount = 0;
    BoardView.prototype.hint = async function () { (window as unknown as { hintCount: number }).hintCount++; };
  });
  await page.clock.runFor(9000);
  await swap(page, { row: 3, col: 3 }, { row: 3, col: 4 });
  await expect(page.getByTestId('turns')).toHaveText('1');
  await page.clock.runFor(1500);
  expect(await page.evaluate(() => (window as unknown as { hintCount: number }).hintCount)).toBe(0);
});

test('starting a move cancels an active creature hint', async ({ page }) => {
  await page.clock.install();
  await startWithLevels(page, winningBoard);
  await page.evaluate(async () => {
    const viewPath = '/src/view/board-view.ts';
    const { BoardView } = await import(viewPath);
    const original = BoardView.prototype.hint;
    (window as unknown as { hintStarted: number; hintAborted: boolean }).hintStarted = 0;
    (window as unknown as { hintStarted: number; hintAborted: boolean }).hintAborted = false;
    (window as unknown as { hintComplete: boolean }).hintComplete = false;
    BoardView.prototype.hint = async function (this: BoardViewType, position: Position, signal: AbortSignal) {
      (window as unknown as { hintStarted: number; hintAborted: boolean }).hintStarted++;
      try { await original.call(this, position, signal); }
      catch (error) {
        if (signal.aborted) (window as unknown as { hintStarted: number; hintAborted: boolean }).hintAborted = true;
        throw error;
      } finally {
        (window as unknown as { hintComplete: boolean }).hintComplete = true;
      }
    };
  });
  await page.clock.runFor(10_000);
  await expect.poll(() => page.evaluate(() => (window as unknown as { hintStarted: number }).hintStarted)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { hintComplete: boolean }).hintComplete)).toBe(false);
  await swap(page, { row: 3, col: 3 }, { row: 3, col: 4 });
  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect.poll(() => page.evaluate(() => (window as unknown as { hintAborted: boolean }).hintAborted)).toBe(true);
});

test('idle board with no reacting swaps flashes Free Moves while preserving its value', async ({ page }) => {
  await page.clock.install();
  await settleWithoutMoves(page);
  await page.clock.runFor(20_000);
  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect(page.getByTestId('free-moves')).toHaveText('3');
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');

  const freeMovesStat = page.getByTestId('free-moves').locator('..');
  await freeMovesStat.evaluate(element => {
    const state = window as unknown as { freeFlashSeen: boolean; freeFlashObserver: MutationObserver };
    state.freeFlashSeen = false;
    state.freeFlashObserver = new MutationObserver(() => {
      if (element.classList.contains('hint-flash')) state.freeFlashSeen = true;
    });
    state.freeFlashObserver.observe(element, { attributes: true, attributeFilter: ['class'] });
  });
  await page.clock.runFor(10_100);
  await expect.poll(() => page.evaluate(() => (window as unknown as { freeFlashSeen: boolean }).freeFlashSeen)).toBe(true);
  await freeMovesStat.evaluate(() => (window as unknown as { freeFlashObserver: MutationObserver }).freeFlashObserver.disconnect());
  await expect(page.getByTestId('free-moves')).toHaveText('3');
  await expect(page.getByTestId('turns')).toHaveText('1');
});
