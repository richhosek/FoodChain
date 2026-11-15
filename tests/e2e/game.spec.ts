import { expect, test } from '@playwright/test';
import { boardLevels, startWithLevels, swap } from './helpers.ts';

test('plays a move and resets the level', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Food Chain', exact: true })).toBeVisible();
  await expect(page.getByTestId('removed')).toHaveText('0');
  await expect(page.getByTestId('target')).toHaveText('10');
  await expect(page.getByTestId('turns')).toHaveText('0');
  await expect(page.getByTestId('free-moves')).toHaveText('3');

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Board canvas has no bounds');
  await page.mouse.click(bounds.x + bounds.width / 16, bounds.y + bounds.height / 16);
  await page.mouse.click(bounds.x + bounds.width * 3 / 16, bounds.y + bounds.height / 16);
  await expect(page.getByTestId('turns')).toHaveText('1');

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByTestId('turns')).toHaveText('0');
  await expect(page.getByTestId('removed')).toHaveText('0');
  await expect(page.getByTestId('free-moves')).toHaveText('3');
});

test('dragging adjacent cells makes exactly one move', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Board canvas has no bounds');
  await page.mouse.move(bounds.x + bounds.width / 16, bounds.y + bounds.height / 16);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 3 / 16, bounds.y + bounds.height / 16, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByTestId('turns')).toHaveText('1');
});

test('touch taps select neighboring cells', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touchscreen is configured for the mobile project');
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Board canvas has no bounds');
  await page.touchscreen.tap(bounds.x + bounds.width / 16, bounds.y + bounds.height / 16);
  await page.touchscreen.tap(bounds.x + bounds.width * 3 / 16, bounds.y + bounds.height / 16);
  await expect(page.getByTestId('turns')).toHaveText('1');
});

test('touch dragging makes a move', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touchscreen is configured for the mobile project');
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Board canvas has no bounds');
  const client = await page.context().newCDPSession(page);
  const point = { x: bounds.x + bounds.width / 16, y: bounds.y + bounds.height / 16 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, x: bounds.x + bounds.width * 3 / 16 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByTestId('turns')).toHaveText('1');
});

test('reset interrupts an explosion without stale updates', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const findExplosion = () => page.evaluate(async () => {
    const gamePath = '/src/game/index.ts';
    const { swapBoard, resolveWave } = await import(gamePath);
    const context = document.querySelector('canvas')!.getContext('2d')!;
    const colors = ['185,220,184', '241,211,148', '239,169,151', '169,205,208', '182,185,217'];
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => {
      const color = Array.from(context.getImageData(col * 100 + 20, row * 100 + 20, 1, 1).data).slice(0, 3).join(',');
      return { id: `${row}-${col}`, level: colors.indexOf(color) };
    }));
    if (board.flat().some(creature => creature.level < 0)) return null;
    for (let row = 0; row < 8; row++) for (let col = 0; col < 7; col++) {
      const first = { row, col }, second = { row, col: col + 1 };
      const wave = resolveWave(swapBoard(board, first, second), [first, second], (level: number) => ({ id: 'created', level }));
      if (wave?.explosionCells.length) return { first, second };
    }
    return null;
  });
  let swap = null;
  for (let attempt = 0; attempt < 10 && !swap; attempt++) {
    await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
    await page.waitForTimeout(100);
    swap = await findExplosion();
    if (!swap) await page.getByRole('button', { name: 'Reset' }).click();
  }
  expect(swap).not.toBeNull();
  if (!swap) throw new Error('Could not find an explosion move');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Board canvas has no bounds');
  const clickCell = async (position: { row: number; col: number }) => page.mouse.click(bounds.x + bounds.width * (position.col + .5) / 8, bounds.y + bounds.height * (position.row + .5) / 8);
  await clickCell(swap.first);
  await clickCell(swap.second);
  await expect(page.getByRole('status')).toHaveText('Resolving the food chain...');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  await page.waitForTimeout(800);
  await expect(page.getByTestId('turns')).toHaveText('0');
  await expect(page.getByTestId('removed')).toHaveText('0');
  await expect(page.getByTestId('free-moves')).toHaveText('3');
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
});

test('explosion flashes only its affected cells in four phases and can be aborted', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  const result = await page.evaluate(async () => {
    const gamePath = '/src/game/index.ts';
    const viewPath = '/src/view/board-view.ts';
    const { generateBoard, seededRandom, swapBoard, resolveWave } = await import(gamePath);
    const { BoardView } = await import(viewPath);
    const board = await generateBoard(seededRandom(1));
    const first = { row: 2, col: 1 };
    const second = { row: 2, col: 2 };
    const wave = resolveWave(swapBoard(board, first, second), [first, second], (level: number) => ({ id: 'created', level }));
    const mount = document.createElement('div');
    document.body.append(mount);
    const view = new BoardView(mount, wave.before, () => {}, () => false);
    await new Promise(resolve => setTimeout(resolve, 200));
    const canvas = mount.querySelector('canvas')!;
    const context = canvas.getContext('2d')!;
    const pixel = (row: number, col: number) => Array.from(context.getImageData(col * 100 + 20, row * 100 + 20, 1, 1).data).join(',');
    const samples: Array<{ time: number; affected: string; unaffected: string }> = [];
    const start = performance.now();
    let active = true;
    const sample = () => {
      samples.push({ time: performance.now() - start, affected: pixel(1, 0), unaffected: pixel(0, 0) });
      if (active) requestAnimationFrame(sample);
    };
    await new Promise(resolve => setTimeout(resolve, 1200));
    requestAnimationFrame(sample);
    await view.effect({ type: 'reaction', wave, signal: new AbortController().signal });
    active = false;
    const controller = new AbortController();
    const pending = view.effect({ type: 'reaction', wave, signal: controller.signal }).then(() => 'resolved', (error: Error) => error.name);
    controller.abort();
    const aborted = await pending;
    mount.remove();
    return { samples, aborted };
  });
  const colors = result.samples.map(sample => sample.affected).filter(color => ['14,44,107,255', '241,211,148,255'].includes(color));
  const phases = colors.filter((color, index) => index === 0 || color !== colors[index - 1]);
  expect(new Set(phases)).toEqual(new Set(['14,44,107,255', '241,211,148,255']));
  expect(phases.length).toBeGreaterThanOrEqual(3);
  expect(new Set(result.samples.map(sample => sample.unaffected)).size).toBe(1);
  expect(result.aborted).toBe('AbortError');
});

test('refill moves survivors down and introduces new creatures from above', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  const result = await page.evaluate(async () => {
    const gamePath = '/src/game/index.ts';
    const viewPath = '/src/view/board-view.ts';
    const { generateBoard, seededRandom, swapBoard, resolveWave, refillBoard } = await import(gamePath);
    const { BoardView } = await import(viewPath);
    const board = await generateBoard(seededRandom(1));
    const first = { row: 2, col: 1 }, second = { row: 2, col: 2 };
    const wave = resolveWave(swapBoard(board, first, second), [first, second], (level: number) => ({ id: 'created', level }));
    let id = 0;
    const refill = refillBoard(wave.after, seededRandom(2), (level: number) => ({ id: `spawn-${id++}`, level }));
    const mount = document.createElement('div');
    document.body.append(mount);
    const view = new BoardView(mount, wave.after, () => {}, () => false);
    await new Promise(resolve => setTimeout(resolve, 200));
    const survivor = refill.movements.find((movement: { from: unknown }) => movement.from !== null);
    const spawn = refill.movements.find((movement: { from: unknown }) => movement.from === null);
    const creatures = refill.board.flat().filter(Boolean);
    const pending = view.effect({ type: 'refill', refill, signal: new AbortController().signal });
    const survivorPiece = view.pieces[creatures.findIndex((creature: { id: string }) => creature.id === survivor.creature.id)];
    const spawnPiece = view.pieces[creatures.findIndex((creature: { id: string }) => creature.id === spawn.creature.id)];
    const start = { survivor: survivorPiece.y, spawn: spawnPiece.y };
    await pending;
    const end = { survivor: survivorPiece.y, spawn: spawnPiece.y };
    const controller = new AbortController();
    const cancelled = view.effect({ type: 'refill', refill, signal: controller.signal }).then(() => 'resolved', (error: Error) => error.name);
    controller.abort();
    const aborted = await cancelled;
    mount.remove();
    return { start, end, survivor, spawn, aborted };
  });
  expect(result.start.survivor).toBe(result.survivor.from.row * 100 + 50);
  expect(result.end.survivor).toBe(result.survivor.to.row * 100 + 50);
  expect(result.start.spawn).toBeLessThan(0);
  expect(result.end.spawn).toBe(result.spawn.to.row * 100 + 50);
  expect(result.aborted).toBe('AbortError');
});

test('a landed survivor triggers the next reaction wave', async ({ page }) => {
  await startWithLevels(page, boardLevels([[2, 2], [2, 3], [2, 4]]), [.4, .4, .4]);
  await page.evaluate(async () => {
    const viewPath = '/src/view/board-view.ts';
    const { BoardView } = await import(viewPath);
    const original = BoardView.prototype.effect;
    const events: unknown[] = [];
    (window as unknown as { waveEvents: unknown[] }).waveEvents = events;
    BoardView.prototype.effect = function (this: unknown, event: { type: string; wave?: unknown; refill?: unknown }) {
      events.push(structuredClone(event.type === 'reaction' ? { type: event.type, wave: event.wave } : { type: event.type, refill: event.refill }));
      return original.call(this, event);
    };
  });
  await swap(page, { row: 3, col: 3 }, { row: 3, col: 4 });
  await expect(page.getByRole('status')).toHaveText('Choose two neighboring creatures.');
  const events = await page.evaluate(() => (window as unknown as { waveEvents: Array<{ type: string; wave?: { reactions: Array<{ prey: { position: { row: number; col: number }; creature: { id: string } } }> }; refill?: { movements: Array<{ creature: { id: string }; from: { row: number; col: number } | null; to: { row: number; col: number } }> } }> }).waveEvents);
  expect(events.map(event => event.type)).toEqual(['reaction', 'refill', 'reaction', 'refill']);
  const prey = events[2].wave!.reactions[0].prey;
  expect(prey.position).toEqual({ row: 1, col: 3 });
  expect(events[1].refill!.movements).toContainEqual(expect.objectContaining({ creature: expect.objectContaining({ id: prey.creature.id }), from: expect.any(Object), to: prey.position }));
  await expect(page.getByTestId('removed')).toHaveText('2');
  await expect(page.getByTestId('turns')).toHaveText('1');
  await expect(page.getByTestId('free-moves')).toHaveText('3');
});