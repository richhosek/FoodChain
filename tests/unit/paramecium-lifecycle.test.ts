import test from 'node:test';
import assert from 'node:assert/strict';
import { ParameciumStateRegistry } from '../../src/view/paramecium-state.ts';
import { updateParameciumMotion } from '../../src/view/paramecium-motion.ts';

test('redraw, selection, flash, swap, and falling reuse state by creature identity', () => {
  const registry = new ParameciumStateRegistry();
  const first = registry.getOrCreate('creature-a');
  const second = registry.getOrCreate('creature-b');
  updateParameciumMotion(first, 1.25);

  for (const viewPass of ['redraw', 'selection', 'flash', 'swap', 'falling']) {
    assert.equal(registry.getOrCreate('creature-a'), first, viewPass);
    assert.equal(registry.getOrCreate('creature-b'), second, viewPass);
  }
  assert.notEqual(first, second);
  assert.equal(first.elapsedSeconds, 1.25);
});

test('spawned and replacement IDs get independent state while old identities remain until commit', () => {
  const registry = new ParameciumStateRegistry();
  const original = registry.getOrCreate('original');
  registry.beginMove();

  const spawned = registry.getOrCreate('spawned');
  const replacement = registry.getOrCreate('replacement');

  assert.notEqual(spawned, replacement);
  assert.equal(registry.getOrCreate('original'), original);
  assert.equal(registry.get('original'), original);
});

test('move commit prunes removed identities and uncommitted spawned identities', () => {
  const registry = new ParameciumStateRegistry();
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

test('cancelled or failed move rollback discards new IDs and retains prior state objects and phases', () => {
  const registry = new ParameciumStateRegistry();
  const original = registry.getOrCreate('existing');
  updateParameciumMotion(original, 0.75);
  const originalPhase = original.elapsedSeconds;
  registry.beginMove();

  updateParameciumMotion(original, 0.5);
  registry.getOrCreate('temporary-spawn');
  registry.rollback();

  assert.equal(registry.get('existing'), original);
  assert.equal(registry.get('existing')?.elapsedSeconds, originalPhase + 0.5);
  assert.equal(registry.get('temporary-spawn'), undefined);
});

test('successful reset advances view generation and clears states even when creature IDs are reused', () => {
  const registry = new ParameciumStateRegistry();
  const previousGeneration = registry.generation;
  const previousState = registry.getOrCreate('reused-id');
  registry.beginReset();
  registry.resetSucceeded();

  const replacementState = registry.getOrCreate('reused-id');
  assert.equal(registry.generation, previousGeneration + 1);
  assert.notEqual(replacementState, previousState);
  assert.equal(previousState.elapsedSeconds, 0);
});

test('failed reset restores the checkpoint and view generation despite a changed game epoch', () => {
  const registry = new ParameciumStateRegistry();
  const generation = registry.generation;
  const existing = registry.getOrCreate('existing');
  updateParameciumMotion(existing, 2);
  registry.beginReset();
  registry.getOrCreate('reset-board-id');

  const advancedGameEpoch = 1;
  assert.equal(advancedGameEpoch, 1);
  registry.resetFailed();

  assert.equal(registry.generation, generation);
  assert.equal(registry.get('existing'), existing);
  assert.equal(registry.get('existing')?.elapsedSeconds, 2);
  assert.equal(registry.get('reset-board-id'), undefined);
});

test('generation guards reject stale callbacks after reset and shutdown', () => {
  const registry = new ParameciumStateRegistry();
  const oldGeneration = registry.generation;
  registry.beginReset();
  registry.resetSucceeded();

  assert.equal(registry.isCurrentGeneration(oldGeneration), false);
  assert.equal(registry.isCurrentGeneration(registry.generation), true);

  const activeGeneration = registry.generation;
  registry.getOrCreate('active');
  registry.shutdown();

  assert.equal(registry.isCurrentGeneration(activeGeneration), false);
  assert.equal(registry.get('active'), undefined);
  assert.throws(() => registry.getOrCreate('after-shutdown'), /shut down/);
});