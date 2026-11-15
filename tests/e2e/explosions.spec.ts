import { expect, test } from '@playwright/test';

for (const count of [4, 5, 6, 7, 8]) {
  test(`${count} predators flash and clear the correct footprint`, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
    const result = await page.evaluate(async predatorCount => {
      const gamePath = '/src/game/index.ts';
      const viewPath = '/src/view/board-view.ts';
      const { resolveWave } = await import(gamePath);
      const { BoardView } = await import(viewPath);
      const surrounding = [[2, 2], [2, 3], [2, 4], [3, 2], [3, 4], [4, 2], [4, 3], [4, 4]];
      const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({ id: `${row}-${col}`, level: 0 })));
      for (const [row, col] of surrounding.slice(0, predatorCount)) board[row][col].level = 1;
      const wave = resolveWave(board, [{ row: 3, col: 3 }], (level: number) => ({ id: 'created', level }));
      const mount = document.createElement('div');
      document.body.append(mount);
      const view = new BoardView(mount, board, () => {}, () => false);
      const canvas = mount.querySelector('canvas')!;
      const context = canvas.getContext('2d')!;
      const sample = () => Array.from({ length: 64 }, (_, index) => Array.from(context.getImageData(index % 8 * 100 + 20, Math.floor(index / 8) * 100 + 20, 1, 1).data).slice(0, 3).join(','));
      await new Promise(resolve => setTimeout(resolve, 200));
      const samples: string[][] = [];
      let active = true;
      const capture = () => { samples.push(sample()); if (active) requestAnimationFrame(capture); };
      const pending = view.effect({ type: 'reaction', wave, signal: new AbortController().signal });
      const phaseDeadline = performance.now() + 5000;
      while (sample()[18] !== '14,44,107' && performance.now() < phaseDeadline) await new Promise(resolve => setTimeout(resolve, 8));
      if (sample()[18] !== '14,44,107') throw new Error('Reaction flash did not start after convergence');
      requestAnimationFrame(capture);
      await pending;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      active = false;
      const after = sample();
      mount.remove();
      return { samples, after, explosionCells: wave.explosionCells, afterBoard: wave.after };
    }, count);
    const radius = count === 4 ? 1 : count === 5 ? 2 : 8;
    const affected = Array.from({ length: 64 }, (_, index) => {
      const row = Math.floor(index / 8), col = index % 8;
      return (row !== 3 || col !== 3) && Math.abs(row - 3) <= radius && Math.abs(col - 3) <= radius;
    });
    const expectedCells = affected.flatMap((included, index) => included ? [{ row: Math.floor(index / 8), col: index % 8 }] : []);
    expect(result.explosionCells).toEqual(expectedCells);
    const observed = result.samples.map(sample => sample[2 * 8 + 2]).filter(color => ['14,44,107', '241,211,148'].includes(color));
    const phases = observed.filter((color, index, colors) => index === 0 || color !== colors[index - 1]);
    expect(new Set(phases)).toEqual(new Set(['14,44,107', '241,211,148']));
    expect(phases.length).toBeGreaterThanOrEqual(3);
    for (const sample of result.samples.slice(0, -2)) {
      const inverted = sample[18] === '14,44,107';
      if (!inverted && sample[18] !== '241,211,148') continue;
      for (let index = 0; index < 64; index++) {
        const predator = [[2, 2], [2, 3], [2, 4], [3, 2], [3, 4], [4, 2], [4, 3], [4, 4]].slice(0, count).some(([row, col]) => row * 8 + col === index);
        const normal = predator ? [241, 211, 148] : [185, 220, 184];
        const expected = normal.map(channel => affected[index] && inverted ? 255 - channel : channel).join(',');
        expect(sample[index]).toBe(expected);
      }
    }
    expect(result.afterBoard[3][3]).toEqual({ id: 'created', level: 2 });
    expect(result.after[27]).toBe('239,169,151');
    for (let index = 0; index < 64; index++) {
      if (index === 27) continue;
      if (affected[index]) {
        expect(result.afterBoard[Math.floor(index / 8)][index % 8]).toBeNull();
        expect(result.after[index]).toBe(result.after[18]);
        expect(result.after[index]).not.toBe('185,220,184');
        expect(result.after[index]).not.toBe('241,211,148');
      } else {
        expect(result.afterBoard[Math.floor(index / 8)][index % 8]).not.toBeNull();
        expect(result.after[index]).toBe('185,220,184');
      }
    }
  });
}