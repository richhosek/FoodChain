import { expect, test } from '@playwright/test';

test('labels center and scale their actual ink without changing the cell container', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const boardPath = '/src/view/board-view.ts';
    const labelPath = '/src/view/creature-label.ts';
    const { BoardView } = await import(boardPath);
    const { createCreatureLabelRenderer } = await import(labelPath);
    const mount = document.createElement('div');
    document.body.append(mount);
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({ id: `${row}-${col}`, level: 2 })));
    const view = new BoardView(mount, board, () => {}, () => false);
    while (!view.scene) await new Promise(resolve => requestAnimationFrame(resolve));
    const renderer = createCreatureLabelRenderer(view.scene);
    const values = [];
    for (const family of ['Arial, sans-serif', 'MissingCreatureFont, monospace']) {
      for (let digit = 0; digit < 5; digit++) {
        const fraction = .75 + digit * .05;
        const label = renderer.create(String(digit), 100, fraction, '#264e3a', family);
        const canvas = label.canvas as HTMLCanvasElement;
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
        let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (!pixels[(y * canvas.width + x) * 4 + 3]) continue;
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
        }
        const output = document.createElement('canvas');
        output.width = output.height = 140;
        const context = output.getContext('2d')!;
        context.translate(70 + label.x, 70 + label.y);
        context.scale(label.scaleX, label.scaleY);
        context.drawImage(canvas, -label.displayOriginX, -label.displayOriginY);
        const rendered = context.getImageData(0, 0, 140, 140).data;
        let outputLeft = 140, outputTop = 140, outputRight = 0, outputBottom = 0;
        for (let y = 0; y < 140; y++) for (let x = 0; x < 140; x++) {
          if (rendered[(y * 140 + x) * 4 + 3]! < 128) continue;
          outputLeft = Math.min(outputLeft, x); outputTop = Math.min(outputTop, y);
          outputRight = Math.max(outputRight, x + 1); outputBottom = Math.max(outputBottom, y + 1);
        }
        values.push({
          longest: Math.max(right - left, bottom - top) * label.scaleX,
          centerX: label.x + ((left + right) / 2 - label.displayOriginX) * label.scaleX,
          centerY: label.y + ((top + bottom) / 2 - label.displayOriginY) * label.scaleY,
          outputLongest: Math.max(outputRight - outputLeft, outputBottom - outputTop),
          outputCenterX: (outputLeft + outputRight) / 2 - 70,
          outputCenterY: (outputTop + outputBottom) / 2 - 70,
          scaleX: label.scaleX, scaleY: label.scaleY, fraction,
        });
      }
    }
    const piece = view.cells.get('0,0');
    const cell = { x: piece.x, y: piece.y, scaleX: piece.scaleX, scaleY: piece.scaleY };
    renderer.destroy();
    view.game.destroy(true);
    mount.remove();
    return { values, cell };
  });
  for (const value of results.values) {
    expect(value.longest).toBeCloseTo(100 * value.fraction, 5);
    expect(value.centerX).toBeCloseTo(0, 5);
    expect(value.centerY).toBeCloseTo(0, 5);
    expect(value.scaleX).toBe(value.scaleY);
    expect(Math.abs(value.outputLongest - 100 * value.fraction)).toBeLessThanOrEqual(1);
    expect(Math.abs(value.outputCenterX)).toBeLessThanOrEqual(1);
    expect(Math.abs(value.outputCenterY)).toBeLessThanOrEqual(1);
  }
  expect(results.cell).toEqual({ x: 50, y: 50, scaleX: 1, scaleY: 1 });
});

test('font invalidation refreshes live labels and disposal stops refreshes', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const boardPath = '/src/view/board-view.ts';
    const labelPath = '/src/view/creature-label.ts';
    const { BoardView } = await import(boardPath);
    const { createCreatureLabelRenderer } = await import(labelPath);
    const mount = document.createElement('div');
    document.body.append(mount);
    const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({ id: `${row}-${col}`, level: 2 })));
    const view = new BoardView(mount, board, () => {}, () => false);
    while (!view.scene) await new Promise(resolve => requestAnimationFrame(resolve));
    const renderer = createCreatureLabelRenderer(view.scene);
    const label = renderer.create('4', 100, .95, '#264e3a', 'CreatureLateFont, monospace');
    const before = label.scaleX;
    const face = new FontFace('CreatureLateFont', 'local("Arial")', { weight: '700' });
    document.fonts.add(face);
    const loaded = new Promise<void>(resolve => document.fonts.addEventListener('loadingdone', () => resolve(), { once: true }));
    await face.load();
    await loaded;
    const after = label.scaleX;
    label.destroy();
    renderer.refresh();
    const remaining = renderer.create('3', 100, .9, '#264e3a');
    renderer.destroy();
    remaining.setScale(123);
    document.fonts.dispatchEvent(new Event('loadingdone'));
    const disposedScale = remaining.scaleX;
    document.fonts.delete(face);
    view.game.destroy(true);
    mount.remove();
    return { before, after, disposedScale };
  });
  expect(result.after).not.toBe(result.before);
  expect(result.disposedScale).toBe(123);
});