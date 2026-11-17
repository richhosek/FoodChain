import { expect, test } from '@playwright/test';

test('real animated boundary cells are contained on an unclipped surface', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const boardPath = '/src/view/board-view.ts';
    const parameciumMotionPath = '/src/view/paramecium-motion.ts';
    const { BoardView } = await import(boardPath);
    const { updateParameciumMotion } = await import(parameciumMotionPath);
    const positions = [[0, 0], [0, 4], [0, 7], [4, 0], [4, 7], [7, 0], [7, 4], [7, 7]];
    const makeBoard = (level: number) => {
      const board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null as any));
      for (const [row, col] of positions) board[row]![col!] = { id: `edge-${level}-${row}-${col}`, level };
      return board;
    };
    const mount = document.createElement('div');
    document.body.append(mount);
    const view = new BoardView(mount, makeBoard(1), () => {}, () => false);
    const deadline = performance.now() + 30000;
    while (!view.scene || view.assetStatus === 'loading' || view.amoebaAssetStatus === 'loading') {
      if (performance.now() > deadline) throw new Error('Timed out waiting for artwork');
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (view.assetStatus !== 'ready' || view.amoebaAssetStatus !== 'ready') throw new Error('Artwork unavailable');
    const surface = document.createElement('canvas');
    surface.width = surface.height = 256;
    const context = surface.getContext('2d', { willReadFrequently: true })!;
    const failures: string[] = [];
    const results: Array<{ level: number; inverted: boolean; samples: number; frames: number[]; bounds: number[] }> = [];
    for (const level of [0, 1]) for (const inverted of [false, true]) {
      const board = makeBoard(level);
      view.render(board, new Set(inverted ? positions.map(([row, col]) => `${row},${col}`) : []));
      const frameIndices = new Set<number>();
      const bounds = [256, 256, 0, 0];
      let samples = 0;
      for (let step = 0; step < 32; step++) {
        if (level === 0) {
          for (const entry of view.paramecia.values()) entry.advance(0.125, false);
        } else {
          view.amoebaRenderer.advance(0.125, false);
        }
        for (const [row, col] of positions) {
          const id = `edge-${level}-${row}-${col}`;
          const piece = view.cells.get(`${row},${col}`);
          const centerX = col! * 100 + 50, centerY = row! * 100 + 50;
          if (piece.x !== centerX || piece.y !== centerY) throw new Error(`Unexpected board position ${id}`);
          context.setTransform(1, 0, 0, 1, 0, 0);
          context.clearRect(0, 0, 256, 256);
          if (level === 0) {
            const artwork = piece.list[1];
            const eye = artwork.getByName('paramecium-eye');
            for (const image of [artwork.list[0], eye.list[0]]) {
              const matrix = image.getWorldTransformMatrix();
              context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx - centerX + 128, matrix.ty - centerY + 128);
              context.drawImage(image.texture.getSourceImage(), -image.width * image.originX, -image.height * image.originY);
            }
            frameIndices.add(updateParameciumMotion(view.parameciumStates.getOrCreate(id), 0, true).ciliaFrameIndex);
          } else {
            const renderer = view.amoebaRenderer;
            const cell = renderer.cells.get(id);
            if (!cell || cell.inverted !== inverted) throw new Error(`Missing amoeba renderer cell ${id}`);
            frameIndices.add(cell.frame.bodyFrameIndex);
            const original = renderer.context.drawImage;
            renderer.context.drawImage = (image: CanvasImageSource, x: number, y: number, width: number, height: number) => {
              context.setTransform(1, 0, 0, 1, 0, 0);
              context.drawImage(image, x - centerX + 128, y - centerY + 128, width, height);
            };
            try { renderer.drawCell(cell); } finally { renderer.context.drawImage = original; }
          }
          const pixels = context.getImageData(0, 0, 256, 256).data;
          let count = 0, outside = 0, edge = 0;
          for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
            if (!pixels[(y * 256 + x) * 4 + 3]) continue;
            count++;
            bounds[0] = Math.min(bounds[0]!, x - 128); bounds[1] = Math.min(bounds[1]!, y - 128);
            bounds[2] = Math.max(bounds[2]!, x + 1 - 128); bounds[3] = Math.max(bounds[3]!, y + 1 - 128);
            if (x < 78 || x >= 178 || y < 78 || y >= 178) outside++;
            if (x === 0 || y === 0 || x === 255 || y === 255) edge++;
          }
          if (!count || outside || edge) failures.push(`${id} inverse=${inverted} step=${step} pixels=${count} outside=${outside} surfaceEdge=${edge}`);
          samples++;
        }
      }
      results.push({ level, inverted, samples, frames: [...frameIndices].sort((first, second) => first - second), bounds });
    }
    view.destroy();
    mount.remove();
    return { results, failures, stepSeconds: 0.125, surfaceSize: 256, cellBounds: [-50, -50, 50, 50], alphaThreshold: 1 };
  });
  console.log(`EDGE ANIMATION ${testInfo.project.name} ${JSON.stringify(result)}`);
  expect(result.results).toHaveLength(4);
  for (const sample of result.results) {
    expect(sample.samples).toBe(256);
    expect(sample.frames.length, 'Animation must actually advance through multiple frames').toBeGreaterThan(1);
  }
  expect(result.failures).toEqual([]);
});