import { expect, test } from '@playwright/test';

async function createAmoebaProbe(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(async () => {
    const viewModule = await new Function('specifier', 'return import(specifier)')('/src/view/board-view.ts') as {
      BoardView: new (mount: HTMLElement, board: Array<Array<{ id: string; level: number }>>, onMove: () => void, canMove: () => boolean) => any;
    };
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `accessibility-${row}-${col}`,
      level: 1,
    })));
    const mount = document.createElement('div');
    mount.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:800px;z-index:2147483647';
    document.body.append(mount);
    const moves: unknown[] = [];
    const view = new viewModule.BoardView(mount, board, (...args: unknown[]) => moves.push(args), () => true);
    (window as unknown as { amoebaAccessibilityProbe: unknown }).amoebaAccessibilityProbe = { view, board, mount, moves };
  });
  await page.waitForFunction(() => {
    const probe = (window as unknown as { amoebaAccessibilityProbe?: { view: { amoebaAssetStatus: string; amoebae: Map<string, unknown> } } }).amoebaAccessibilityProbe;
    return probe?.view.amoebaAssetStatus === 'ready' && probe.view.amoebae.size === 64;
  }, null, { timeout: 15_000 });
}

test('reduced motion at startup freezes the 64 amoeba states but leaves the board selectable', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await createAmoebaProbe(page);
  const before = await page.evaluate(() => {
    const probe = (window as unknown as { amoebaAccessibilityProbe: { view: any } }).amoebaAccessibilityProbe;
    return probe.view.amoebaStates.get('accessibility-0-0').elapsedSeconds;
  });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => {
    const probe = (window as unknown as { amoebaAccessibilityProbe: { view: any } }).amoebaAccessibilityProbe;
    return probe.view.amoebaStates.get('accessibility-0-0').elapsedSeconds;
  });
  expect(after).toBe(before);

  const points = await page.evaluate(() => {
    const probe = (window as unknown as { amoebaAccessibilityProbe: { mount: HTMLElement } }).amoebaAccessibilityProbe;
    const bounds = probe.mount.querySelector('canvas')!.getBoundingClientRect();
    return [0, 1].map(col => ({ x: bounds.left + bounds.width * (col + 0.5) / 8, y: bounds.top + bounds.height / 16 }));
  });
  if (isMobile) {
    await page.touchscreen.tap(points[0]!.x, points[0]!.y);
    await page.touchscreen.tap(points[1]!.x, points[1]!.y);
  } else {
    await page.mouse.click(points[0]!.x, points[0]!.y);
    await page.mouse.click(points[1]!.x, points[1]!.y);
  }
  const moves = await page.evaluate(() => (window as unknown as { amoebaAccessibilityProbe: { moves: unknown[] } }).amoebaAccessibilityProbe.moves.length);
  expect(moves).toBe(1);
});

test('live reduced-motion change freezes and then resumes amoeba resting updates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await createAmoebaProbe(page);
  await expect.poll(() => page.evaluate(() => (window as unknown as { amoebaAccessibilityProbe: { view: any } }).amoebaAccessibilityProbe.view.amoebaStates.get('accessibility-0-0').elapsedSeconds)).toBeGreaterThan(0.1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const frozen = await page.evaluate(() => (window as unknown as { amoebaAccessibilityProbe: { view: any } }).amoebaAccessibilityProbe.view.amoebaStates.get('accessibility-0-0').elapsedSeconds);
  await page.waitForTimeout(500);
  const stillFrozen = await page.evaluate(() => (window as unknown as { amoebaAccessibilityProbe: { view: any } }).amoebaAccessibilityProbe.view.amoebaStates.get('accessibility-0-0').elapsedSeconds);
  expect(stillFrozen).toBe(frozen);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => page.evaluate(() => (window as unknown as { amoebaAccessibilityProbe: { view: any } }).amoebaAccessibilityProbe.view.amoebaStates.get('accessibility-0-0').elapsedSeconds)).toBeGreaterThan(frozen + 0.1);
});

test('an unavailable amoeba layer falls back atomically to the numbered level-one cell', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const originalDecode = HTMLImageElement.prototype.decode;
    let failed = false;
    HTMLImageElement.prototype.decode = function () {
      if (!failed && this.src.includes('body-frame-00.png')) {
        failed = true;
        (window as unknown as { amoebaDecodeFailed: boolean }).amoebaDecodeFailed = true;
        return Promise.reject(new Error('Simulated amoeba artwork decode failure'));
      }
      return originalDecode.call(this);
    };
    const viewModule = await new Function('specifier', 'return import(specifier)')('/src/view/board-view.ts') as {
      BoardView: new (mount: HTMLElement, board: Array<Array<{ id: string; level: number }>>, onMove: () => void, canMove: () => boolean) => any;
    };
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({ id: `fallback-${row}-${col}`, level: 1 })));
    const mount = document.createElement('div');
    mount.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:800px;z-index:2147483647';
    document.body.append(mount);
    const view = new viewModule.BoardView(mount, board, () => {}, () => true);
    (window as unknown as { amoebaFallbackProbe: unknown }).amoebaFallbackProbe = { view, board, mount };
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { amoebaDecodeFailed?: boolean }).amoebaDecodeFailed)).toBe(true);
  await page.waitForFunction(() => (window as unknown as { amoebaFallbackProbe: { view: { amoebaAssetStatus: string; amoebae: Map<string, unknown> } } }).amoebaFallbackProbe.view.amoebaAssetStatus === 'unavailable');
  const fallback = await page.evaluate(() => {
    const probe = (window as unknown as { amoebaFallbackProbe: { view: any; mount: HTMLElement } }).amoebaFallbackProbe;
    const canvas = probe.mount.querySelector('canvas')!;
    const context = canvas.getContext('2d')!;
    const pixels = context.getImageData(20, 20, 60, 60).data;
    let darkInk = 0;
    let gold = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index]! >= 60 && pixels[index]! <= 150 && pixels[index + 1]! >= 35 && pixels[index + 1]! <= 125 && pixels[index + 2]! < 90) darkInk += 1;
      if (pixels[index]! > 200 && pixels[index + 1]! > 100 && pixels[index + 1]! < 180 && pixels[index + 2]! < 100) gold += 1;
    }
    return { status: probe.view.amoebaAssetStatus, artworkCount: probe.view.amoebae.size, darkInk, gold };
  });
  expect(fallback.status).toBe('unavailable');
  expect(fallback.artworkCount).toBe(0);
  expect(fallback.darkInk).toBeGreaterThan(10);
  expect(fallback.gold).toBe(0);
});
