import { expect, test } from '@playwright/test';

test('amoeba hint flash scopes inverse art and fixed cells remain selectable', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(async () => {
    const viewModule = await new Function('specifier', 'return import(specifier)')('/src/view/board-view.ts') as {
      BoardView: new (mount: HTMLElement, board: Array<Array<{ id: string; level: number }>>, onMove: (...args: unknown[]) => void, canMove: () => boolean) => any;
    };
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `effect-${row}-${col}`,
      level: row === 0 && col < 2 ? 1 : 4,
    })));
    const mount = document.createElement('div');
    mount.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:800px;z-index:2147483647';
    document.body.append(mount);
    const moves: unknown[] = [];
    const view = new viewModule.BoardView(mount, board, (...args: unknown[]) => moves.push(args), () => true);
    await new Promise<void>((resolve, reject) => {
      const deadline = window.setTimeout(() => reject(new Error('Amoeba artwork did not become ready')), 15_000);
      const poll = (): void => {
        if (view.amoebaAssetStatus === 'ready' && view.amoebae.size === 2) {
          window.clearTimeout(deadline);
          resolve();
        } else if (view.amoebaAssetStatus === 'unavailable') {
          window.clearTimeout(deadline);
          reject(new Error('Amoeba artwork was unavailable'));
        } else window.setTimeout(poll, 20);
      };
      poll();
    });
    const flashScopes: string[][] = [];
    const originalRender = view.render.bind(view);
    view.render = (nextBoard: unknown, inverted?: ReadonlySet<string>) => {
      flashScopes.push([...(inverted ?? new Set<string>())].sort());
      originalRender(nextBoard, inverted);
    };
    (window as unknown as { amoebaEffectProbe: unknown }).amoebaEffectProbe = { view, board, mount, moves, flashScopes };
  });

  const positions = await page.evaluate(() => {
    const probe = (window as unknown as { amoebaEffectProbe: any }).amoebaEffectProbe;
    const target = probe.view.cells.get('0,0');
    const unaffected = probe.view.cells.get('0,1');
    const canvas = probe.view.amoebaRenderer.canvas as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    const sample = (x: number) => Array.from(context.getImageData(x, 50, 1, 1).data).slice(0, 3);
    return {
      outerStayedFixed: target.x === 50 && target.y === 50 && target.rotation === 0,
      normalTargetColor: sample(50),
      normalUnaffectedColor: sample(150),
      unaffectedStayedFixed: unaffected.x === 150 && unaffected.y === 50,
    };
  });
  expect(positions.outerStayedFixed).toBe(true);
  expect(positions.unaffectedStayedFixed).toBe(true);

  await page.evaluate(() => {
    const probe = (window as unknown as { amoebaEffectProbe: any }).amoebaEffectProbe;
    probe.hintPromise = probe.view.hint({ row: 0, col: 0 }, new AbortController().signal);
  });
  await expect.poll(() => page.evaluate(() => {
    const probe = (window as unknown as { amoebaEffectProbe: any }).amoebaEffectProbe;
    return probe.view.invertedCells.has('0,0');
  })).toBe(true);
  const flash = await page.evaluate(() => {
    const probe = (window as unknown as { amoebaEffectProbe: any }).amoebaEffectProbe;
    const context = (probe.view.amoebaRenderer.canvas as HTMLCanvasElement).getContext('2d')!;
    const sample = (x: number) => Array.from(context.getImageData(x, 50, 1, 1).data).slice(0, 3);
    return {
      targetColor: sample(50),
      unaffectedColor: sample(150),
      targetTileInverted: probe.view.invertedCells.has('0,0'),
      unaffectedTileInverted: probe.view.invertedCells.has('0,1'),
    };
  });
  expect(flash.targetColor).not.toEqual(positions.normalTargetColor);
  expect(flash.unaffectedColor).toEqual(positions.normalUnaffectedColor);
  expect(flash.targetTileInverted).toBe(true);
  expect(flash.unaffectedTileInverted).toBe(false);
  await page.evaluate(async () => await (window as unknown as { amoebaEffectProbe: any }).amoebaEffectProbe.hintPromise);

  const points = await page.evaluate(() => {
    const probe = (window as unknown as { amoebaEffectProbe: any }).amoebaEffectProbe;
    const bounds = probe.mount.querySelector('canvas')!.getBoundingClientRect();
    return {
      first: { x: bounds.left + bounds.width / 16, y: bounds.top + bounds.height / 16 },
      second: { x: bounds.left + bounds.width * 3 / 16, y: bounds.top + bounds.height / 16 },
    };
  });
  if (isMobile) {
    await page.touchscreen.tap(points.first.x, points.first.y);
    await page.touchscreen.tap(points.second.x, points.second.y);
  } else {
    await page.mouse.click(points.first.x, points.first.y);
    await page.mouse.click(points.second.x, points.second.y);
  }
  const interaction = await page.evaluate(() => {
    const probe = (window as unknown as { amoebaEffectProbe: any }).amoebaEffectProbe;
    return { moves: probe.moves.length, fixed: probe.view.cells.get('0,0').x === 50 && probe.view.cells.get('0,1').x === 150 };
  });
  expect(interaction).toEqual({ moves: 1, fixed: true });
  await page.evaluate(() => (window as unknown as { amoebaEffectProbe: any }).amoebaEffectProbe.view.destroy());
});
