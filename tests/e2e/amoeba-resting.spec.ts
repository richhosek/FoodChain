import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { boardLevels, readLevels, startWithLevels } from './helpers.ts';

const mixedBoard = boardLevels([[2, 2], [2, 3], [2, 4]]);
const amoebaCells = [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }];

async function cellPixels(page: import('@playwright/test').Page, position: { row: number; col: number }) {
  return page.locator('canvas').evaluate((element, cell) => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')!.getImageData(cell.col * 100, cell.row * 100, 100, 100).data;
    let goldenBody = 0;
    let whiteEye = 0;
    let darkOutline = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index]!;
      const green = pixels[index + 1]!;
      const blue = pixels[index + 2]!;
      if (red > 225 && green > 155 && green < 220 && blue < 115) goldenBody += 1;
      if (red > 245 && green > 245 && blue > 235) whiteEye += 1;
      if (red < 45 && green < 45 && blue < 45) darkOutline += 1;
    }
    return { goldenBody, whiteEye, darkOutline };
  }, position);
}

async function cellSignature(page: import('@playwright/test').Page, position: { row: number; col: number }): Promise<string> {
  return page.locator('canvas').evaluate((element, cell) => {
    const canvas = element as HTMLCanvasElement;
    return Array.from(canvas.getContext('2d')!.getImageData(cell.col * 100, cell.row * 100, 100, 100).data).join(',');
  }, position);
}

test('mixed-level board renders approved level-one amoebae with independent resting motion', async ({ page }) => {
  await startWithLevels(page, mixedBoard);
  const canvas = page.locator('canvas');
  await expect.poll(() => canvas.getAttribute('aria-label'), { timeout: 30_000 }).toMatch(/amoeba/i);
  await expect.poll(async () => (await cellPixels(page, amoebaCells[0]!)).goldenBody).toBeGreaterThan(100);

  for (const position of amoebaCells) {
    const pixels = await cellPixels(page, position);
    expect(pixels.goldenBody).toBeGreaterThan(100);
    expect(pixels.whiteEye).toBeGreaterThan(10);
    expect(pixels.darkOutline).toBeGreaterThan(20);
  }
  expect(await readLevels(page)).toEqual(mixedBoard);

  const firstInitial = await cellSignature(page, amoebaCells[0]!);
  const secondInitial = await cellSignature(page, amoebaCells[1]!);
  await expect.poll(async () => cellSignature(page, amoebaCells[0]!)).not.toBe(firstInitial);
  await expect.poll(async () => cellSignature(page, amoebaCells[1]!)).not.toBe(secondInitial);

  const parameciumCell = await page.locator('canvas').evaluate(element => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, 100, 100).data;
    let mintBody = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index]!;
      const green = pixels[index + 1]!;
      const blue = pixels[index + 2]!;
      if (red >= 130 && red <= 180 && green >= 185 && green <= 235 && blue >= 170 && blue <= 220) mintBody += 1;
    }
    return mintBody;
  });
  expect(parameciumCell).toBeGreaterThan(100);
});

test('amoeba resting study starts from the approved character concept geometry', async () => {
  const concept = await readFile(resolve('docs/art/amoeba-concept.svg'), 'utf8');
  const preview = await readFile(resolve('docs/art/amoeba-resting-preview.html'), 'utf8');
  const conceptBody = concept.match(/<path id="body-shape" d="([^"]+)"/)?.[1];
  const previewBody = preview.match(/<path id="body-shape" d="([^"]+)"/)?.[1];
  const conceptHighlight = concept.match(/<path id="body-highlight" d="([^"]+)"/)?.[1];
  const previewHighlight = preview.match(/<path id="body-highlight" d="([^"]+)"/)?.[1];

  expect(previewBody).toBe(conceptBody);
  expect(previewHighlight).toBe(conceptHighlight);
});

test('amoeba resting study animates its face, body and collision-free details', async ({ page }) => {
  test.setTimeout(30_000);
  await page.addInitScript(() => {
    let state = 0x12345678;
    Math.random = () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
  });
  await page.goto(pathToFileURL(resolve('docs/art/amoeba-resting-preview.html')).href);
  await expect(page.locator('svg.creature')).toHaveCount(3);
  const scaleRatio = await page.evaluate(() => {
    const fullSize = document.querySelector<SVGSVGElement>('.creature-primary')!;
    const reduced = document.querySelector<SVGSVGElement>('.creature-small')!;
    return reduced.getBoundingClientRect().width / fullSize.getBoundingClientRect().width;
  });
  expect(scaleRatio).toBeGreaterThan(0.18);
  expect(scaleRatio).toBeLessThan(0.3);

  const result = await page.evaluate(async () => {
    const creatures = [...document.querySelectorAll<SVGSVGElement>('svg.creature')];
    const creature = creatures[0]!;
    const smallCreature = document.querySelector<SVGSVGElement>('.creature-small')!;
    const body = creature.querySelector<SVGPathElement>('#body-shape')!;
    const initialPath = body.getAttribute('d');
    const smallBody = smallCreature.querySelector<SVGPathElement>('[id^="body-shape"]')!;
    const initialSmallPath = smallBody.getAttribute('d');
    const initialBodyBounds = body.getBBox();
    let sawBlink = false;
    let sawGaze = false;
    let sawLeftBrowTilt = false;
    let sawRightBrowTilt = false;
    let browCounterRotationHeld = true;
    let interiorsStayedSafe = true;
    let unsafeInteriorIds = '';
    let lobeMoved = false;
    let interiorElementsPlaced = false;
    let maxBodyBoundsMotion = 0;
    let maxInteriorDrift = 0;
    const start = performance.now();

    await new Promise<void>(resolve => {
      const sample = (): void => {
        creatures.forEach((specimen, index) => {
          sawBlink ||= specimen.dataset.blinked === 'true';
          sawGaze ||= specimen.dataset.gazed === 'true';
          sawLeftBrowTilt ||= specimen.dataset.sawLeftBrowTilt === 'true';
          sawRightBrowTilt ||= specimen.dataset.sawRightBrowTilt === 'true';
          browCounterRotationHeld &&= specimen.dataset.browCounterRotationHeld !== 'false';
          interiorsStayedSafe &&= specimen.dataset.interiorsSafe !== 'false';
          if (specimen.dataset.interiorsSafe === 'false') {
            unsafeInteriorIds = `${index}:${specimen.dataset.unsafeInteriorIds ?? ''}`;
          }
        });
        lobeMoved ||= creature.dataset.upperRightLobeMoved === 'true';
        const bodyBounds = body.getBBox();
        maxBodyBoundsMotion = Math.max(maxBodyBoundsMotion,
          Math.abs(bodyBounds.x - initialBodyBounds.x),
          Math.abs(bodyBounds.y - initialBodyBounds.y),
          Math.abs(bodyBounds.width - initialBodyBounds.width),
          Math.abs(bodyBounds.height - initialBodyBounds.height));
        const details = [...creature.querySelectorAll<SVGGElement>('[data-drifter]')].map(element => {
          const transform = element.transform.baseVal.consolidate()?.matrix;
          const bounds = element.getBBox();
          const homeX = Number(element.dataset.homeX);
          const homeY = Number(element.dataset.homeY);
          maxInteriorDrift = Math.max(maxInteriorDrift, Math.hypot((transform?.e ?? homeX) - homeX, (transform?.f ?? homeY) - homeY));
          return {
            x: bounds.x + bounds.width / 2 + (transform?.e ?? 0),
            y: bounds.y + bounds.height / 2 + (transform?.f ?? 0),
            radius: Number(element.dataset.safeRadius),
          };
        });
        interiorElementsPlaced = details.length >= 5 && details.every(detail =>
          detail.x > 100 && detail.x < 710 && detail.y > 120 && detail.y < 640);
        if (performance.now() - start >= 12_000) {
          resolve();
          return;
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    return {
      bodyChanged: body.getAttribute('d') !== initialPath,
      smallBodyChanged: smallBody.getAttribute('d') !== initialSmallPath,
      sawBlink,
      sawGaze,
      sawLeftBrowTilt,
      sawRightBrowTilt,
      browCounterRotationHeld,
      interiorsStayedSafe,
      unsafeInteriorIds,
      interiorElementsPlaced,
      maxBodyBoundsMotion,
      maxInteriorDrift,
      lobeMoved,
    };
  });

  expect(result.bodyChanged).toBe(true);
  expect(result.smallBodyChanged).toBe(true);
  expect(result.sawBlink).toBe(true);
  expect(result.sawGaze).toBe(true);
  expect(result.sawLeftBrowTilt).toBe(true);
  expect(result.sawRightBrowTilt).toBe(true);
  expect(result.browCounterRotationHeld).toBe(true);
  expect(result.interiorsStayedSafe, `Unsafe interior elements: ${result.unsafeInteriorIds}`).toBe(true);
  expect(result.interiorElementsPlaced).toBe(true);
  expect(result.maxBodyBoundsMotion).toBeGreaterThan(4);
  expect(result.maxInteriorDrift).toBeGreaterThan(4);
  expect(result.lobeMoved).toBe(true);
});