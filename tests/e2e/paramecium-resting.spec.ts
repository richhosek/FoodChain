import { expect, test } from '@playwright/test';
import { boardLevels, readLevels, startWithLevels } from './helpers.ts';

const mixedBoard = boardLevels([[2, 2], [2, 3], [2, 4]]);

async function artworkPixelCounts(page: import('@playwright/test').Page, row: number, col: number) {
  return page.locator('canvas').evaluate((element, position) => {
    const canvas = element as HTMLCanvasElement;
    const cellSize = canvas.width / 8;
    const pixels = canvas.getContext('2d')!.getImageData(
      position.col * cellSize,
      position.row * cellSize,
      cellSize,
      cellSize,
    ).data;
    let eyeWhite = 0;
    let outline = 0;
    let bodyMint = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const [red, green, blue] = pixels.slice(index, index + 3);
      if (red >= 245 && green >= 245 && blue >= 235) eyeWhite += 1;
      if (red < 45 && green < 65 && blue < 65) outline += 1;
      if (red >= 130 && red <= 180 && green >= 185 && green <= 235 && blue >= 170 && blue <= 220) bodyMint += 1;
    }
    return { eyeWhite, outline, bodyMint };
  }, { row, col });
}

test('mixed-level board renders the paramecium artwork and preserves every level color', async ({ page }) => {
  await startWithLevels(page, mixedBoard);
  await expect.poll(async () => (await artworkPixelCounts(page, 0, 0)).eyeWhite).toBeGreaterThan(20);

  const pixels = await artworkPixelCounts(page, 0, 0);
  expect(pixels.outline).toBeGreaterThan(20);
  expect(pixels.bodyMint).toBeGreaterThan(100);
  expect(await readLevels(page)).toEqual(mixedBoard);
});

test('independent creature states and the fixed cell survive a real board redraw', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(() => {
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `probe-${row}-${col}`,
      level: 4,
    })));
    board[0][0] = { id: 'paramecium-a', level: 0 };
    board[0][1] = { id: 'paramecium-b', level: 0 };
    const mount = document.createElement('div');
    mount.style.width = '800px';
    mount.style.height = '800px';
    document.body.append(mount);
    const viewPath = '/src/view/board-view.ts';
    void import(viewPath).then(({ BoardView }) => {
      const view = new BoardView(mount, board, () => {}, () => true);
      (window as unknown as { restingProbe: { view: unknown; board: unknown; mount: HTMLElement } }).restingProbe = { view, board, mount };
    });
  });
  await page.waitForFunction(() => {
    const probe = (window as unknown as { restingProbe?: { view: { assetStatus: string; paramecia: Map<string, unknown> } } }).restingProbe;
    return probe?.view.assetStatus === 'ready' && probe.view.paramecia.size === 2;
  });

  const result = await page.evaluate(async () => {
    const probe = (window as unknown as {
      restingProbe: {
        view: {
          assetStatus: string;
          paramecia: Map<string, unknown>;
          parameciumStates: { get(id: string): { elapsedSeconds: number; ciliaPhase: number; ciliaPeriodSeconds: number } | undefined };
          cells: Map<string, { x: number; y: number; list: Array<{ rotation?: number }> }>;
          render(board: unknown): void;
        };
        board: unknown;
      };
    }).restingProbe;
    const { view, board } = probe;
    const firstState = view.parameciumStates.get('paramecium-a')!;
    const secondState = view.parameciumStates.get('paramecium-b')!;
    const firstCell = view.cells.get('0,0')!;
    const initialElapsed = firstState.elapsedSeconds;
    const fixedPosition = { x: firstCell.x, y: firstCell.y };
    await new Promise(resolve => setTimeout(resolve, 350));
    const elapsedBeforeRedraw = firstState.elapsedSeconds;
    view.render(board);
    const reboundState = view.parameciumStates.get('paramecium-a')!;
    const redrawnCell = view.cells.get('0,0')!;
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      sameState: reboundState === firstState,
      separateStates: firstState !== secondState,
      separateMotionSeeds: firstState.ciliaPhase !== secondState.ciliaPhase
        && firstState.ciliaPeriodSeconds !== secondState.ciliaPeriodSeconds,
      elapsedAdvanced: elapsedBeforeRedraw > initialElapsed && firstState.elapsedSeconds > elapsedBeforeRedraw,
      cellStayedFixed: redrawnCell.x === fixedPosition.x && redrawnCell.y === fixedPosition.y,
    };
  });

  expect(result).toEqual({
    sameState: true,
    separateStates: true,
    separateMotionSeeds: true,
    elapsedAdvanced: true,
    cellStayedFixed: true,
  });
});

test('body rotation triples while the eye and eyelids remain upright', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(() => {
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `rotation-${row}-${col}`,
      level: row === 0 && col === 0 ? 0 : 4,
    })));
    const mount = document.createElement('div');
    mount.style.width = '800px';
    mount.style.height = '800px';
    document.body.append(mount);
    const viewPath = '/src/view/board-view.ts';
    void import(viewPath).then(({ BoardView }) => {
      const view = new BoardView(mount, board, () => {}, () => false);
      (window as unknown as { rotationProbe: { view: unknown; mount: HTMLElement } }).rotationProbe = { view, mount };
    });
  });
  await page.waitForFunction(() => {
    const probe = (window as unknown as { rotationProbe?: { view: { assetStatus: string; paramecia: Map<string, unknown> } } }).rotationProbe;
    return probe?.view.assetStatus === 'ready' && probe.view.paramecia.size === 1;
  });
  await expect.poll(() => page.evaluate(() => {
    const probe = (window as unknown as { rotationProbe: { view: any } }).rotationProbe;
    const artwork = probe.view.cells.get('0,0')!.list[1]!;
    const eye = artwork.getByName?.('paramecium-eye');
    return eye ? { body: artwork.rotation ?? 0, eye: eye.rotation } : null;
  })).toMatchObject({ body: expect.any(Number), eye: expect.any(Number) });
  await expect.poll(() => page.evaluate(() => {
    const probe = (window as unknown as { rotationProbe: { view: any } }).rotationProbe;
    const artwork = probe.view.cells.get('0,0')!.list[1]!;
    const eye = artwork.getByName?.('paramecium-eye');
    return eye ? Math.abs((artwork.rotation ?? 0) + eye.rotation) < 0.001 && Math.abs(artwork.rotation ?? 0) > Math.PI / 180 : false;
  })).toBe(true);
  await page.evaluate(() => {
    const probe = (window as unknown as { rotationProbe: { view: { destroy: () => void }; mount: HTMLElement } }).rotationProbe;
    probe.view.destroy();
    probe.mount.remove();
  });
});