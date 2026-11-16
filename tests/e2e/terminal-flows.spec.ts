import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { alternatingLevels, alternatingRefill, apexLevels, cascadeLevels, startWithLevels, swap } from './helpers.ts';

async function expectFreshSession(page: Page): Promise<void> {
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  await expect(page.getByTestId('removed')).toHaveText('0');
  await expect(page.getByTestId('turns')).toHaveText('0');
  await expect(page.getByTestId('free-moves')).toHaveText('3');
  await expect(page.getByTestId('target')).toHaveText('100');
}

test('winning through the board blocks further moves until reset', async ({ page }) => {
  await startWithLevels(page, alternatingLevels([[2, 2, 1], [2, 3, 1], [2, 4, 1], [3, 2, 1], [4, 2, 1], [3, 3, 0], [3, 4, 0]]), [], 123);
  await page.evaluate(async () => {
    const levelPath = '/src/game/level.ts';
    const { GameLevel } = await import(levelPath);
    const original = GameLevel.prototype.move;
    GameLevel.prototype.move = function (this: { current: { removed: number } }, ...args: unknown[]) {
      this.current.removed = 99;
      GameLevel.prototype.move = original;
      return original.apply(this, args);
    };
  });
  await swap(page, { row: 3, col: 3 }, { row: 3, col: 4 });
  await expect(page.getByRole('status')).toHaveText('Goal reached! Level complete.', { timeout: 20000 });
  await page.getByRole('dialog', { name: 'You Won' }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect.poll(async () => Number(await page.getByTestId('removed').textContent())).toBeGreaterThanOrEqual(100);
  const removed = await page.getByTestId('removed').textContent();
  await swap(page, { row: 0, col: 0 }, { row: 0, col: 1 });
  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect(page.getByTestId('removed')).toHaveText(removed!);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expectFreshSession(page);
  await swap(page, { row: 0, col: 0 }, { row: 0, col: 1 });
  await expect(page.getByTestId('turns')).toHaveText('1');
});

test('losing through the board blocks further moves until reset', async ({ page }) => {
  await startWithLevels(page, apexLevels(), alternatingRefill, 123);
  await swap(page, { row: 3, col: 1 }, { row: 3, col: 2 });
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.', { timeout: 15000 });
  await swap(page, { row: 0, col: 0 }, { row: 1, col: 0 });
  await expect(page.getByTestId('free-moves')).toHaveText('2');
  await swap(page, { row: 0, col: 0 }, { row: 1, col: 0 });
  await expect(page.getByTestId('free-moves')).toHaveText('1');
  await swap(page, { row: 0, col: 0 }, { row: 1, col: 0 });
  await expect(page.getByRole('status')).toHaveText('No moves left. Reset to try again.');
  await page.getByRole('dialog', { name: 'Level failed' }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByTestId('free-moves')).toHaveText('0');
  await expect(page.getByTestId('turns')).toHaveText('4');
  await swap(page, { row: 0, col: 0 }, { row: 0, col: 1 });
  await expect(page.getByTestId('turns')).toHaveText('4');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expectFreshSession(page);
  await swap(page, { row: 0, col: 0 }, { row: 0, col: 1 });
  await expect(page.getByTestId('turns')).toHaveText('1');
});

test('reset during falling cancels the old refill without stale updates', async ({ page }) => {
  await startWithLevels(page, cascadeLevels(), [.2, .2, .2], 10);
  await page.evaluate(async () => {
    const viewPath = '/src/view/board-view.ts';
    const { BoardView } = await import(viewPath);
    const original = BoardView.prototype.effect;
    BoardView.prototype.effect = function (this: unknown, event: { type: string; signal: AbortSignal }) {
      const pending: Promise<void> = original.call(this, event);
      if (event.type === 'refill') {
        (this as { scene: { tweens: { pauseAll: () => void } } }).scene.tweens.pauseAll();
        document.documentElement.dataset.refill = 'running';
        event.signal.addEventListener('abort', () => { document.documentElement.dataset.refill = 'aborted'; }, { once: true });
        pending.then(() => { document.documentElement.dataset.refill = 'finished'; }, () => {});
      }
      return pending;
    };
  });
  await swap(page, { row: 3, col: 3 }, { row: 3, col: 4 });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.refill)).toBe('running');
  await expect(page.getByRole('status')).toHaveText('Resolving the food chain...');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.refill)).toBe('aborted');
  await expectFreshSession(page);
  await page.waitForTimeout(800);
  await expectFreshSession(page);
});