import test from 'node:test';
import assert from 'node:assert/strict';
import { boardWith, pos } from '../fixtures/boards.ts';
import { seededRandom, scriptedRandom, sampleLevel } from '../../src/game/random.ts';
import { generateBoard, neighbors, swapBoard, predictsReaction, hasReactingSwap, refillBoard } from '../../src/game/board.ts';
import { resolveWave } from '../../src/game/mechanics.ts';
import { createLevel, GameLevel } from '../../src/game/level.ts';
import type { Board, Creature, Level } from '../../src/game/creature.ts';

const makeCreature = (() => {
  let id = 0;
  return (level: Level): Creature => ({ id: `new-${id++}`, level });
})();

test('weighted sampling, scripted and seeded randomness are deterministic', () => {
  assert.deepEqual([0, .399, .4, .67, .84, .94, .999].map(value => sampleLevel(() => value)), [0, 0, 1, 2, 3, 4, 4]);
  const first = seededRandom(42), second = seededRandom(42);
  assert.deepEqual(Array.from({ length: 20 }, first), Array.from({ length: 20 }, second));
  const scripted = scriptedRandom([.1, .9]);
  assert.equal(scripted(), .1);
  assert.equal(scripted(), .9);
  assert.throws(() => scripted());
});

test('board generation is reproducible, valid, and cancellable while retrying', async () => {
  const first = await generateBoard(seededRandom(123));
  const second = await generateBoard(seededRandom(123));
  assert.deepEqual(first, second);
  assert.deepEqual([...new Set(first.flat().map(cell => cell?.level))].sort(), [0, 1, 2, 3, 4]);
  assert.equal(hasReactingSwap(first), true);
  const controller = new AbortController();
  await assert.rejects(generateBoard(() => 0, { signal: controller.signal, batchSize: 1, yieldControl: async () => controller.abort() }), { name: 'AbortError' });
});

test('neighbors and pure swap prediction include diagonals and exclude stationary prey', () => {
  const board = boardWith([[0, 1, 1], [1, 0, 1], [1, 1, 1]]);
  assert.equal(neighbors(pos(0, 0)).length, 3);
  assert.equal(neighbors(pos(3, 3)).length, 8);
  const before = structuredClone(board);
  assert.equal(predictsReaction(board, pos(0, 0), pos(0, 1)), true);
  assert.equal(predictsReaction(board, pos(6, 6), pos(6, 7)), false);
  assert.equal(predictsReaction(board, pos(0, 0), pos(1, 1)), false);
  assert.deepEqual(board, before);
  assert.equal(swapBoard(board, pos(0, 0), pos(7, 7)), null);
});

test('waves handle predator thresholds, blasts, apex, and overlapping creations', () => {
  const surrounding: Array<[number, number]> = [[2, 2], [2, 3], [2, 4], [3, 2], [3, 4], [4, 2], [4, 3], [4, 4]];
  for (let count = 2; count <= 8; count++) {
    const board = boardWith(surrounding.slice(0, count).map(([row, col]) => [row, col, 1]));
    const wave = resolveWave(board, [pos(3, 3)], makeCreature);
    if (count === 2) { assert.equal(wave, null); continue; }
    assert.ok(wave);
    assert.equal(wave.reactions[0].predators.length, count);
    assert.equal(wave.after[3][3]?.level, 2);
    assert.equal(wave.removed.length, count === 3 ? 4 : count === 4 ? 9 : count === 5 ? 25 : 64);
    assert.equal(wave.explosionCells.length, count === 3 ? 0 : count === 4 ? 8 : count === 5 ? 24 : 63);
  }
  const apex = boardWith(surrounding.slice(0, 3).map(([row, col]) => [row, col, 4]), 3);
  const apexWave = resolveWave(apex, [pos(3, 3)], makeCreature);
  assert.ok(apexWave?.apex);
  assert.equal(apexWave.removed.length, 64);
  assert.equal(apexWave.creations.length, 0);

  const overlap = boardWith([[2, 2, 1], [2, 3, 1], [2, 4, 1], [3, 2, 1], [3, 4, 1], [4, 2, 1], [4, 3, 1], [4, 4, 1]]);
  const combined = resolveWave(overlap, [pos(3, 3), pos(3, 5), pos(3, 3)], makeCreature);
  assert.ok(combined);
  assert.equal(combined.reactions.length, 2);
  assert.equal(combined.creations.length, 2);
  assert.equal(combined.after[3][3]?.level, 2);
  assert.equal(combined.after[3][5]?.level, 2);
  assert.equal(new Set(combined.removed.map(item => item.creature.id)).size, combined.removed.length);
});

test('gravity preserves order, records movement and samples each spawn independently', () => {
  const board: Board = boardWith();
  board[6][0] = null;
  board[7][0] = null;
  const result = refillBoard(board, scriptedRandom([.0, .99]), makeCreature);
  assert.equal(result.board[7][0]?.id, 'c5-0');
  assert.equal(result.board[6][0]?.id, 'c4-0');
  assert.deepEqual([result.board[0][0]?.level, result.board[1][0]?.level], [0, 4]);
  assert.equal(result.movements.length, 8);
  assert.equal(result.movements.filter(movement => movement.from === null).length, 2);
});

test('session resolves waves incrementally, blocks input, and reset invalidates callbacks', async () => {
  const level = await createLevel({ random: seededRandom(5) });
  const initial = level.state;
  let swap: [ReturnType<typeof pos>, ReturnType<typeof pos>] | undefined;
  for (let row = 0; row < 8 && !swap; row++) for (let col = 0; col < 8 && !swap; col++) {
    for (const next of [pos(row, col + 1), pos(row + 1, col)]) {
      if (predictsReaction(initial.board, pos(row, col), next)) { swap = [pos(row, col), next]; break; }
    }
  }
  assert.ok(swap);
  let release: (() => void) | undefined;
  let entered: (() => void) | undefined;
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  const move = level.move(...swap, async event => {
    if (event.type === 'reaction') {
      entered?.();
      await new Promise<void>(resolve => { release = resolve; });
    }
  });
  await waiting;
  assert.equal(level.state.status, 'resolving');
  assert.equal(await level.move(pos(0, 0), pos(0, 1)), false);
  await level.reset();
  const reset = level.state;
  assert.equal(await move, false);
  release?.();
  assert.deepEqual(level.state, reset);
  assert.equal(reset.turns, 0);
  assert.equal(reset.removed, 0);
  assert.equal(reset.freeMoves, 3);
  assert.notEqual(reset.epoch, initial.epoch);
});

test('generation aborts while an asynchronous yield remains pending', async () => {
  const controller = new AbortController();
  let entered: (() => void) | undefined;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const pending = generateBoard(() => 0, { signal: controller.signal, batchSize: 1, yieldControl: () => { entered?.(); return new Promise<void>(() => {}); } });
  await started;
  controller.abort();
  const result = await Promise.race([pending.then(() => 'resolved', error => error.name), new Promise<string>(resolve => setTimeout(() => resolve('timed out'), 50))]);
  assert.equal(result, 'AbortError');
});

test('non-reacting turns spend free moves and lose when none remain', async () => {
  const level = new GameLevel(boardWith(), { random: () => 0 });
  assert.equal(await level.move(pos(0, 0), pos(1, 1)), false);
  for (let turn = 1; turn <= 3; turn++) {
    assert.equal(await level.move(pos(0, 0), pos(0, 1)), true);
    assert.equal(level.state.turns, turn);
    assert.equal(level.state.freeMoves, 3 - turn);
  }
  assert.equal(level.state.status, 'lost');
  const finished = level.state;
  assert.equal(await level.move(pos(0, 0), pos(0, 1)), false);
  assert.deepEqual(level.state, finished);
});

test('zero free moves reject non-reacting swaps but permit reacting swaps and prioritize winning', async () => {
  const board = boardWith([[2, 2, 1], [2, 3, 1], [2, 4, 1], [3, 2, 1], [4, 2, 1]]);
  let draws = 0;
  const level = new GameLevel(board, { random: () => { draws++; return 0; }, yieldControl: async () => {} });
  for (let turn = 0; turn < 3; turn++) assert.equal(await level.move(pos(7, 6), pos(7, 7)), true);
  assert.equal(level.state.status, 'ready');
  const before = level.state;
  assert.equal(await level.move(pos(7, 6), pos(7, 7)), false);
  assert.deepEqual(level.state, before);
  assert.equal(draws, 0);
  assert.equal(await level.move(pos(3, 3), pos(3, 4)), true);
  assert.equal(level.state.turns, 4);
  assert.equal(level.state.freeMoves, 0);
  assert.equal(level.state.status, 'won');
});

test('both swapped prey react from one snapshot with shared predators counted once', async () => {
  const board = boardWith([[2, 2, 1], [2, 3, 1], [2, 4, 1], [2, 5, 1]]);
  const level = new GameLevel(board, { random: () => 0, yieldControl: async () => {} });
  let firstWave = true;
  await level.move(pos(3, 3), pos(3, 4), event => {
    if (event.type === 'reaction' && firstWave) {
      firstWave = false;
      assert.equal(event.wave.reactions.length, 2);
      assert.equal(event.wave.removed.length, 6);
      assert.equal(event.wave.creations.length, 2);
    }
  });
  assert.equal(firstWave, false);
  assert.equal(level.state.removed, 2);
});

test('landed and spawned creatures resolve in later snapshots without extra turns', async () => {
  const draws = [.4, .4, .4];
  const level = new GameLevel(boardWith([[2, 2, 1], [2, 3, 1], [2, 4, 1]]), {
    random: () => draws.shift() ?? 0,
    yieldControl: async () => {},
  });
  const events: string[] = [];
  assert.equal(await level.move(pos(3, 3), pos(3, 4), event => {
    events.push(event.type);
    assert.equal(level.state.status, 'resolving');
    if (event.type === 'reaction' && events.length === 3) {
      assert.deepEqual(event.wave.reactions.map(reaction => reaction.prey.position), [pos(1, 3)]);
    }
  }), true);
  assert.deepEqual(events, ['reaction', 'refill', 'reaction', 'refill']);
  assert.equal(level.state.removed, 2);
  assert.equal(level.state.turns, 1);
  assert.equal(level.state.freeMoves, 3);
  assert.equal(level.state.status, 'ready');
});

test('goal is counted from collateral and only wins after the refill animation', async () => {
  const board = boardWith([[2, 2, 1], [2, 3, 1], [2, 4, 1], [3, 2, 1], [4, 2, 1]]);
  const level = new GameLevel(board, { random: () => 0, yieldControl: async () => {} });
  assert.equal(await level.move(pos(3, 3), pos(3, 4), event => {
    assert.equal(level.state.status, 'resolving');
    if (event.type === 'refill') assert.ok(level.state.removed >= 10);
  }), true);
  assert.equal(level.state.status, 'won');
  assert.ok(level.state.removed >= 10);
  assert.equal(level.state.board.flat().filter(Boolean).length, 64);
});

test('a reached goal stays resolving through a subsequent reaction wave', async () => {
  const board = boardWith([[2, 2, 1], [2, 3, 1], [2, 4, 1], [3, 2, 1], [4, 2, 1]]);
  const draws = Array.from({ length: 14 }, (_, index) => [0, 5, 10].includes(index) ? .4 : 0);
  const level = new GameLevel(board, { random: () => draws.shift() ?? 0, yieldControl: async () => {} });
  let reactions = 0;
  await level.move(pos(3, 3), pos(3, 4), event => {
    if (event.type === 'reaction') {
      reactions++;
      if (reactions === 2) {
        assert.ok(level.state.removed >= 10);
        assert.equal(level.state.status, 'resolving');
      }
    }
  });
  assert.equal(reactions, 2);
  assert.equal(level.state.status, 'won');
});

test('external move cancellation rolls back state while aborting the effect signal', async () => {
  const level = new GameLevel(boardWith([[2, 2, 1], [2, 3, 1], [2, 4, 1]]));
  const before = level.state;
  const controller = new AbortController();
  let effectSignal: AbortSignal | undefined;
  let entered: (() => void) | undefined;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const pending = level.move(pos(3, 3), pos(3, 4), event => {
    effectSignal = event.signal;
    entered?.();
    return new Promise<void>(() => {});
  }, controller.signal);
  await started;
  controller.abort();
  assert.equal(await pending, false);
  assert.equal(effectSignal?.aborted, true);
  assert.deepEqual(level.state, before);
  assert.equal(await level.move(pos(0, 0), pos(0, 1)), true);
});

test('aborting reset during generation restores a usable previous session', async () => {
  const level = new GameLevel(boardWith(), { random: () => 0, generationBatchSize: 1, yieldControl: () => new Promise<void>(() => {}) });
  const before = level.state;
  const controller = new AbortController();
  const resetting = level.reset(controller.signal);
  controller.abort();
  await assert.rejects(resetting, { name: 'AbortError' });
  assert.deepEqual(level.state, { ...before, epoch: before.epoch + 1 });
  assert.equal(await level.move(pos(0, 0), pos(0, 1)), true);
});

test('aborted reset during a paused move restores the pre-move snapshot', async () => {
  const level = new GameLevel(boardWith([[2, 2, 1], [2, 3, 1], [2, 4, 1]]), { random: () => 0, generationBatchSize: 1, yieldControl: () => new Promise<void>(() => {}) });
  const before = level.state;
  let entered: (() => void) | undefined;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const moving = level.move(pos(3, 3), pos(3, 4), () => { entered?.(); return new Promise<void>(() => {}); });
  await started;
  const controller = new AbortController();
  const resetting = level.reset(controller.signal);
  controller.abort();
  await assert.rejects(resetting, { name: 'AbortError' });
  assert.equal(await moving, false);
  assert.deepEqual(level.state, { ...before, epoch: before.epoch + 1 });
});

test('apex overrides other simultaneous creations and counts each creature once', () => {
  const board = boardWith([[0, 0, 3], [0, 1, 4], [1, 0, 4], [1, 1, 4], [5, 5, 1], [5, 6, 1], [6, 5, 1]]);
  const wave = resolveWave(board, [pos(0, 0), pos(6, 6)], makeCreature);
  assert.ok(wave?.apex);
  assert.equal(wave.reactions.length, 2);
  assert.equal(wave.creations.length, 0);
  assert.equal(wave.removed.length, 64);
  assert.equal(new Set(wave.removed.map(item => item.creature.id)).size, 64);
  assert.equal(wave.after.flat().filter(Boolean).length, 0);
});

test('accepted seeded boards retain decreasing aggregate level frequencies', async () => {
  const counts = [0, 0, 0, 0, 0];
  for (let seed = 0; seed < 100; seed++) {
    const board = await generateBoard(seededRandom(seed));
    assert.equal(hasReactingSwap(board), true);
    for (const creature of board.flat()) if (creature) counts[creature.level]++;
  }
  for (let level = 1; level < counts.length; level++) assert.ok(counts[level - 1] > counts[level], `${counts}`);
});

test('generation retries a rejected board and returns all levels with a reacting swap', async () => {
  const random = seededRandom(123);
  let draws = 0;
  let yields = 0;
  const board = await generateBoard(() => ++draws <= 64 ? 0 : random(), {
    batchSize: 1,
    yieldControl: async () => { yields++; },
  });
  assert.ok(yields >= 1);
  assert.ok(draws >= 128);
  assert.equal(board.flat().length, 64);
  assert.deepEqual([...new Set(board.flat().map(creature => creature?.level))].sort(), [0, 1, 2, 3, 4]);
  assert.equal(hasReactingSwap(board), true);
});

test('reset from both terminal states restores a fresh playable session', async () => {
  for (const terminal of ['won', 'lost'] as const) {
    const random = seededRandom(123);
    let resetting = false;
    const board = terminal === 'won'
      ? boardWith([[2, 2, 1], [2, 3, 1], [2, 4, 1], [3, 2, 1], [4, 2, 1]])
      : boardWith();
    const level = new GameLevel(board, { random: () => resetting ? random() : 0, yieldControl: async () => {} });
    if (terminal === 'won') {
      assert.equal(await level.move(pos(3, 3), pos(3, 4)), true);
    } else {
      for (let turn = 0; turn < 3; turn++) assert.equal(await level.move(pos(0, 0), pos(0, 1)), true);
    }
    assert.equal(level.state.status, terminal);
    const epoch = level.state.epoch;
    resetting = true;
    await level.reset();
    const state = level.state;
    assert.equal(state.status, 'ready');
    assert.equal(state.epoch, epoch + 1);
    assert.equal(state.target, 10);
    assert.equal(state.removed, 0);
    assert.equal(state.turns, 0);
    assert.equal(state.freeMoves, 3);
    assert.equal(state.board.flat().filter(Boolean).length, 64);
    assert.deepEqual([...new Set(state.board.flat().map(creature => creature?.level))].sort(), [0, 1, 2, 3, 4]);
    assert.equal(hasReactingSwap(state.board), true);
    assert.equal(await level.move(pos(0, 0), pos(0, 1)), true);
  }
});

test('reset cancels an eight-wave cascade and ignores its delayed effect', async () => {
  const resetRandom = seededRandom(123);
  const cascadeRandom = seededRandom(7);
  let resetting = false;
  const level = new GameLevel(boardWith([[2, 2, 4], [2, 3, 4], [2, 4, 4]], 3), {
    random: () => resetting ? resetRandom() : cascadeRandom(),
    yieldControl: async () => {},
  });
  let release: (() => void) | undefined;
  let entered: (() => void) | undefined;
  let effectSignal: AbortSignal | undefined;
  let reactions = 0;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const moving = level.move(pos(3, 3), pos(3, 4), event => {
    if (event.type === 'reaction' && ++reactions === 8) {
      effectSignal = event.signal;
      entered?.();
      return new Promise<void>(resolve => { release = resolve; });
    }
  });
  await started;
  assert.equal(level.state.status, 'resolving');
  assert.equal(reactions, 8);
  resetting = true;
  await level.reset();
  const fresh = level.state;
  assert.equal(await moving, false);
  assert.equal(effectSignal?.aborted, true);
  release?.();
  await Promise.resolve();
  assert.deepEqual(level.state, fresh);
  assert.equal(fresh.status, 'ready');
  assert.equal(fresh.turns, 0);
  assert.equal(fresh.removed, 0);
  assert.equal(fresh.freeMoves, 3);
});