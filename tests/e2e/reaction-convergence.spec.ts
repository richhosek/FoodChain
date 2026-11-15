import { expect, test } from '@playwright/test';
import type { Board, Level } from '../../src/game/creature.ts';

test('predators converge over 1000ms before the reaction board is rendered', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  const result = await page.evaluate(async () => {
    const mechanicsPath = '/src/game/mechanics.ts';
    const viewPath = '/src/view/board-view.ts';
    const { resolveWave } = await import(mechanicsPath);
    const { BoardView } = await import(viewPath);
    const levels = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 0));
    const board: Board = levels.map((row, rowIndex) => row.map((level, col) => ({ id: `c${rowIndex}-${col}`, level: level as Level })));
    const prey = { row: 3, col: 3 };
    const predatorPositions = [{ row: 2, col: 3 }, { row: 3, col: 4 }, { row: 4, col: 3 }, { row: 3, col: 2 }];
    predatorPositions.forEach(position => { board[position.row][position.col]!.level = 1; });
    const wave = resolveWave(board, [prey], (level: Level) => ({ id: 'created', level }));
    if (!wave) throw new Error('Expected a reaction wave');
    const mount = document.createElement('div');
    document.body.append(mount);
    const view = new BoardView(mount, board, () => {}, () => false);
    const getPieces = () => (view as unknown as { pieces: Array<{ x: number; y: number; list: Array<{ text?: string }> }> }).pieces;
    const findPredators = () => predatorPositions.map(position => {
      const x = position.col * 100 + 50;
      const y = position.row * 100 + 50;
      const piece = getPieces().find(candidate => candidate.x === x && candidate.y === y);
      if (!piece) throw new Error(`Missing predator at ${position.row},${position.col}`);
      return piece;
    });
    const renderDeadline = performance.now() + 3000;
    while (getPieces().length !== 64 && performance.now() < renderDeadline) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    if (getPieces().length !== 64) throw new Error('Board did not finish rendering');
    const controller = new AbortController();
    const started = performance.now();
    let completed = false;
    const pending = view.effect({ type: 'reaction', wave, signal: controller.signal }).then(() => { completed = true; });
    const predatorPieces = findPredators();
    const starts = predatorPieces.map(piece => ({ x: piece.x, y: piece.y }));
    await new Promise(resolve => setTimeout(resolve, 350));
    const middle = predatorPieces.map(piece => ({ x: piece.x, y: piece.y }));
    const during = { completed, preyStillPresent: getPieces().some(piece => piece.x === 350 && piece.y === 350), starts, middle };
    await new Promise(resolve => setTimeout(resolve, 800));
    const pendingAtCueEnd = completed;
    await pending;
    const elapsed = performance.now() - started;
    const renderedPieceCount = getPieces().length;
    mount.remove();
    return { during, pendingAtCueEnd, elapsed, renderedPieceCount, expectedPieceCount: wave.after.flat().filter(Boolean).length };
  });

  expect(result.during.completed).toBe(false);
  expect(result.during.preyStillPresent).toBe(true);
  expect(result.during.middle).not.toEqual(result.during.starts);
  expect(result.during.middle.every(position => position.x !== 350 || position.y !== 350)).toBe(true);
  expect(result.pendingAtCueEnd).toBe(false);
  expect(result.elapsed).toBeGreaterThanOrEqual(1400);
  expect(result.renderedPieceCount).toBe(result.expectedPieceCount);
});

test('shared predators get temporary visuals and abort restores the board', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  const result = await page.evaluate(async () => {
    const mechanicsPath = '/src/game/mechanics.ts';
    const viewPath = '/src/view/board-view.ts';
    const { resolveWave } = await import(mechanicsPath);
    const { BoardView } = await import(viewPath);
    const board: Board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({ id: `c${row}-${col}`, level: 0 as Level })));
    const firstPrey = { row: 3, col: 3 };
    const secondPrey = { row: 3, col: 5 };
    const positions = [
      { row: 2, col: 3 }, { row: 3, col: 4 }, { row: 4, col: 3 }, { row: 3, col: 2 },
      { row: 2, col: 5 }, { row: 3, col: 6 }, { row: 4, col: 5 },
    ];
    positions.forEach(position => { board[position.row][position.col]!.level = 1; });
    const wave = resolveWave(board, [firstPrey, secondPrey], (level: Level) => ({ id: `created-${level}`, level }));
    if (!wave || wave.reactions.length !== 2) throw new Error('Expected two simultaneous reactions');
    const mount = document.createElement('div');
    document.body.append(mount);
    const view = new BoardView(mount, board, () => {}, () => false);
    const internals = view as unknown as {
      pieces: Array<{ x: number; y: number }>;
      scene: { children: { list: unknown[] } };
      cells: Map<string, { x: number; y: number }>;
    };
    const deadline = performance.now() + 3000;
    while (internals.pieces.length !== 64 && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    if (internals.pieces.length !== 64) throw new Error('Board did not finish rendering');
    const initialChildren = internals.scene.children.list.length;
    const controller = new AbortController();
    const pending = view.effect({ type: 'reaction', wave, signal: controller.signal }).then(
      () => 'resolved',
      (error: unknown) => error instanceof Error ? error.name : String(error),
    );
    const shared = internals.cells.get('3,4');
    if (!shared) throw new Error('Shared predator is missing');
    const original = { x: shared.x, y: shared.y };
    await new Promise(resolve => setTimeout(resolve, 250));
    const childrenDuring = internals.scene.children.list.length;
    const sharedMoved = shared.x !== original.x || shared.y !== original.y;
    controller.abort();
    const outcome = await pending;
    const childrenAfter = internals.scene.children.list.length;
    const restored = shared.x === original.x && shared.y === original.y;
    mount.remove();
    return { reactions: wave.reactions.length, initialChildren, childrenDuring, childrenAfter, sharedMoved, restored, outcome };
  });

  expect(result.reactions).toBe(2);
  expect(result.childrenDuring).toBeGreaterThan(result.initialChildren);
  expect(result.sharedMoved).toBe(true);
  expect(result.outcome).toBe('AbortError');
  expect(result.childrenAfter).toBe(result.initialChildren);
  expect(result.restored).toBe(true);
});
