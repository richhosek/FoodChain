import assert from 'node:assert/strict';
import test from 'node:test';
import { createAmoebaMotion, updateAmoebaMotion } from '../../src/view/amoeba-motion.ts';
import { AmoebaStateRegistry } from '../../src/view/amoeba-state.ts';

test('redraw, selection, flash, movement, and falling reuse state by creature identity', () => {
  const registry = new AmoebaStateRegistry();
  const first = registry.getOrCreate('amoeba-a');
  const second = registry.getOrCreate('amoeba-b');
  updateAmoebaMotion(first, 1.25);

  for (const phase of ['redraw', 'selection', 'flash', 'swap', 'falling']) {
    assert.equal(registry.getOrCreate('amoeba-a'), first, phase);
    assert.equal(registry.getOrCreate('amoeba-b'), second, phase);
  }
  assert.notEqual(first, second);
  assert.equal(first.elapsedSeconds, 1.25);
});

test('move commit prunes removed and uncommitted identities but retains survivors and committed spawns', () => {
  const registry = new AmoebaStateRegistry();
  const survivor = registry.getOrCreate('survivor');
  registry.getOrCreate('removed');
  registry.beginMove();
  const committedSpawn = registry.getOrCreate('committed-spawn');
  registry.getOrCreate('uncommitted-spawn');

  registry.commit(['survivor', 'committed-spawn']);

  assert.equal(registry.get('survivor'), survivor);
  assert.equal(registry.get('committed-spawn'), committedSpawn);
  assert.equal(registry.get('removed'), undefined);
  assert.equal(registry.get('uncommitted-spawn'), undefined);
});

test('cancelled or failed move restores prior states and discards temporary identities', () => {
  const registry = new AmoebaStateRegistry();
  const original = registry.getOrCreate('existing');
  updateAmoebaMotion(original, 0.75);
  registry.beginMove();
  updateAmoebaMotion(original, 0.5);
  registry.getOrCreate('temporary-spawn');
  registry.rollback();

  assert.equal(registry.get('existing'), original);
  assert.equal(registry.get('existing')?.elapsedSeconds, 1.25);
  assert.equal(registry.get('temporary-spawn'), undefined);
});

test('successful reset advances generation and gives reused IDs fresh state', () => {
  const registry = new AmoebaStateRegistry();
  const generation = registry.generation;
  const old = registry.getOrCreate('reused-id');
  registry.beginReset();
  registry.resetSucceeded();
  const replacement = registry.getOrCreate('reused-id');

  assert.equal(registry.generation, generation + 1);
  assert.notEqual(replacement, old);
  assert.equal(old.elapsedSeconds, 0);
});

test('failed reset restores checkpoint state and generation despite the game epoch changing', () => {
  const registry = new AmoebaStateRegistry();
  const generation = registry.generation;
  const original = registry.getOrCreate('original');
  updateAmoebaMotion(original, 2);
  registry.beginReset();
  registry.getOrCreate('temporary-reset-id');
  registry.resetFailed();

  assert.equal(registry.generation, generation);
  assert.equal(registry.get('original'), original);
  assert.equal(registry.get('original')?.elapsedSeconds, 2);
  assert.equal(registry.get('temporary-reset-id'), undefined);
});

test('generation guards reject stale callbacks after reset and shutdown', () => {
  const registry = new AmoebaStateRegistry();
  const previousGeneration = registry.generation;
  registry.beginReset();
  registry.resetSucceeded();
  assert.equal(registry.isCurrentGeneration(previousGeneration), false);
  assert.equal(registry.isCurrentGeneration(registry.generation), true);

  const activeGeneration = registry.generation;
  registry.getOrCreate('active');
  registry.shutdown();
  assert.equal(registry.isCurrentGeneration(activeGeneration), false);
  assert.equal(registry.get('active'), undefined);
  assert.throws(() => registry.getOrCreate('after-shutdown'), /shut down/);
});

test('registry-created state matches the pure constructor and validates move checkpoints', () => {
  const registry = new AmoebaStateRegistry();
  assert.deepEqual(
    updateAmoebaMotion(registry.getOrCreate('same'), 0.05),
    updateAmoebaMotion(createAmoebaMotion('0:same'), 0.05),
  );
  registry.beginMove();
  assert.throws(() => registry.beginReset(), /checkpoint is already active/);
  registry.rollback();
});
