import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export type Position = { row: number; col: number };

export function boardLevels(predators: Array<[number, number]>, base = 0): number[] {
  const levels = Array.from({ length: 64 }, () => base);
  for (const [row, col] of predators) levels[row * 8 + col] = base + 1;
  levels[61] = 2;
  levels[62] = 3;
  levels[63] = 4;
  return levels;
}

export function alternatingLevels(entries: Array<[number, number, number]>): number[] {
  const levels: number[] = Array.from({ length: 64 }, (_, index) => (Math.floor(index / 8) + index % 8) % 2 === 0 ? 0 : 4);
  for (const [row, col, level] of [[7, 5, 2], [7, 6, 3], [7, 7, 4], ...entries]) levels[row * 8 + col] = level;
  return levels;
}

export const cascadeLevels = (): number[] => alternatingLevels([
  [2, 2, 1], [2, 3, 1], [2, 4, 1], [3, 3, 0], [3, 4, 0], [0, 3, 0],
]);

export const apexLevels = (): number[] => alternatingLevels([
  [0, 1, 1], [0, 2, 1], [0, 3, 1], [3, 3, 3], [2, 3, 4], [3, 4, 4], [4, 3, 4], [3, 1, 4], [3, 2, 0],
]);

export const alternatingRefill = Array.from({ length: 64 }, (_, index) => (Math.floor(index / 8) + index % 8) % 2 === 0 ? 0 : .9);

export async function startWithLevels(page: Page, levels: number[], draws: number[] = [], resetSeed?: number): Promise<void> {
  await page.addInitScript(({ initialLevels, refillDraws, resetSeed }) => {
    const values = [0, .4, .67, .84, .94];
    let index = 0;
    let refillIndex = -1;
    let state = resetSeed ?? 123;
    (window as unknown as { armRefill: () => void }).armRefill = () => { refillIndex = 0; };
    (window as unknown as { disarmRefill: () => void }).disarmRefill = () => { refillIndex = -1; };
    document.addEventListener('click', event => {
      if ((event.target as Element | null)?.closest('#reset')) (window as unknown as { disarmRefill: () => void }).disarmRefill();
    }, true);
    Math.random = () => {
      if (index < initialLevels.length) return values[initialLevels[index++]];
      if (refillIndex >= 0 && refillIndex < refillDraws.length) return refillDraws[refillIndex++];
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      const random = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      return random;
    };
  }, { initialLevels: levels, refillDraws: draws, resetSeed });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  await expect.poll(() => readLevels(page)).toEqual(levels);
  await page.evaluate(async () => {
    const viewPath = '/src/view/board-view.ts';
    const { BoardView } = await import(viewPath);
    const original = BoardView.prototype.effect;
    let armed = false;
    BoardView.prototype.effect = async function (this: unknown, event: { type: string }) {
      await original.call(this, event);
      if (event.type === 'reaction' && !armed) {
        armed = true;
        (window as unknown as { armRefill: () => void }).armRefill();
      }
    };
  });
}

export async function readLevels(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const context = document.querySelector('canvas')!.getContext('2d')!;
    const colors = ['185,220,184', '241,211,148', '239,169,151', '169,205,208', '182,185,217'];
    return Array.from({ length: 64 }, (_, index) => {
      const color = Array.from(context.getImageData(index % 8 * 100 + 20, Math.floor(index / 8) * 100 + 20, 1, 1).data).slice(0, 3).join(',');
      return colors.indexOf(color);
    });
  });
}

export async function swap(page: Page, first: Position, second: Position, touch = false): Promise<void> {
  const bounds = await page.locator('canvas').boundingBox();
  if (!bounds) throw new Error('Board canvas has no bounds');
  for (const position of [first, second]) {
    const x = bounds.x + bounds.width * (position.col + .5) / 8;
    const y = bounds.y + bounds.height * (position.row + .5) / 8;
    if (touch) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
  }
}