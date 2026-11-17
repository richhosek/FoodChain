import { expect, test } from '@playwright/test';

test('selection, inverse hint, refill and checkpoints preserve rank transforms and identity', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/view/board-view.ts';
    const { BoardView } = await import(path);
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
      id: `effect-${row}-${col}`, level: row === 0 && col < 5 ? col : 4,
    })));
    const mount = document.createElement('div');
    document.body.append(mount);
    const view = new BoardView(mount, board, () => {}, () => true) as any;
    const deadline = performance.now() + 30_000;
    while ((view.assetStatus !== 'ready' || view.amoebaAssetStatus !== 'ready') && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    if (view.assetStatus !== 'ready' || view.amoebaAssetStatus !== 'ready') throw new Error('Artwork did not load');
    const transform = (col: number) => {
      const piece = view.cells.get(`0,${col}`);
      if (col === 1) return { ...view.amoebaRenderer.artwork };
      const visual = piece.list[1];
      const target = col === 0 ? visual.list[0] : visual;
      return { x: target.x, y: target.y, scaleX: target.scaleX, scaleY: target.scaleY };
    };
    const initial = Array.from({ length: 5 }, (_, col) => transform(col));
    const states = [view.parameciumStates.get('effect-0-0'), view.amoebaStates.get('effect-0-1')];
    view.selected = { row: 0, col: 1 };
    view.render(board);
    const selected = view.amoebae.get('effect-0-1').selected;
    const afterSelection = Array.from({ length: 5 }, (_, col) => transform(col));
    const hint = view.hint({ row: 0, col: 1 }, new AbortController().signal);
    const inverse = view.invertedCells.has('0,1') && view.amoebae.get('effect-0-1').inverted;
    const duringHint = transform(1);
    await hint;
    const afterHint = transform(1);
    view.beginMove();
    const changed = board.map((row: any[]) => row.slice());
    changed[0][1] = { id: 'temporary', level: 1 };
    view.render(changed);
    view.rollbackMove();
    view.render(board);
    const rollback = states[0] === view.parameciumStates.get('effect-0-0') && states[1] === view.amoebaStates.get('effect-0-1') && !view.amoebaStates.get('temporary');
    const refillBoard = board.map((row: any[]) => row.slice());
    refillBoard[0][1] = { id: 'refilled', level: 1 };
    await view.effect({ type: 'refill', refill: { board: refillBoard, movements: [{ creature: refillBoard[0][1], from: null, to: { row: 0, col: 1 } }], candidates: [] }, signal: new AbortController().signal });
    view.render(refillBoard);
    const refill = { transform: transform(1), exists: Boolean(view.amoebae.get('refilled')) };
    view.beginReset();
    view.resetFailed();
    const failedReset = states[1] === view.amoebaStates.get('effect-0-1');
    view.beginReset();
    view.resetSucceeded();
    view.render(board);
    const reset = { freshState: states[1] !== view.amoebaStates.get('effect-0-1'), transforms: Array.from({ length: 5 }, (_, col) => transform(col)) };
    view.destroy();
    mount.remove();
    return { initial, selected, afterSelection, inverse, duringHint, afterHint, rollback, refill, failedReset, reset };
  });
  expect(result.selected).toBe(true);
  expect(result.afterSelection).toEqual(result.initial);
  expect(result.inverse).toBe(true);
  expect(result.duringHint).toEqual(result.initial[1]);
  expect(result.afterHint).toEqual(result.initial[1]);
  expect(result.rollback).toBe(true);
  expect(result.refill).toEqual({ transform: result.initial[1], exists: true });
  expect(result.failedReset).toBe(true);
  expect(result.reset).toEqual({ freshState: true, transforms: result.initial });
});

test('reaction convergence moves sized predators and abort restores their positions', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const viewPath = '/src/view/board-view.ts';
    const mechanicsPath = '/src/game/mechanics.ts';
    const { BoardView } = await import(viewPath);
    const { resolveWave } = await import(mechanicsPath);
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({ id: `reaction-${row}-${col}`, level: 4 })));
    board[3][3].level = 1;
    const positions = [{ row: 2, col: 3 }, { row: 3, col: 4 }, { row: 4, col: 3 }, { row: 3, col: 2 }];
    positions.forEach(({ row, col }) => { board[row][col].level = 2; });
    const wave = resolveWave(board, [{ row: 3, col: 3 }], (level: number) => ({ id: 'created', level }));
    if (!wave) throw new Error('Expected reaction');
    const mount = document.createElement('div');
    document.body.append(mount);
    const view = new BoardView(mount, board, () => {}, () => false) as any;
    const deadline = performance.now() + 30_000;
    while ((view.assetStatus !== 'ready' || view.amoebaAssetStatus !== 'ready') && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    if (view.assetStatus !== 'ready' || view.amoebaAssetStatus !== 'ready') throw new Error('Artwork did not load');
    const controller = new AbortController();
    const pending = view.effect({ type: 'reaction', wave, signal: controller.signal }).then(() => 'resolved', (error: Error) => error.name);
    const piece = view.cells.get('2,3');
    const label = piece.list[1];
    const start = { x: piece.x, y: piece.y, scale: label.scaleX };
    await new Promise(resolve => setTimeout(resolve, 300));
    const middle = { x: piece.x, y: piece.y, scale: label.scaleX };
    controller.abort();
    const outcome = await pending;
    const restored = { x: piece.x, y: piece.y, scale: label.scaleX };
    const flashes: Array<{ inverted: string[]; scale: number }> = [];
    const originalRender = view.render.bind(view);
    view.render = (nextBoard: unknown, inverted?: ReadonlySet<string>) => {
      originalRender(nextBoard, inverted);
      if (inverted?.has('2,3')) flashes.push({ inverted: [...inverted].sort(), scale: view.cells.get('2,3').list[1].scaleX });
    };
    await view.effect({ type: 'reaction', wave, signal: new AbortController().signal });
    const expectedFlash = wave.explosionCells.map((position: { row: number; col: number }) => `${position.row},${position.col}`).sort();
    view.destroy();
    mount.remove();
    return { start, middle, restored, outcome, flashes, expectedFlash };
  });
  expect(result.middle.y).toBeGreaterThan(result.start.y);
  expect(result.middle.scale).toBe(result.start.scale);
  expect(result.outcome).toBe('AbortError');
  expect(result.restored).toEqual(result.start);
  expect(result.flashes.length).toBeGreaterThan(0);
  for (const flash of result.flashes) {
    expect(flash.inverted).toEqual(result.expectedFlash);
    expect(flash.scale).toBe(result.start.scale);
  }
});