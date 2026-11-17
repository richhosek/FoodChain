import { expect, test } from '@playwright/test';
import { boardLevels, readLevels, startWithLevels } from './helpers.ts';

const mixedBoard = boardLevels([[2, 2], [2, 3], [2, 4]]);

async function tilePixels(page: import('@playwright/test').Page, row = 0, col = 0): Promise<number[]> {
  return page.locator('canvas').evaluate((element, position) => {
    const canvas = element as HTMLCanvasElement;
    const cellSize = canvas.width / 8;
    return Array.from(canvas.getContext('2d')!.getImageData(
      position.col * cellSize,
      position.row * cellSize,
      cellSize,
      cellSize,
    ).data);
  }, { row, col });
}

test('the game board exposes its current mixed-level content and input instructions', async ({ page }) => {
  await startWithLevels(page, mixedBoard);
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('role', 'img');
  await expect(canvas).toHaveAttribute(
    'aria-label',
    'Eight by eight game board. Level zero creatures are animated paramecia; level one creatures are animated amoebae; levels two through four are numbered. Select or drag between neighboring creatures.',
    { timeout: 30_000 },
  );
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
});

test('reduced motion is honored on startup and remains visually frozen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startWithLevels(page, mixedBoard);
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', /animated paramecia/);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  const initial = await tilePixels(page);
  await page.waitForTimeout(600);
  expect(await tilePixels(page)).toEqual(initial);
  expect(await readLevels(page)).toEqual(mixedBoard);
});

test('a live reduced-motion change freezes an already animated creature', async ({ page }) => {
  await startWithLevels(page, mixedBoard);
  const initial = await tilePixels(page);
  await expect.poll(async () => (await tilePixels(page)).join(',')).not.toBe(initial.join(','));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const frozen = await tilePixels(page);
  await page.waitForTimeout(600);
  expect(await tilePixels(page)).toEqual(frozen);
  expect(await readLevels(page)).toEqual(mixedBoard);
});

test('one failed artwork request falls back completely and level-zero cells remain playable', async ({ page, isMobile }) => {
  let blockedRequestSeen = false;
  await page.route('**/src/assets/paramecium/body.png', async route => {
    blockedRequestSeen = true;
    await route.abort();
  });
  await startWithLevels(page, mixedBoard);
  await expect.poll(() => blockedRequestSeen).toBe(true);

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const fallbackCell = await tilePixels(page);
  let eyeWhite = 0;
  let bodyMint = 0;
  let placeholderInk = 0;
  for (let index = 0; index < fallbackCell.length; index += 4) {
    const [red, green, blue, alpha] = fallbackCell.slice(index, index + 4);
    if (red >= 245 && green >= 245 && blue >= 235 && alpha > 0) eyeWhite += 1;
    if (red === 155 && green === 213 && blue === 197 && alpha > 0) bodyMint += 1;
    if (red < 90 && green < 140 && blue < 110 && alpha > 0) placeholderInk += 1;
  }
  expect(eyeWhite).toBe(0);
  expect(bodyMint).toBe(0);
  expect(placeholderInk).toBeGreaterThan(20);
  expect(await readLevels(page)).toEqual(mixedBoard);

  const accessibleName = await canvas.getAttribute('aria-label');

  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Board canvas has no bounds');
  const tap = async (col: number) => {
    const x = bounds.x + bounds.width * (col + 0.5) / 8;
    const y = bounds.y + bounds.height / 16;
    if (isMobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
  };
  await tap(0);
  await tap(1);
  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect(page.getByTestId('free-moves')).toHaveText('2');

  expect.soft(accessibleName?.toLowerCase()).not.toContain('animated paramecia');
  expect.soft(accessibleName?.toLowerCase()).toContain('numbered');
});