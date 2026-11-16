import type { Board, CreatureFactory, Level, LocatedCreature, Position, ReactionWave } from './creature.ts';
import { BOARD_SIZE, cloneBoard } from './board.ts';
import { selectActivations } from './activation-selection.ts';

export function resolveWave(
  board: Board,
  candidates: readonly Position[],
  createCreature: CreatureFactory,
  activationCandidates: readonly Position[] = candidates,
): ReactionWave | null {
  const before = cloneBoard(board);
  const { reactions, melds, apex } = selectActivations(before, candidates, activationCandidates);
  if (!reactions.length && !melds.length) return null;
  const creations: LocatedCreature[] = apex ? [] : [
    ...reactions.map(reaction => ({
      position: { ...reaction.prey.position },
      creature: createCreature(Math.min(reaction.prey.creature.level + (reaction.predators.length === 3 ? 1 : 2), 4) as Level),
    })),
    ...melds.map(meld => ({
      position: { ...meld.center.position },
      creature: createCreature((meld.level + 1) as Level),
    })),
  ];
  const protectedCells = new Set(creations.map(creation => `${creation.position.row},${creation.position.col}`));
  const removed = new Map<string, LocatedCreature>();
  const explosions = new Map<string, Position>();
  const addRemoval = (position: Position): void => {
    const creature = before[position.row][position.col];
    if (creature) removed.set(creature.id, { position: { ...position }, creature });
  };
  if (apex) {
    for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
      addRemoval({ row, col });
      explosions.set(`${row},${col}`, { row, col });
    }
  } else {
    for (const reaction of reactions) {
      addRemoval(reaction.prey.position);
      for (const predator of reaction.predators) addRemoval(predator.position);
      const count = reaction.predators.length;
      if (count < 4) continue;
      const radius = count === 4 ? 1 : count === 5 ? 2 : BOARD_SIZE;
      for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
        if (Math.abs(row - reaction.prey.position.row) > radius || Math.abs(col - reaction.prey.position.col) > radius) continue;
        const key = `${row},${col}`;
        if (protectedCells.has(key)) continue;
        explosions.set(key, { row, col });
        addRemoval({ row, col });
      }
    }
    for (const meld of melds) for (const item of meld.matched) {
      if (item.position.row === meld.center.position.row && item.position.col === meld.center.position.col) continue;
      explosions.set(`${item.position.row},${item.position.col}`, { ...item.position });
      addRemoval(item.position);
    }
  }
  const after = cloneBoard(before);
  for (const item of removed.values()) after[item.position.row][item.position.col] = null;
  for (const creation of creations) after[creation.position.row][creation.position.col] = { ...creation.creature };
  return { before, after, reactions, melds, removed: [...removed.values()], creations, explosionCells: [...explosions.values()], apex };
}