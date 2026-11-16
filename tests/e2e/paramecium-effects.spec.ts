import { expect, test } from '@playwright/test';

test('hint flash inverts only its level-zero cell and preserves artwork alpha', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();

  const result = await page.evaluate(async () => {
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `flash-${row}-${col}`,
      level: 0,
    })));
    const mount = document.createElement('div');
    mount.style.position = 'fixed';
    mount.style.left = '0';
    mount.style.top = '0';
    mount.style.width = '800px';
    mount.style.height = '800px';
    mount.style.zIndex = '2147483647';
    document.body.append(mount);

    const viewPath = '/src/view/board-view.ts';
    const { BoardView } = await import(viewPath);
    const view = new BoardView(mount, board, () => {}, () => false);
    await new Promise<void>((resolve, reject) => {
      const deadline = window.setTimeout(() => reject(new Error('Timed out loading paramecium artwork')), 10_000);
      const checkReady = (): void => {
        if (view.assetStatus === 'ready') {
          window.clearTimeout(deadline);
          resolve();
          return;
        }
        if (view.assetStatus === 'unavailable') {
          window.clearTimeout(deadline);
          reject(new Error('Paramecium artwork did not load'));
          return;
        }
        window.setTimeout(checkReady, 10);
      };
      checkReady();
    });

    const alphaPlane = (key: string): number[] => {
      const piece = view.cells.get(key)!;
      const artwork = piece.list[1] as { list: Array<{ texture: { getSourceImage(): HTMLCanvasElement } }> };
      const canvas = artwork.list[0]!.texture.getSourceImage();
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      return Array.from({ length: pixels.length / 4 }, (_, index) => pixels[index * 4 + 3]!);
    };
    const sampleColor = (x: number, y: number): number[] => {
      const context = mount.querySelector('canvas')!.getContext('2d')!;
      return Array.from(context.getImageData(x, y, 1, 1).data).slice(0, 3);
    };
    const originalRender = view.render.bind(view);
    const flashScopes: string[][] = [];
    view.render = (nextBoard: typeof board, inverted?: ReadonlySet<string>) => {
      flashScopes.push([...(inverted ?? new Set())].sort());
      originalRender(nextBoard, inverted);
    };

    const normalAlpha = alphaPlane('0,0');
    const unaffectedAlpha = alphaPlane('0,1');
    const normalTargetColor = sampleColor(8, 50);
    const normalUnaffectedColor = sampleColor(108, 50);
    const hint = view.hint({ row: 0, col: 0 }, new AbortController().signal);
    await new Promise<void>((resolve, reject) => {
      const deadline = window.setTimeout(() => reject(new Error('Hint flash did not start')), 2000);
      const checkFlash = (): void => {
        const color = sampleColor(8, 50);
        if (view.invertedCells.has('0,0') && color.every((channel, index) => channel === 255 - normalTargetColor[index])) {
          window.clearTimeout(deadline);
          resolve();
          return;
        }
        window.setTimeout(checkFlash, 5);
      };
      checkFlash();
    });

    const invertedAlpha = alphaPlane('0,0');
    const untouchedAlpha = alphaPlane('0,1');
    const invertedTargetColor = sampleColor(8, 50);
    const unchangedUnaffectedColor = sampleColor(108, 50);
    await hint;
    view.destroy();
    mount.remove();

    return {
      targetTileInverted: invertedTargetColor.every((channel, index) => channel === 255 - normalTargetColor[index]),
      unaffectedTileUnchanged: unchangedUnaffectedColor.join(',') === normalUnaffectedColor.join(','),
      targetAlphaPreserved: normalAlpha.some(alpha => alpha === 0)
        && normalAlpha.some(alpha => alpha > 0)
        && normalAlpha.every((alpha, index) => alpha === invertedAlpha[index]),
      unaffectedAlphaUnchanged: unaffectedAlpha.every((alpha, index) => alpha === untouchedAlpha[index]),
      exactFlashScopes: flashScopes.slice(0, 4),
    };
  });

  expect(result.targetTileInverted).toBe(true);
  expect(result.unaffectedTileUnchanged).toBe(true);
  expect(result.targetAlphaPreserved).toBe(true);
  expect(result.unaffectedAlphaUnchanged).toBe(true);
  expect(result.exactFlashScopes).toEqual([['0,0'], [], ['0,0'], []]);
});

test('rotated paramecium artwork leaves the neighboring cell hit targets fixed', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();

  const result = await page.evaluate(async () => {
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `hit-${row}-${col}`,
      level: row === 0 && col < 2 ? 0 : 4,
    })));
    const mount = document.createElement('div');
    mount.style.position = 'fixed';
    mount.style.left = '0';
    mount.style.top = '0';
    mount.style.width = '800px';
    mount.style.height = '800px';
    mount.style.zIndex = '2147483647';
    document.body.append(mount);

    const moves: Array<{ first: { row: number; col: number }; second: { row: number; col: number } }> = [];
    const viewPath = '/src/view/board-view.ts';
    const { BoardView } = await import(viewPath);
    const view = new BoardView(mount, board, (
      first: { row: number; col: number },
      second: { row: number; col: number },
    ) => moves.push({ first, second }), () => true);
    await new Promise<void>((resolve, reject) => {
      const deadline = window.setTimeout(() => reject(new Error('Timed out loading paramecium artwork')), 10_000);
      const checkReady = (): void => {
        if (view.assetStatus === 'ready') {
          window.clearTimeout(deadline);
          resolve();
          return;
        }
        if (view.assetStatus === 'unavailable') {
          window.clearTimeout(deadline);
          reject(new Error('Paramecium artwork did not load'));
          return;
        }
        window.setTimeout(checkReady, 10);
      };
      checkReady();
    });

    const firstPiece = view.cells.get('0,0')!;
    const artwork = firstPiece.list[1] as { rotation: number };
    artwork.rotation = 8 * Math.PI / 180;
    const outerTransformStayedFixed = firstPiece.x === 50 && firstPiece.y === 50 && firstPiece.rotation === 0;
    const canvas = mount.querySelector('canvas')!;
    const bounds = canvas.getBoundingClientRect();
    const firstPoint = { x: bounds.left + bounds.width * 90 / 800, y: bounds.top + bounds.height / 16 };
    const secondPoint = { x: bounds.left + bounds.width * 150 / 800, y: bounds.top + bounds.height / 16 };
    (window as unknown as { fixedHitMoves: typeof moves }).fixedHitMoves = moves;

    return { firstPoint, secondPoint, outerTransformStayedFixed, artworkRotation: artwork.rotation };
  });

  if (isMobile) {
    await page.touchscreen.tap(result.firstPoint.x, result.firstPoint.y);
    await page.touchscreen.tap(result.secondPoint.x, result.secondPoint.y);
  } else {
    await page.mouse.click(result.firstPoint.x, result.firstPoint.y);
    await page.mouse.click(result.secondPoint.x, result.secondPoint.y);
  }

  const moves = await page.evaluate(() => (window as unknown as { fixedHitMoves: unknown }).fixedHitMoves);
  expect(result.outerTransformStayedFixed).toBe(true);
  expect(result.artworkRotation).toBeCloseTo(8 * Math.PI / 180);
  expect(moves).toEqual([{ first: { row: 0, col: 0 }, second: { row: 0, col: 1 } }]);
});