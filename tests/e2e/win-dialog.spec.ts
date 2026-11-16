import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameLevel, LevelEvent, LevelState } from '../../src/game/level.ts';
import type { Board, Position } from '../../src/game/creature.ts';
import { readLevels, startWithLevels, swap } from './helpers.ts';

const winningBoard = Array.from({ length: 64 }, (_, index) => (Math.floor(index / 8) * 2 + index % 8 * 3) % 5);
for (const [row, col] of [[2, 2], [2, 3], [2, 4], [3, 2], [4, 2]]) winningBoard[row * 8 + col] = 1;
winningBoard[3 * 8 + 3] = 0;
winningBoard[3 * 8 + 4] = 0;
const first = { row: 3, col: 3 };
const second = { row: 3, col: 4 };

async function prepare(page: Page): Promise<void> {
  await startWithLevels(page, winningBoard, [], 123);
  await page.evaluate(async () => {
    const levelPath = '/src/game/level.ts';
    const viewPath = '/src/view/board-view.ts';
    const { GameLevel } = await import(levelPath);
    const { BoardView } = await import(viewPath);
    const originalMove = GameLevel.prototype.move;
    const originalReset = GameLevel.prototype.reset;
    const originalRender = BoardView.prototype.render;
    const originalShowModal = HTMLDialogElement.prototype.showModal;
    const state = window as unknown as {
      releaseRefill?: () => void;
      refillPaused: boolean;
      lastRendered?: Board;
      renderBeforeWin?: boolean;
      winCount: number;
      level?: GameLevel;
      cancelMove?: () => void;
    };
    state.refillPaused = false;
    state.winCount = 0;
    let initialBoard: Board | undefined;
    GameLevel.prototype.move = function (this: GameLevel, from: Position, to: Position, effect?: (event: LevelEvent) => void | Promise<void>, signal?: AbortSignal) {
      const mutable = this as unknown as { current: LevelState; random: () => number };
      initialBoard ??= structuredClone(mutable.current.board);
      mutable.current.removed = 99;
      let randomState = 123;
      mutable.random = () => {
        randomState = (randomState + 0x6d2b79f5) >>> 0;
        let value = randomState;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      };
      state.level = this;
      const controller = new AbortController();
      state.cancelMove = () => controller.abort();
      signal?.addEventListener('abort', state.cancelMove, { once: true });
      return originalMove.call(this, from, to, async (event: LevelEvent) => {
        if (!state.refillPaused) await effect?.(event);
        if (event.type === 'refill' && !state.refillPaused) {
          state.refillPaused = true;
          await new Promise<void>(resolve => { state.releaseRefill = resolve; });
        }
      }, controller.signal);
    };
    GameLevel.prototype.reset = async function (this: GameLevel, signal?: AbortSignal) {
      await originalReset.call(this, signal);
      if (initialBoard) (this as unknown as { current: LevelState }).current.board = structuredClone(initialBoard);
      state.refillPaused = false;
    };
    BoardView.prototype.render = function (board: Board) {
      state.lastRendered = structuredClone(board);
      return originalRender.call(this, board);
    };
    HTMLDialogElement.prototype.showModal = function () {
      if (this.id === 'win-dialog') {
        state.winCount++;
        state.renderBeforeWin = state.level?.state.status === 'won' && JSON.stringify(state.lastRendered) === JSON.stringify(state.level.state.board);
      }
      return originalShowModal.call(this);
    };
  });
}

async function beginWin(page: Page, touch: boolean): Promise<void> {
  await swap(page, first, second, touch);
  await expect.poll(() => page.evaluate(() => (window as unknown as { refillPaused: boolean }).refillPaused)).toBe(true);
  await expect.poll(async () => Number(await page.getByTestId('removed').textContent())).toBeGreaterThanOrEqual(100);
  await expect(page.getByRole('dialog', { name: 'You Won' })).toBeHidden();
}

async function finishWin(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { releaseRefill: () => void }).releaseRefill());
  await expect(page.getByRole('dialog', { name: 'You Won' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { renderBeforeWin: boolean }).renderBeforeWin)).toBe(true);
  await expect(page.getByRole('dialog', { name: 'Level failed' })).toBeHidden();
}

for (const dismissal of ['close', 'Escape'] as const) {
  test(`win dialog waits for the final render and ${dismissal} preserves the terminal board`, async ({ page, isMobile }) => {
    await prepare(page);
    await expect(page.getByTestId('target')).toHaveText('100');
    await beginWin(page, isMobile);
    await finishWin(page);
    const dialog = page.getByRole('dialog', { name: 'You Won' });
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
    const before = { board: await readLevels(page), removed: await page.getByTestId('removed').textContent(), turns: await page.getByTestId('turns').textContent(), freeMoves: await page.getByTestId('free-moves').textContent() };
    if (dismissal === 'close' && isMobile) await dialog.getByRole('button', { name: 'Close' }).tap();
    else if (dismissal === 'close') await dialog.getByRole('button', { name: 'Close' }).click();
    else await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await swap(page, { row: 0, col: 0 }, { row: 0, col: 1 }, isMobile);
    expect(await readLevels(page)).toEqual(before.board);
    await expect(page.getByTestId('removed')).toHaveText(before.removed!);
    await expect(page.getByTestId('turns')).toHaveText(before.turns!);
    await expect(page.getByTestId('free-moves')).toHaveText(before.freeMoves!);
    await expect(page.getByRole('status')).toHaveText('Goal reached! Level complete.');
    expect(await page.evaluate(() => (window as unknown as { winCount: number }).winCount)).toBe(1);
  });
}

test('reset closes the dialog and a new epoch can win again', async ({ page, isMobile }) => {
  await prepare(page);
  await beginWin(page, isMobile);
  await finishWin(page);
  await page.getByRole('button', { name: 'Reset' }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByRole('dialog', { name: 'You Won' })).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  await expect(page.getByTestId('removed')).toHaveText('0');
  await beginWin(page, isMobile);
  await finishWin(page);
  expect(await page.evaluate(() => (window as unknown as { winCount: number }).winCount)).toBe(2);
});

test('reset during a winning refill cancels the obsolete win', async ({ page, isMobile }) => {
  await prepare(page);
  await beginWin(page, isMobile);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  await page.evaluate(() => (window as unknown as { releaseRefill: () => void }).releaseRefill());
  await expect(page.getByRole('dialog', { name: 'You Won' })).toBeHidden();
  await expect(page.getByTestId('removed')).toHaveText('0');
  expect(await page.evaluate(() => (window as unknown as { winCount: number }).winCount)).toBe(0);
});

test('cancelling a winning refill rolls back without showing a dialog', async ({ page, isMobile }) => {
  await prepare(page);
  await beginWin(page, isMobile);
  await page.evaluate(() => (window as unknown as { cancelMove: () => void }).cancelMove());
  await expect(page.getByTestId('turns')).toHaveText('0');
  await page.evaluate(() => (window as unknown as { releaseRefill: () => void }).releaseRefill());
  await expect(page.getByRole('dialog', { name: 'You Won' })).toBeHidden();
  await expect(page.getByTestId('removed')).toHaveText('99');
  await expect(page.getByTestId('target')).toHaveText('100');
  expect(await readLevels(page)).toEqual(winningBoard);
  expect(await page.evaluate(() => (window as unknown as { winCount: number }).winCount)).toBe(0);
});