import { expect, test } from '@playwright/test';
import { boardLevels, readLevels, startWithLevels, swap } from './helpers.ts';

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

test('mouse and touch taps produce identical board pixels and score', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touchscreen is configured for the mobile project');
  const levels = boardLevels([[2, 2], [2, 3], [2, 4]]);
  const outcomes = [];
  for (const touch of [false, true]) {
    await startWithLevels(page, levels, [.4, .4, .4]);
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