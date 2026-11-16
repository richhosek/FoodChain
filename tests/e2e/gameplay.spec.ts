import { expect, test } from '@playwright/test';
import { alternatingLevels, boardLevels, cascadeLevels, readLevels, startWithLevels, swap } from './helpers.ts';

test('all 64 cells display their creature level', async ({ page }) => {
  const levels = boardLevels([[2, 2], [2, 3], [2, 4]]);
  await startWithLevels(page, levels);
  await page.evaluate(async () => {
    const viewPath = '/src/view/board-view.ts';
    const { BoardView } = await import(viewPath);
    const original = BoardView.prototype.render;
    BoardView.prototype.render = function (this: { pieces: Array<{ list: Array<{ text?: string }> }> }, ...args: unknown[]) {
      original.apply(this, args);
      (window as unknown as { labels: Array<string | undefined> }).labels = this.pieces.map(piece => piece.list[1].text);
    };
  });
  const bounds = await page.locator('canvas').boundingBox();
  if (!bounds) throw new Error('Board canvas has no bounds');
  await page.mouse.click(bounds.x + bounds.width / 16, bounds.y + bounds.height / 16);
  const labels = await page.evaluate(() => (window as unknown as { labels: string[] }).labels);
  expect(labels).toEqual(levels.map(String));
});

test('moving a predator into a stationary prey group triggers the reaction', async ({ page }) => {
  const levels = alternatingLevels([[0, 2, 1], [0, 3, 1], [0, 4, 1], [3, 3, 0], [2, 3, 1], [3, 4, 1], [5, 3, 1], [4, 3, 0]]);
  await startWithLevels(page, levels, [.5019920116756111, .9174868050031364, .6913183077704161], 10);

  await swap(page, { row: 5, col: 3 }, { row: 4, col: 3 });

  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect(page.getByTestId('removed')).toHaveText('1');
  await expect(page.getByTestId('free-moves')).toHaveText('3');
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  await expect.poll(() => readLevels(page)).not.toContain(-1);
});

test('mouse and touch taps produce identical board pixels and score', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touchscreen is configured for the mobile project');
  const levels = cascadeLevels();
  const outcomes = [];
  for (const touch of [false, true]) {
    await startWithLevels(page, levels, [.2, .2, .2], 10);
    await page.evaluate(() => document.fonts.ready);
    await swap(page, { row: 3, col: 3 }, { row: 3, col: 4 }, touch);
    await expect(page.getByTestId('turns')).toHaveText('1');
    await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
    await expect(page.getByTestId('removed')).toHaveText('2');
    await expect.poll(() => readLevels(page)).not.toContain(-1);
    outcomes.push({
      pixels: await page.locator('canvas').evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL()),
      score: await Promise.all(['removed', 'target', 'turns', 'free-moves'].map(id => page.getByTestId(id).textContent())),
    });
  }
  expect(outcomes[0]).toEqual(outcomes[1]);
});