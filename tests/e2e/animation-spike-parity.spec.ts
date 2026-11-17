import { expect, test } from '@playwright/test';

async function openCanvasCandidate(page: import('@playwright/test').Page, workload = 'dense-paramecium'): Promise<void> {
  await page.goto(`/experiments/animation-spike/index.html?candidate=current-canvas&workload=${workload}&seed=17`);
  await expect(page.getByRole('status')).toHaveText('current-canvas ready (canvas)', { timeout: 20_000 });
  await expect(page.locator('#candidate-root canvas')).toBeVisible();
}

async function openWebGLCandidate(page: import('@playwright/test').Page, workload = 'dense-paramecium'): Promise<void> {
  await page.goto(`/experiments/animation-spike/index.html?candidate=webgl&workload=${workload}&seed=17`);
  await expect(page.getByRole('status')).toHaveText('webgl ready (webgl)', { timeout: 20_000 });
  await expect(page.locator('#candidate-root canvas')).toBeVisible();
}

async function openSharedFrameCandidate(page: import('@playwright/test').Page, workload = 'mixed'): Promise<void> {
  await page.goto(`/experiments/animation-spike/index.html?candidate=shared-frame&workload=${workload}&seed=17`);
  await expect(page.getByRole('status')).toHaveText('shared-frame ready (canvas)', { timeout: 20_000 });
  await expect(page.locator('#candidate-root canvas')).toBeVisible();
}

test('current Canvas candidate renders the deterministic board and preserves scripted selection and cancellation', async ({ page }) => {
  await openCanvasCandidate(page);
  const result = await page.evaluate(async () => {
    const state = (window as unknown as { animationSpike: {
      workload: { board: Array<Array<{ id: string; level: number }>>; actions: Array<unknown> };
      session: { instance: { renderer: string; dispatch: (action: unknown) => Promise<{ accepted: boolean }>; snapshot: () => { board: Array<Array<{ id: string; level: number }>>; selected: { row: number; col: number } | null } } };
    } }).animationSpike;
    const initialIds = state.session.instance.snapshot().board.flat().map(creature => creature?.id);
    const selection = await state.session.instance.dispatch({ atMs: 0, type: 'select', position: { row: 3, col: 3 } });
    const selected = state.session.instance.snapshot().selected;
    const cancellation = await state.session.instance.dispatch({ atMs: 1, type: 'cancel', position: { row: 3, col: 4 } });
    const afterCancelIds = state.session.instance.snapshot().board.flat().map(creature => creature?.id);
    return {
      renderer: state.session.instance.renderer,
      levels: state.session.instance.snapshot().board.flat().map(creature => creature?.level),
      fixtureLevels: state.workload.board.flat().map(creature => creature?.level),
      selectionAccepted: selection.accepted,
      selected,
      cancellationAccepted: cancellation.accepted,
      unchangedByCancel: initialIds.join(',') === afterCancelIds.join(','),
    };
  });

  expect(result.renderer).toBe('canvas');
  expect(result.levels).toEqual(result.fixtureLevels);
  expect(result.selectionAccepted).toBe(true);
  expect(result.selected).toEqual({ row: 3, col: 3 });
  expect(result.cancellationAccepted).toBe(true);
  expect(result.unchangedByCancel).toBe(true);
});

test('current Canvas candidate accepts a real mouse drag with the same deterministic outcome', async ({ page }) => {
  await openCanvasCandidate(page);
  const before = await page.evaluate(() => {
    const state = (window as unknown as { animationSpike: { session: { instance: { snapshot: () => { board: Array<Array<{ id: string }>> } } } } }).animationSpike;
    return [state.session.instance.snapshot().board[3][3]?.id, state.session.instance.snapshot().board[3][4]?.id];
  });
  const canvas = page.locator('#candidate-root canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Candidate canvas has no bounds');
  const first = { x: bounds.x + bounds.width * 3.5 / 8, y: bounds.y + bounds.height * 3.5 / 8 };
  const second = { x: bounds.x + bounds.width * 4.5 / 8, y: first.y };
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(second.x, second.y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => {
    const state = (window as unknown as { animationSpike: { session: { instance: { snapshot: () => { board: Array<Array<{ id: string }>> } } } } }).animationSpike;
    return [state.session.instance.snapshot().board[3][3]?.id, state.session.instance.snapshot().board[3][4]?.id];
  })).toEqual([before[1], before[0]]);
});

test('current Canvas candidate accepts touch selection in mobile emulation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touchscreen emulation is configured for the mobile project');
  await openCanvasCandidate(page);
  const canvas = page.locator('#candidate-root canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Candidate canvas has no bounds');
  await page.touchscreen.tap(bounds.x + bounds.width * 2.5 / 8, bounds.y + bounds.height * 2.5 / 8);
  await expect.poll(() => page.evaluate(() => {
    const state = (window as unknown as { animationSpike: { session: { instance: { snapshot: () => { selected: { row: number; col: number } | null } } } } }).animationSpike;
    return state.session.instance.snapshot().selected;
  })).toEqual({ row: 2, col: 2 });
});

test('forced WebGL candidate verifies its renderer and accepts a real mouse drag', async ({ page }) => {
  await openWebGLCandidate(page);
  const before = await page.evaluate(() => {
    const state = (window as unknown as { animationSpike: { session: { instance: { renderer: string; snapshot: () => { board: Array<Array<{ id: string }>> } } } } }).animationSpike;
    return { renderer: state.session.instance.renderer, ids: [state.session.instance.snapshot().board[3][3]?.id, state.session.instance.snapshot().board[3][4]?.id] };
  });
  expect(before.renderer).toBe('webgl');

  const canvas = page.locator('#candidate-root canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Candidate canvas has no bounds');
  const first = { x: bounds.x + bounds.width * 3.5 / 8, y: bounds.y + bounds.height * 3.5 / 8 };
  const second = { x: bounds.x + bounds.width * 4.5 / 8, y: first.y };
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(second.x, second.y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => {
    const state = (window as unknown as { animationSpike: { session: { instance: { snapshot: () => { board: Array<Array<{ id: string }>> } } } } }).animationSpike;
    return [state.session.instance.snapshot().board[3][3]?.id, state.session.instance.snapshot().board[3][4]?.id];
  })).toEqual([before.ids[1], before.ids[0]]);
});

for (const candidate of ['shared-frame', 'webgl'] as const) {
  test(`${candidate} candidate visually matches the reduced-motion Canvas baseline`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openCanvasCandidate(page, 'dense-paramecium');
    const baseline = (await page.locator('#candidate-root canvas').screenshot()).toString('base64');

    const expectedRenderer = candidate === 'webgl' ? 'webgl' : 'canvas';
    await page.goto(`/experiments/animation-spike/index.html?candidate=${candidate}&workload=dense-paramecium&seed=17`);
    await expect(page.getByRole('status')).toHaveText(`${candidate} ready (${expectedRenderer})`, { timeout: 20_000 });
    const candidateScreenshot = (await page.locator('#candidate-root canvas').screenshot()).toString('base64');
    const comparison = await page.evaluate(async ({ baselineDataUrl, candidateDataUrl }) => {
      const decode = async (dataUrl: string): Promise<ImageBitmap> => {
        const response = await fetch(dataUrl);
        return createImageBitmap(await response.blob());
      };
      const [referenceImage, candidateImage] = await Promise.all([decode(baselineDataUrl), decode(candidateDataUrl)]);
      const referenceCanvas = document.createElement('canvas');
      const candidateCanvas = document.createElement('canvas');
      referenceCanvas.width = candidateCanvas.width = 800;
      referenceCanvas.height = candidateCanvas.height = 800;
      const referenceContext = referenceCanvas.getContext('2d')!;
      const candidateContext = candidateCanvas.getContext('2d')!;
      referenceContext.drawImage(referenceImage, 0, 0, 800, 800);
      candidateContext.drawImage(candidateImage, 0, 0, 800, 800);
      const reference = referenceContext.getImageData(0, 0, 800, 800).data;
      const current = candidateContext.getImageData(0, 0, 800, 800).data;
      let totalDifference = 0;
      let changedPixels = 0;
      for (let index = 0; index < reference.length; index += 4) {
        const difference = Math.abs(reference[index] - current[index])
          + Math.abs(reference[index + 1] - current[index + 1])
          + Math.abs(reference[index + 2] - current[index + 2]);
        totalDifference += difference;
        if (difference > 24) changedPixels++;
      }
      return {
        meanChannelDifference: totalDifference / (reference.length / 4) / 3,
        changedPixelFraction: changedPixels / (reference.length / 4),
      };
    }, { baselineDataUrl: `data:image/png;base64,${baseline}`, candidateDataUrl: `data:image/png;base64,${candidateScreenshot}` });

    expect(comparison.meanChannelDifference, JSON.stringify(comparison)).toBeLessThan(12);
    expect(comparison.changedPixelFraction).toBeLessThan(0.08);
  });
}

test('shared-frame candidate preserves mixed content, independent motion, selection, and cancellation', async ({ page }) => {
  await openSharedFrameCandidate(page);
  const before = await page.evaluate(() => {
    const state = (window as unknown as { animationSpike: {
      workload: { board: Array<Array<{ level: number }>>; cells: Array<{ position: { row: number; col: number }; creature: { level: number } }> };
      session: { instance: { renderer: string; snapshot: () => { board: Array<Array<{ level: number }>> } } };
    } }).animationSpike;
    const canvas = document.querySelector('#candidate-root canvas') as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Shared-frame candidate has no readable Canvas context');
    const paramecia = state.workload.cells.filter(cell => cell.creature.level === 0).slice(0, 3);
    const signatures = paramecia.map(cell => {
      const { row, col } = cell.position;
      return Array.from(context.getImageData(col * 100 + 20, row * 100 + 20, 60, 60).data);
    });
    return {
      renderer: state.session.instance.renderer,
      levels: state.session.instance.snapshot().board.flat().map(creature => creature?.level),
      expectedLevels: state.workload.board.flat().map(creature => creature?.level),
      positions: paramecia.map(cell => cell.position),
      signatures,
    };
  });
  expect(before.renderer).toBe('canvas');
  expect(before.levels).toEqual(before.expectedLevels);

  await page.waitForTimeout(450);
  const after = await page.evaluate(positions => {
    const canvas = document.querySelector('#candidate-root canvas') as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    return positions.map(({ row, col }) => Array.from(context.getImageData(col * 100 + 20, row * 100 + 20, 60, 60).data));
  }, before.positions);
  const changedCells = before.signatures.filter((signature, index) => signature.some((value, pixel) => value !== after[index][pixel])).length;
  expect(changedCells).toBeGreaterThanOrEqual(2);

  const interaction = await page.evaluate(async () => {
    const state = (window as unknown as { animationSpike: { session: { instance: { dispatch: (action: unknown) => Promise<{ accepted: boolean }>; snapshot: () => { selected: { row: number; col: number } | null; board: Array<Array<{ id: string }>> } } } } }).animationSpike;
    const beforeIds = state.session.instance.snapshot().board.flat().map(creature => creature?.id).join(',');
    const selected = await state.session.instance.dispatch({ atMs: 0, type: 'select', position: { row: 3, col: 3 } });
    const selectedPosition = state.session.instance.snapshot().selected;
    const cancelled = await state.session.instance.dispatch({ atMs: 1, type: 'cancel', position: { row: 3, col: 4 } });
    const afterIds = state.session.instance.snapshot().board.flat().map(creature => creature?.id).join(',');
    return { selected: selected.accepted, selectedPosition, cancelled: cancelled.accepted, unchanged: beforeIds === afterIds };
  });
  expect(interaction).toEqual({ selected: true, selectedPosition: { row: 3, col: 3 }, cancelled: true, unchanged: true });
});

test('shared-frame overlay accepts a real mouse drag and preserves the deterministic outcome', async ({ page }) => {
  await openSharedFrameCandidate(page, 'dense-paramecium');
  const before = await page.evaluate(() => {
    const state = (window as unknown as { animationSpike: { session: { instance: { snapshot: () => { board: Array<Array<{ id: string }>> } } } } }).animationSpike;
    return [state.session.instance.snapshot().board[3][3]?.id, state.session.instance.snapshot().board[3][4]?.id];
  });
  const canvas = page.locator('#candidate-root canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Candidate canvas has no bounds');
  const first = { x: bounds.x + bounds.width * 3.5 / 8, y: bounds.y + bounds.height * 3.5 / 8 };
  const second = { x: bounds.x + bounds.width * 4.5 / 8, y: first.y };
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(second.x, second.y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => {
    const state = (window as unknown as { animationSpike: { session: { instance: { snapshot: () => { board: Array<Array<{ id: string }>> } } } } }).animationSpike;
    return [state.session.instance.snapshot().board[3][3]?.id, state.session.instance.snapshot().board[3][4]?.id];
  })).toEqual([before[1], before[0]]);
});

for (const candidate of ['current-canvas', 'shared-frame', 'webgl'] as const) {
  for (const workload of ['dense-paramecium', 'dense-amoeba', 'mixed'] as const) {
    test(`${candidate} candidate reproduces the ${workload} fixture`, async ({ page }) => {
      const expectedRenderer = candidate === 'webgl' ? 'webgl' : 'canvas';
      await page.goto(`/experiments/animation-spike/index.html?candidate=${candidate}&workload=${workload}&seed=17`);
      await expect(page.getByRole('status')).toHaveText(`${candidate} ready (${expectedRenderer})`, { timeout: 20_000 });
      const result = await page.evaluate(() => {
        const state = (window as unknown as { animationSpike: {
          workload: { id: string; checksum: string; board: Array<Array<{ level: number }>> };
          session: { instance: { renderer: string; snapshot: () => { board: Array<Array<{ level: number }>> } } };
        } }).animationSpike;
        return {
          id: state.workload.id,
          checksum: state.workload.checksum,
          renderer: state.session.instance.renderer,
          levels: state.session.instance.snapshot().board.flat().map(creature => creature?.level),
        };
      });
      const expectedCounts = workload === 'dense-paramecium' ? [64, 0, 0, 0, 0]
        : workload === 'dense-amoeba' ? [0, 64, 0, 0, 0] : [16, 16, 11, 11, 10];
      const observedCounts = [0, 1, 2, 3, 4].map(level => result.levels.filter(value => value === level).length);
      expect(result.id).toBe(workload);
      expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(result.renderer).toBe(expectedRenderer);
      expect(observedCounts).toEqual(expectedCounts);
      await expect(page.locator('#candidate-root canvas')).toBeVisible();
    });
  }

  test(`${candidate} candidate supports touch selection in mobile emulation`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Touchscreen emulation is configured for the mobile project');
    const expectedRenderer = candidate === 'webgl' ? 'webgl' : 'canvas';
    await page.goto(`/experiments/animation-spike/index.html?candidate=${candidate}&workload=dense-paramecium&seed=17`);
    await expect(page.getByRole('status')).toHaveText(`${candidate} ready (${expectedRenderer})`, { timeout: 20_000 });
    const canvas = page.locator('#candidate-root canvas');
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Candidate canvas has no bounds');
    await page.touchscreen.tap(bounds.x + bounds.width * 2.5 / 8, bounds.y + bounds.height * 2.5 / 8);
    await expect.poll(() => page.evaluate(() => {
      const state = (window as unknown as { animationSpike: { session: { instance: { snapshot: () => { selected: { row: number; col: number } | null } } } } }).animationSpike;
      return state.session.instance.snapshot().selected;
    })).toEqual({ row: 2, col: 2 });
  });

  test(`${candidate} candidate preserves deterministic drag and reset outcomes`, async ({ page }) => {
    const expectedRenderer = candidate === 'webgl' ? 'webgl' : 'canvas';
    await page.goto(`/experiments/animation-spike/index.html?candidate=${candidate}&workload=dense-paramecium&seed=17`);
    await expect(page.getByRole('status')).toHaveText(`${candidate} ready (${expectedRenderer})`, { timeout: 20_000 });
    const result = await page.evaluate(async () => {
      const levelModulePath = '/src/game/level.ts';
      const randomModulePath = '/src/game/random.ts';
      const { GameLevel } = await import(levelModulePath);
      const { seededRandom } = await import(randomModulePath);
      const state = (window as unknown as { animationSpike: {
        workload: { board: Array<Array<{ id: string; level: number }>>; seed: number };
        session: { instance: {
        snapshot: () => { board: Array<Array<{ id: string }>> };
        dispatch: (action: unknown) => Promise<{ accepted: boolean }>;
      } } } }).animationSpike;
      const expected = new GameLevel(state.workload.board, { random: seededRandom(state.workload.seed) });
      const expectedAccepted = await expected.move({ row: 3, col: 3 }, { row: 3, col: 4 });
      const acknowledgment = await state.session.instance.dispatch({ atMs: 250, type: 'drag', from: { row: 3, col: 3 }, to: { row: 3, col: 4 } });
      const actualOutcome = state.session.instance.snapshot().board;
      const expectedOutcome = expected.state.board;
      const reset = await state.session.instance.dispatch({ atMs: 2_000, type: 'reset' });
      const resetBoard = state.session.instance.snapshot().board.flat();
      return {
        accepted: acknowledgment.accepted,
        expectedAccepted,
        dragMatchesExpected: JSON.stringify(actualOutcome) === JSON.stringify(expectedOutcome),
        resetAccepted: reset.accepted,
        resetCellCount: resetBoard.filter(Boolean).length,
        uniqueResetIds: new Set(resetBoard.map(creature => creature?.id)).size,
      };
    });
    expect(result).toEqual({ accepted: true, expectedAccepted: true, dragMatchesExpected: true, resetAccepted: true, resetCellCount: 64, uniqueResetIds: 64 });
  });

  test(`${candidate} candidate resolves a pointer-driven reaction and refill like the seeded game model`, async ({ page }) => {
    const expectedRenderer = candidate === 'webgl' ? 'webgl' : 'canvas';
    await page.goto(`/experiments/animation-spike/index.html?candidate=${candidate}&workload=mixed&seed=17`);
    await expect(page.getByRole('status')).toHaveText(`${candidate} ready (${expectedRenderer})`, { timeout: 20_000 });
    const result = await page.evaluate(async () => {
      const mechanicsModulePath = '/src/game/board.ts';
      const levelModulePath = '/src/game/level.ts';
      const randomModulePath = '/src/game/random.ts';
      const [{ reactionProducingMoves }, { GameLevel }, { seededRandom }] = await Promise.all([
        import(mechanicsModulePath),
        import(levelModulePath),
        import(randomModulePath),
      ]);
      const state = (window as unknown as { animationSpike: {
        workload: { board: Array<Array<{ id: string; level: number }>>; seed: number };
        session: { instance: { dispatch: (action: unknown) => Promise<{ accepted: boolean; outcome: unknown }>; snapshot: () => { board: unknown } } };
      } }).animationSpike;
      const moves = reactionProducingMoves(state.workload.board);
      const move = moves[0];
      if (!move) throw new Error('Mixed fixture has no reaction-producing adjacent move');

      const expectedLevel = new GameLevel(state.workload.board as never, { random: seededRandom(state.workload.seed) });
      const expectedAccepted = await expectedLevel.move(move.first, move.second);
      const acknowledgments = (window as unknown as { animationSpike: { acknowledgments: Array<{ action: { type: string }; accepted: boolean }> } }).animationSpike.acknowledgments;
      const beforeCount = acknowledgments.length;
      const pending = state.session.instance.dispatch({ atMs: 250, type: 'drag', from: move.first, to: move.second });
      const started = performance.now();
      while (acknowledgments.length === beforeCount && performance.now() - started < 5_000) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      const acknowledgment = await pending;
      const actual = JSON.stringify(state.session.instance.snapshot().board);
      const expected = JSON.stringify(expectedLevel.state.board);
      return {
        move,
        expectedAccepted,
        accepted: acknowledgment.accepted,
        outcomeMatches: actual === expected,
        actionType: acknowledgments.at(-1)?.action.type,
      };
    });

    expect(result.expectedAccepted).toBe(true);
    expect(result.accepted).toBe(true);
    expect(result.outcomeMatches).toBe(true);
    expect(result.actionType).toBe('drag');
  });

  test(`${candidate} candidate respects reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const expectedRenderer = candidate === 'webgl' ? 'webgl' : 'canvas';
    await page.goto(`/experiments/animation-spike/index.html?candidate=${candidate}&workload=dense-paramecium&seed=17`);
    await expect(page.getByRole('status')).toHaveText(`${candidate} ready (${expectedRenderer})`, { timeout: 20_000 });
    const signature = async (): Promise<string> => page.evaluate(() => {
      const canvas = document.querySelector('#candidate-root canvas') as HTMLCanvasElement;
      return canvas.toDataURL();
    });
    const first = await signature();
    await page.waitForTimeout(500);
    expect(await signature()).toEqual(first);
  });
}
