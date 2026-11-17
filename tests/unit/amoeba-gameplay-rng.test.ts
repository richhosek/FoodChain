import assert from 'node:assert/strict';
import test from 'node:test';
import { cloneBoard, generateBoard, refillBoard } from '../../src/game/board.ts';
import { seededRandom } from '../../src/game/random.ts';
import { createAmoebaMotion, updateAmoebaMotion } from '../../src/view/amoeba-motion.ts';
import { AmoebaStateRegistry } from '../../src/view/amoeba-state.ts';

function countedRandom(seed: number) {
  const source = seededRandom(seed);
  let draws = 0;
  return {
    next() {
      draws += 1;
      return source();
    },
    get draws() { return draws; },
  };
}

function exerciseAmoebaVisuals(): void {
  const registry = new AmoebaStateRegistry();
  for (let index = 0; index < 64; index += 1) {
    const state = registry.getOrCreate(`amoeba-${index}`);
    updateAmoebaMotion(state, 0.05);
  }
  const standalone = createAmoebaMotion('standalone');
  for (let index = 0; index < 400; index += 1) updateAmoebaMotion(standalone, 0.05);
}

test('amoeba visual state never calls global Math.random', () => {
  const originalRandom = Math.random;
  let calls = 0;
  Math.random = () => {
    calls += 1;
    throw new Error('Amoeba visual animation called global Math.random');
  };
  try {
    exerciseAmoebaVisuals();
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(calls, 0);
});

test('amoeba visual work leaves seeded board generation and refill draws unchanged', async () => {
  const baselineRandom = countedRandom(0x009);
  const visualRandom = countedRandom(0x009);
  const baselineBoard = await generateBoard(baselineRandom.next, { yieldControl: async () => {} });
  const visualBoard = await generateBoard(visualRandom.next, { yieldControl: async () => {} });
  assert.deepEqual(visualBoard, baselineBoard);
  assert.equal(visualRandom.draws, baselineRandom.draws);

  exerciseAmoebaVisuals();
  assert.equal(visualRandom.draws, baselineRandom.draws);

  const baselineWithHoles = cloneBoard(baselineBoard);
  const visualWithHoles = cloneBoard(visualBoard);
  for (let col = 0; col < 4; col += 1) {
    baselineWithHoles[0]![col] = null;
    visualWithHoles[0]![col] = null;
  }
  let baselineId = 0;
  let visualId = 0;
  const baselineRefill = refillBoard(baselineWithHoles, baselineRandom.next, level => ({ id: `spawn-${baselineId++}`, level }));
  const visualRefill = refillBoard(visualWithHoles, visualRandom.next, level => ({ id: `spawn-${visualId++}`, level }));
  assert.deepEqual(visualRefill, baselineRefill);
  assert.equal(visualRandom.draws, baselineRandom.draws);
});
