import { expect, test } from '@playwright/test';
import { boardLevels, readLevels, startWithLevels, swap } from './helpers.ts';
import type { Page } from '@playwright/test';

async function point(page: Page, row: number, col: number): Promise<{ x: number; y: number }> {
  const bounds = await page.locator('canvas').boundingBox();
  if (!bounds) throw new Error('Missing canvas');
  return { x: bounds.x + bounds.width * (col + .5) / 8, y: bounds.y + bounds.height * (row + .5) / 8 };
}

async function counters(page: Page): Promise<Array<string | null>> {
  return Promise.all(['turns', 'free-moves', 'removed', 'target'].map(id => page.getByTestId(id).textContent()));
}

test('real game state, reactions, and random draws stay unchanged until release', async ({ page }) => {
  await page.addInitScript(() => {
    let source = Math.random;
    const observations = { draws: 0, effects: 0 };
    (window as unknown as { dragObservations: typeof observations }).dragObservations = observations;
    const wrapped = () => { observations.draws++; return source(); };
    Object.defineProperty(Math, 'random', { configurable: true, get: () => wrapped, set: value => { source = value; } });
  });
  await startWithLevels(page, boardLevels([[2, 2], [2, 3], [2, 4]]));
  await page.evaluate(async () => {
    const path = '/src/view/board-view.ts';
    const { BoardView } = await import(path);
    const original = BoardView.prototype.effect;
    const observations = (window as unknown as { dragObservations: { draws: number; effects: number } }).dragObservations;
    observations.draws = 0;
    BoardView.prototype.effect = function (this: unknown, ...args: unknown[]) {
      observations.effects++;
      return original.apply(this, args);
    };
  });
  const before = { levels: await readLevels(page), counters: await counters(page), status: await page.getByRole('status').textContent() };
  const first = await point(page, 0, 0), second = await point(page, 0, 1);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(second.x, second.y);
  expect(await counters(page)).toEqual(before.counters);
  expect(await page.getByRole('status').textContent()).toBe(before.status);
  expect(await page.evaluate(() => (window as unknown as { dragObservations: unknown }).dragObservations)).toEqual({ draws: 0, effects: 0 });
  await page.mouse.move(first.x, first.y);
  await expect.poll(() => readLevels(page)).toEqual(before.levels);
  await page.mouse.up();
  expect(await counters(page)).toEqual(before.counters);
  expect(await page.evaluate(() => (window as unknown as { dragObservations: unknown }).dragObservations)).toEqual({ draws: 0, effects: 0 });
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(second.x, second.y);
  await page.mouse.up();
  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect(page.getByTestId('free-moves')).toHaveText('2');
});

test('reset during a preview replaces the board and ignores the old release', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  const first = await point(page, 0, 0), second = await point(page, 0, 1);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(second.x, second.y);
  await page.getByRole('button', { name: 'Reset' }).dispatchEvent('click');
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  const reset = await readLevels(page);
  await page.mouse.up();
  await expect(page.getByTestId('turns')).toHaveText('0');
  await expect(page.getByTestId('free-moves')).toHaveText('3');
  await expect.poll(() => readLevels(page)).toEqual(reset);
});

test('a nonreacting drag is rejected when free moves are exhausted', async ({ page }) => {
  await startWithLevels(page, boardLevels([[2, 2], [2, 3], [2, 4]]));
  for (let index = 0; index < 3; index++) {
    await swap(page, { row: 0, col: 0 }, { row: 0, col: 1 });
    await expect(page.getByTestId('turns')).toHaveText(String(index + 1));
  }
  await expect(page.getByTestId('free-moves')).toHaveText('0');
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  const before = { levels: await readLevels(page), counters: await counters(page) };
  const first = await point(page, 0, 0), second = await point(page, 0, 1);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(second.x, second.y);
  await page.mouse.up();
  await expect(page.getByRole('status')).toHaveText('That move is unavailable. Try another pair.');
  expect(await counters(page)).toEqual(before.counters);
  await expect.poll(() => readLevels(page)).toEqual(before.levels);
});

test('mouse and touch drags produce the same game outcome', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touchscreen is configured for the mobile project');
  const outcomes = [];
  for (const touch of [false, true]) {
    await startWithLevels(page, boardLevels([[2, 2], [2, 3], [2, 4]]));
    const first = await point(page, 0, 0), second = await point(page, 0, 1);
    if (touch) {
      const client = await page.context().newCDPSession(page);
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [second] });
      await expect(page.getByTestId('turns')).toHaveText('0');
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await client.detach();
    } else {
      await page.mouse.move(first.x, first.y);
      await page.mouse.down();
      await page.mouse.move(second.x, second.y);
      await expect(page.getByTestId('turns')).toHaveText('0');
      await page.mouse.up();
    }
    await expect(page.getByTestId('turns')).toHaveText('1');
    await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
    outcomes.push({ levels: await readLevels(page), counters: await counters(page) });
  }
  expect(outcomes[0]).toEqual(outcomes[1]);
});