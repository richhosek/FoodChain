import { expect, test } from '@playwright/test';
import { alternatingLevels, alternatingRefill, apexLevels, startWithLevels, swap } from './helpers.ts';

test('collateral level-zero removals count toward the goal', async ({ page }) => {
  const levels = alternatingLevels([[2, 2, 1], [2, 3, 1], [2, 4, 1], [3, 2, 1], [4, 2, 1], [3, 3, 0], [3, 4, 0]]);
  await startWithLevels(page, levels, [], 123);
  await swap(page, { row: 3, col: 3 }, { row: 3, col: 4 });
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.', { timeout: 20000 });
  await expect(page.getByTestId('removed')).toHaveText('11');
  await expect(page.getByTestId('target')).toHaveText('100');
  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect(page.getByTestId('free-moves')).toHaveText('3');
});

test('apex scores every level-zero creature once', async ({ page }) => {
  const levels = apexLevels();
  await startWithLevels(page, levels, alternatingRefill, 123);
  await swap(page, { row: 3, col: 1 }, { row: 3, col: 2 });
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.', { timeout: 15000 });
  await expect(page.getByTestId('removed')).toHaveText(String(levels.filter(level => level === 0).length));
  await expect(page.getByTestId('target')).toHaveText('100');
  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect(page.getByTestId('free-moves')).toHaveText('3');
});