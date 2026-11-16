import test from 'node:test';
import assert from 'node:assert/strict';
import { selectActivations } from '../../src/game/activation-selection.ts';
import { hasReactingSwap, meldProducingMoves, predictsMeld, predictsReaction, reactionCandidatesForMove, reactionProducingMoves, selectIdleHint, selectReactionMoveHint, swapBoard } from '../../src/game/board.ts';
import { resolveWave } from '../../src/game/mechanics.ts';
import { GameLevel } from '../../src/game/level.ts';
import { boardWith, pos } from '../fixtures/boards.ts';
import type { Board, Level, Position } from '../../src/game/creature.ts';

function sparse(entries: Array<[number, number, Level]>): Board {
  const board: Board = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
  for (const [row, col, level] of entries) board[row][col] = { id: `c${row}-${col}`, level };
  return board;
}

function square(board: Board, top: number, left: number, level: Level): void {
  for (let row = top; row < top + 3; row++) for (let col = left; col < left + 3; col++) {
    board[row][col] = { id: `c${row}-${col}`, level };
  }
}

function selectedPositions(board: Board, candidates: Position[]): Position[] {
  return selectActivations(board, candidates, []).reactions.map(reaction => reaction.prey.position);
}

test('equal shared groups use row then column regardless of candidate order or duplicates', () => {
  const left = pos(3, 3), right = pos(3, 5);
  const board = sparse([[3, 3, 0], [3, 5, 0], [3, 4, 1], [2, 2, 1], [4, 2, 1], [2, 6, 1], [4, 6, 1]]);
  const before = structuredClone(board);
  for (const candidates of [[right, left], [left, right, left], [right, left, right]]) {
    assert.deepEqual(selectedPositions(board, candidates), [left]);
  }
  const top = pos(2, 3), bottom = pos(4, 3);
  const vertical = sparse([[2, 3, 0], [4, 3, 0], [3, 3, 1], [1, 2, 1], [1, 4, 1], [5, 2, 1], [5, 4, 1]]);
  assert.deepEqual(selectedPositions(vertical, [bottom, top]), [top]);
  assert.deepEqual(board, before);
});

test('reassessment changes order and preserves remaining independent groups', () => {
  const first = pos(2, 2), second = pos(2, 4), independent = pos(6, 6);
  const board = sparse([[2, 2, 0], [2, 4, 0], [6, 6, 0], [1, 1, 1], [1, 2, 1], [2, 1, 1], [3, 1, 1], [2, 3, 1], [1, 4, 1], [1, 5, 1], [2, 5, 1], [5, 5, 1], [5, 6, 1], [6, 5, 1], [7, 6, 1]]);
  const selection = selectActivations(board, [second, independent, first], []);
  assert.deepEqual(selection.reactions.map(reaction => [reaction.prey.position, reaction.predators.length]), [[first, 5], [independent, 4], [second, 3]]);
  const ids = selection.reactions.flatMap(reaction => [reaction.prey.creature.id, ...reaction.predators.map(predator => predator.creature.id)]);
  assert.equal(new Set(ids).size, ids.length);
});

test('an assigned creature cannot react as prey after serving as a predator or vice versa', () => {
  const low = pos(3, 2), high = pos(3, 3);
  const highFirst = sparse([[3, 2, 0], [3, 3, 1], [2, 2, 1], [4, 2, 1], [2, 3, 2], [3, 4, 2], [4, 3, 2], [2, 4, 2]]);
  assert.deepEqual(selectedPositions(highFirst, [low, high]), [high]);
  const lowFirst = sparse([[3, 2, 0], [3, 3, 1], [2, 2, 1], [4, 2, 1], [2, 1, 1], [2, 3, 2], [3, 4, 2], [4, 3, 2]]);
  assert.deepEqual(selectedPositions(lowFirst, [high, low]), [low]);
});

test('meld reservations discard provisional reactions without consuming creation IDs', () => {
  const board = sparse([[1, 3, 0], [0, 2, 1], [0, 3, 1]]);
  square(board, 2, 2, 1);
  const prey = pos(1, 3), affected = pos(3, 3);
  const provisional = selectActivations(board, [prey], []);
  assert.equal(provisional.reactions[0].predators.length, 5);
  const selection = selectActivations(board, [prey], [affected]);
  assert.equal(selection.reactions.length, 0);
  assert.equal(selection.melds.length, 1);
  let creations = 0;
  const wave = resolveWave(board, [prey], level => ({ id: `new-${creations++}`, level }), [affected]);
  assert.ok(wave);
  assert.equal(creations, 1);
  assert.equal(wave.creations[0].creature.id, 'new-0');
  assert.equal(wave.after[1][3]?.level, 0);
  assert.equal(wave.removed.length, 8);
});

test('top-level meld takes priority over predator selection and creates nothing', () => {
  const board = sparse([[1, 3, 3], [0, 3, 4], [1, 2, 4], [1, 4, 4]]);
  square(board, 2, 2, 4);
  let creations = 0;
  const wave = resolveWave(board, [pos(1, 3)], level => ({ id: `new-${creations++}`, level }), [pos(3, 3)]);
  assert.ok(wave?.apex);
  assert.equal(wave.melds.length, 1);
  assert.equal(wave.reactions.length, 0);
  assert.equal(creations, 0);
  assert.ok(wave.after.flat().every(creature => creature === null));
});

test('selected apex reaction wins over a separate ordinary meld', () => {
  const board = sparse([[1, 1, 3], [0, 1, 4], [1, 0, 4], [1, 2, 4], [2, 1, 4]]);
  square(board, 4, 4, 1);
  const wave = resolveWave(board, [pos(1, 1)], () => { throw new Error('apex must not create'); }, [pos(5, 5)]);
  assert.ok(wave?.apex);
  assert.equal(wave.reactions.length, 1);
  assert.equal(wave.melds.length, 1);
  assert.equal(wave.creations.length, 0);
});

test('a move selecting Apex alongside an ordinary meld scores cleared level-zero creatures', async () => {
  const board = sparse([[3, 1, 3], [2, 1, 4], [3, 0, 4], [4, 1, 4], [3, 2, 3], [7, 0, 0], [7, 1, 0]]);
  square(board, 2, 3, 3);
  board[3][3] = { id: 'moved-predator', level: 4 };
  const before = structuredClone(board);
  const level = new GameLevel(board, { random: () => 0 });
  const controller = new AbortController();
  let score: number | undefined;
  let sawApex = false;
  const completed = await level.move(pos(3, 2), pos(3, 3), event => {
    if (event.type === 'reaction') {
      sawApex = event.wave.apex && event.wave.melds.length === 1 && event.wave.creations.length === 0;
    } else {
      score = level.state.removed;
      controller.abort();
    }
  }, controller.signal);
  assert.equal(completed, false);
  assert.equal(sawApex, true);
  assert.equal(score, 2);
  assert.deepEqual(board, before);
});

test('ordinary melds cannot share an Apex reaction participant on legal geometry', () => {
  for (let top = 0; top <= 5; top++) for (let left = 0; left <= 5; left++) {
    for (let row = top; row < top + 3; row++) for (let col = left; col < left + 3; col++) {
      const formations = [
        [pos(row - 1, col), pos(row, col + 1), pos(row + 1, col), pos(row, col - 1)],
        [pos(row - 1, col - 1), pos(row - 1, col + 1), pos(row + 1, col - 1), pos(row + 1, col + 1)],
      ];
      for (const formation of formations) {
        const inBounds = formation.every(position => position.row >= 0 && position.row < 8 && position.col >= 0 && position.col < 8);
        const overlapsMeld = formation.some(position => position.row >= top && position.row < top + 3 && position.col >= left && position.col < left + 3);
        assert.ok(!inBounds || overlapsMeld);
      }
    }
  }
});

test('meld reservation exposes an Apex reaction in the final selection pass', () => {
  const apexPrey = pos(3, 3), competingPrey = pos(2, 5), affected = pos(1, 6);
  const board = sparse([[3, 3, 3], [2, 3, 4], [3, 2, 4], [4, 3, 4], [2, 4, 4], [3, 4, 4], [1, 4, 4], [3, 5, 4], [3, 6, 4], [7, 0, 0], [7, 1, 0]]);
  square(board, 0, 5, 3);
  const before = structuredClone(board);
  const provisional = selectActivations(board, [apexPrey, competingPrey], []);
  assert.equal(provisional.apex, false);
  assert.deepEqual(provisional.reactions.map(reaction => [reaction.prey.position, reaction.predators.length]), [[competingPrey, 5], [apexPrey, 3]]);
  const selection = selectActivations(board, [apexPrey, competingPrey], [affected]);
  assert.equal(selection.apex, true);
  assert.equal(selection.melds.length, 1);
  assert.deepEqual(selection.reactions.map(reaction => [reaction.prey.position, reaction.predators.length]), [[apexPrey, 5]]);
  let creations = 0;
  const wave = resolveWave(board, [apexPrey, competingPrey], level => ({ id: `new-${creations++}`, level }), [affected]);
  assert.ok(wave?.apex);
  assert.equal(creations, 0);
  assert.deepEqual(wave.creations, []);
  assert.equal(wave.removed.length, 20);
  assert.equal(wave.removed.filter(item => item.creature.level === 0).length, 2);
  assert.equal(new Set(wave.removed.map(item => item.creature.id)).size, wave.removed.length);
  assert.equal(wave.explosionCells.length, 64);
  assert.ok(wave.after.flat().every(creature => creature === null));
  assert.deepEqual(board, before);
});

test('reserving one of four predators changes the blast and replacement', () => {
  const prey = pos(1, 3), affected = pos(3, 5), collateral = pos(1, 4);
  const board = sparse([[1, 3, 0], [0, 2, 1], [0, 3, 1], [1, 2, 1], [1, 4, 2]]);
  square(board, 2, 4, 1);
  const before = structuredClone(board);
  const full = resolveWave(board, [prey], level => ({ id: `full-${level}`, level }), []);
  const reduced = resolveWave(board, [prey], level => ({ id: `reduced-${level}`, level }), [affected]);
  assert.ok(full);
  assert.ok(reduced);
  assert.equal(full.reactions[0].predators.length, 4);
  assert.equal(reduced.reactions[0].predators.length, 3);
  assert.equal(full.after[prey.row][prey.col]?.level, 2);
  assert.equal(reduced.after[prey.row][prey.col]?.level, 1);
  assert.equal(full.after[collateral.row][collateral.col], null);
  assert.deepEqual(reduced.after[collateral.row][collateral.col], before[collateral.row][collateral.col]);
  assert.ok(full.explosionCells.some(position => position.row === collateral.row && position.col === collateral.col));
  assert.equal(reduced.explosionCells.length, 8);
  assert.equal(reduced.melds.length, 1);
  assert.deepEqual(reduced.creations.map(creation => creation.creature.level), [1, 2]);
  assert.equal(full.removed.filter(item => item.creature.level === 0).length, 1);
  assert.equal(reduced.removed.filter(item => item.creature.level === 0).length, 1);
  assert.deepEqual(board, before);
});

test('a shared predator assigned to a larger group breaks an otherwise valid apex formation', () => {
  const apexPrey = pos(3, 3), largerPrey = pos(3, 5);
  const board = sparse([[3, 3, 3], [3, 5, 3], [2, 3, 4], [3, 2, 4], [4, 3, 4], [3, 4, 4], [2, 5, 4], [2, 6, 4], [3, 6, 4], [4, 6, 4]]);
  const wave = resolveWave(board, [apexPrey, largerPrey], level => ({ id: `new-${level}`, level }), []);
  assert.ok(wave);
  assert.equal(wave.apex, false);
  assert.deepEqual(wave.reactions.map(reaction => [reaction.prey.position, reaction.predators.length]), [[largerPrey, 5], [apexPrey, 3]]);
  assert.equal(wave.creations.length, 2);
});

test('a meld-reserved predator group is not predicted as a reaction but remains a valid meld move', () => {
  const board = sparse([[1, 3, 0], [0, 2, 1], [0, 3, 1]]);
  square(board, 2, 2, 1);
  const first = pos(2, 3), second = pos(2, 4);
  const swapped = swapBoard(board, first, second);
  assert.ok(swapped);
  assert.ok(selectActivations(swapped, reactionCandidatesForMove(swapped, first, second), []).reactions.length);
  assert.equal(predictsReaction(board, first, second), false);
  assert.equal(predictsMeld(board, first, second), true);
  const wave = resolveWave(swapped, reactionCandidatesForMove(swapped, first, second), level => ({ id: `new-${level}`, level }), [first, second]);
  assert.ok(wave);
  assert.equal(wave.reactions.length, 0);
  assert.equal(wave.melds.length, 1);
});

test('a moved predator hint highlights the selected reaction participant', () => {
  const board = sparse([[3, 3, 0], [2, 3, 1], [3, 4, 1], [5, 3, 1], [4, 3, 0]]);
  const first = pos(4, 3), second = pos(5, 3);
  const moves = reactionProducingMoves(board);
  const index = moves.findIndex(move => move.first.row === first.row && move.first.col === first.col && move.second.row === second.row && move.second.col === second.col);
  assert.notEqual(index, -1);
  const hint = selectReactionMoveHint(board, () => (index + 0.5) / moves.length);
  assert.ok(hint);
  assert.deepEqual(hint.highlight, first);
  assert.equal(predictsReaction(board, first, second), true);
});

test('predictions and every enumerated hint agree with actual wave selection', () => {
  const board = boardWith([], 4);
  square(board, 2, 2, 1);
  board[1][3]!.level = 0;
  board[0][2]!.level = 1;
  board[0][3]!.level = 1;
  const before = structuredClone(board);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const first = pos(row, col);
    for (const second of [pos(row, col + 1), pos(row + 1, col)]) {
      const swapped = swapBoard(board, first, second);
      const selection = swapped && selectActivations(swapped, reactionCandidatesForMove(swapped, first, second), [first, second]);
      const wave = swapped && resolveWave(swapped, reactionCandidatesForMove(swapped, first, second), level => ({ id: `new-${level}`, level }), [first, second]);
      assert.equal(predictsReaction(board, first, second), !!selection?.reactions.length);
      assert.equal(predictsMeld(board, first, second), !!selection?.melds.length);
      assert.equal(!!wave, !!selection && (selection.reactions.length > 0 || selection.melds.length > 0));
    }
  }
  const moves = reactionProducingMoves(board);
  assert.equal(hasReactingSwap(board), moves.length > 0);
  for (let index = 0; index < moves.length; index++) {
    const hint = selectReactionMoveHint(board, () => (index + 0.5) / moves.length);
    assert.ok(hint);
    assert.deepEqual([hint.first, hint.second], [moves[index].first, moves[index].second]);
    assert.ok(predictsReaction(board, hint.first, hint.second));
    assert.ok([hint.first, hint.second].some(position => position.row === hint.highlight.row && position.col === hint.highlight.col));
  }
  const idle = selectIdleHint(board, 0, () => 0);
  assert.equal(idle.type, 'move');
  if (idle.type === 'move') assert.ok(predictsReaction(board, idle.hint.first, idle.hint.second) || predictsMeld(board, idle.hint.first, idle.hint.second));
  assert.ok(meldProducingMoves(board).length > 0);
  assert.deepEqual(board, before);
});