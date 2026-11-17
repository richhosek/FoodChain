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
      (window as unknown as { labels: Array<string | undefined> }).labels = this.pieces.map(piece => piece.list[1]?.text);
    };
  });
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', /level one creatures are animated amoebae/i, { timeout: 30_000 });
  const bounds = await page.locator('canvas').boundingBox();
  if (!bounds) throw new Error('Board canvas has no bounds');
  await page.mouse.click(bounds.x + bounds.width / 16, bounds.y + bounds.height / 16);
  const labels = await page.evaluate(() => (window as unknown as { labels: Array<string | undefined> }).labels);
  expect(labels).toEqual(levels.map(level => level <= 1 ? undefined : String(level)));
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

test('mouse and touch taps produce identical gameplay state and score', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touchscreen is configured for the mobile project');
  const levels = cascadeLevels();
  const outcomes = [];
  for (const touch of [false, true]) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startWithLevels(page, levels, [.2, .2, .2], 10);
    await page.evaluate(async () => {
      const gamePath = '/src/game/level.ts';
      const randomPath = '/src/game/random.ts';
      const { GameLevel } = await import(gamePath);
      const { seededRandom } = await import(randomPath);
      const originalMove = GameLevel.prototype.move;
      GameLevel.prototype.move = function (this: { random: () => number }, ...args: unknown[]) {
        const seeded = seededRandom(10);
        let draws = 0;
        this.random = () => draws++ < 3 ? 0.2 : seeded();
        return originalMove.apply(this, args);
      };
      const viewPath = '/src/view/board-view.ts';
      const { BoardView } = await import(viewPath);
      const original = BoardView.prototype.commitMove;
      BoardView.prototype.commitMove = function (board: Array<Array<{ level: number } | null>>) {
        (window as unknown as { committedLevels: Array<number | null> }).committedLevels = board.flatMap(row => row.map(creature => creature?.level ?? null));
        return original.call(this, board);
      };
    });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('canvas')).toHaveAttribute('aria-label', /animated paramecia/);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await swap(page, { row: 3, col: 3 }, { row: 3, col: 4 }, touch);
    await expect(page.getByTestId('turns')).toHaveText('1');
    await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
    await expect(page.getByTestId('removed')).toHaveText('2');
    await expect.poll(() => page.evaluate(() => (window as unknown as { committedLevels?: Array<number | null> }).committedLevels)).toHaveLength(64);
    outcomes.push({
      levels: await page.evaluate(() => (window as unknown as { committedLevels: Array<number | null> }).committedLevels),
      score: await Promise.all(['removed', 'target', 'turns', 'free-moves'].map(id => page.getByTestId(id).textContent())),
    });
  }
  expect(outcomes[0]).toEqual(outcomes[1]);
});