import { expect, test } from '@playwright/test';
import { boardLevels, startWithLevels, swap } from './helpers.ts';

test('collateral level-zero removals count toward the goal', async ({ page }) => {
  const levels = boardLevels([[2, 2], [2, 3], [2, 4], [3, 2], [4, 2]]);
  await startWithLevels(page, levels);
  await swap(page, { row: 3, col: 3 }, { row: 3, col: 4 });
  await expect(page.getByRole('status')).toHaveText('Goal reached! Level complete.');
  await expect(page.getByTestId('removed')).toHaveText('20');
  await expect(page.getByTestId('target')).toHaveText('10');
  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect(page.getByTestId('free-moves')).toHaveText('3');
});

test('apex scores every level-zero creature once', async ({ page }) => {
  const levels = boardLevels([]);
  for (const [row, col] of [[2, 2], [2, 3], [2, 4]]) levels[row * 8 + col] = 4;
  levels[3 * 8 + 3] = 3;
  levels[3 * 8 + 4] = 3;
  levels[0] = 1;
  await startWithLevels(page, levels);
  await swap(page, { row: 3, col: 3 }, { row: 3, col: 4 });
  await expect(page.getByRole('status')).toHaveText('Goal reached! Level complete.');
  await expect(page.getByTestId('removed')).toHaveText(String(levels.filter(level => level === 0).length));
  await expect(page.getByTestId('target')).toHaveText('10');
  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect(page.getByTestId('free-moves')).toHaveText('3');
});