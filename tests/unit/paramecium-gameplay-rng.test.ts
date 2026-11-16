import assert from 'node:assert/strict';
import test from 'node:test';
import { cloneBoard, generateBoard, refillBoard } from '../../src/game/board.ts';
import { seededRandom } from '../../src/game/random.ts';
import { createParameciumMotion, updateParameciumMotion } from '../../src/view/paramecium-motion.ts';
import { ParameciumStateRegistry } from '../../src/view/paramecium-state.ts';

function countedRandom(seed: number) {
  const source = seededRandom(seed);
  let draws = 0;
  return {
    next() {
      draws += 1;
      return source();
    },
    get draws() {
      return draws;
    },
  };
}

function exerciseVisualState(): void {
  const registry = new ParameciumStateRegistry();
  for (let index = 0; index < 64; index += 1) {
    const state = registry.getOrCreate(`creature-${index}`);
    updateParameciumMotion(state, 0.05);
  }

  const standalone = createParameciumMotion('standalone');
  for (let index = 0; index < 200; index += 1) updateParameciumMotion(standalone, 0.05);
}

test('paramecium visual state never calls global Math.random', () => {
  const originalRandom = Math.random;
  let calls = 0;
  Math.random = () => {
    calls += 1;
    throw new Error('Visual animation called global Math.random');
  };

  try {
    exerciseVisualState();
  } finally {
    Math.random = originalRandom;
  }

  assert.equal(calls, 0);
});

test('visual state work leaves seeded board generation and refill draws unchanged', async () => {
  const baselineRandom = countedRandom(0x008);
  const visualRandom = countedRandom(0x008);
  const baselineBoard = await generateBoard(baselineRandom.next, { yieldControl: async () => {} });
  const visualBoard = await generateBoard(visualRandom.next, { yieldControl: async () => {} });

  assert.deepEqual(visualBoard, baselineBoard);
  assert.equal(visualRandom.draws, baselineRandom.draws);
  exerciseVisualState();
  assert.equal(visualRandom.draws, baselineRandom.draws);

  const boardWithHoles = cloneBoard(baselineBoard);
  for (let col = 0; col < 4; col += 1) boardWithHoles[0]![col] = null;
  let baselineId = 0;
  let visualId = 0;
  const baselineRefill = refillBoard(boardWithHoles, baselineRandom.next, level => ({ id: `spawn-${baselineId++}`, level }));
  const visualRefill = refillBoard(boardWithHoles, visualRandom.next, level => ({ id: `spawn-${visualId++}`, level }));

  assert.deepEqual(visualRefill, baselineRefill);
  assert.equal(visualRandom.draws, baselineRandom.draws);
});