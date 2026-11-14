import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type Position = { row: number; col: number };

async function startWithBoard(page: Page, predators: Array<[number, number]>): Promise<void> {
  const levels = Array.from({ length: 64 }, () => 0);
  for (const [row, col] of predators) levels[row * 8 + col] = 1;
  levels[7 * 8 + 5] = 2;
  levels[7 * 8 + 6] = 3;
  levels[7 * 8 + 7] = 4;
  await page.addInitScript((initialLevels: number[]) => {
    const values = [0, .4, .67, .84, .94];
    let index = 0;
    let state = 123;
    Math.random = () => {
      if (index < initialLevels.length) return values[initialLevels[index++]];
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }, levels);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const context = document.querySelector('canvas')!.getContext('2d')!;
    const colors = ['185,220,184', '241,211,148', '239,169,151', '169,205,208', '182,185,217'];
    return Array.from({ length: 64 }, (_, index) => {
      const color = Array.from(context.getImageData(index % 8 * 100 + 20, Math.floor(index / 8) * 100 + 20, 1, 1).data).slice(0, 3).join(',');
      return colors.indexOf(color);
    });
  })).toEqual(levels);
}

async function swap(page: Page, first: Position, second: Position): Promise<void> {
  const bounds = await page.locator('canvas').boundingBox();
  if (!bounds) throw new Error('Board canvas has no bounds');
  for (const position of [first, second]) {
    await page.mouse.click(bounds.x + bounds.width * (position.col + .5) / 8, bounds.y + bounds.height * (position.row + .5) / 8);
  }
}

async function expectFreshSession(page: Page): Promise<void> {
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  await expect(page.getByTestId('removed')).toHaveText('0');
  await expect(page.getByTestId('turns')).toHaveText('0');
  await expect(page.getByTestId('free-moves')).toHaveText('3');
  await expect(page.getByTestId('target')).toHaveText('10');
}

test('winning through the board blocks further moves until reset', async ({ page }) => {
  await startWithBoard(page, [[2, 2], [2, 3], [2, 4], [3, 2], [4, 2]]);
  await swap(page, { row: 3, col: 3 }, { row: 3, col: 4 });
  await expect(page.getByRole('status')).toHaveText('Goal reached! Level complete.');
  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect.poll(async () => Number(await page.getByTestId('removed').textContent())).toBeGreaterThanOrEqual(10);
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
  await startWithBoard(page, [[2, 2], [2, 3], [2, 4]]);
  await swap(page, { row: 2, col: 1 }, { row: 2, col: 2 });
  await expect(page.getByTestId('free-moves')).toHaveText('2');
  await swap(page, { row: 0, col: 0 }, { row: 0, col: 1 });
  await expect(page.getByTestId('free-moves')).toHaveText('1');
  await swap(page, { row: 0, col: 0 }, { row: 0, col: 1 });
  await expect(page.getByRole('status')).toHaveText('No moves left. Reset to try again.');
  await expect(page.getByTestId('free-moves')).toHaveText('0');
  await expect(page.getByTestId('turns')).toHaveText('3');
  await swap(page, { row: 0, col: 0 }, { row: 0, col: 1 });
  await expect(page.getByTestId('turns')).toHaveText('3');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expectFreshSession(page);
  await swap(page, { row: 0, col: 0 }, { row: 0, col: 1 });
  await expect(page.getByTestId('turns')).toHaveText('1');
});

test('reset during falling cancels the old refill without stale updates', async ({ page }) => {
  await startWithBoard(page, [[2, 2], [2, 3], [2, 4]]);
  await page.evaluate(async () => {
    const viewPath = '/src/view/board-view.ts';
    const { BoardView } = await import(viewPath);
    const original = BoardView.prototype.effect;
    BoardView.prototype.effect = function (this: unknown, event: { type: string; signal: AbortSignal }) {
      const pending: Promise<void> = original.call(this, event);
      if (event.type === 'refill') {
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