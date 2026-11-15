import type { Board, CreatureFactory, Level, LocatedCreature, Position, Reaction, ReactionWave } from './creature.ts';
import { BOARD_SIZE, cloneBoard, inBounds, predatorPositions } from './board.ts';

export function resolveWave(board: Board, candidates: readonly Position[], createCreature: CreatureFactory): ReactionWave | null {
  const before = cloneBoard(board);
  const reactions: Reaction[] = [];
  const seen = new Set<string>();
  for (const position of candidates) {
    if (!inBounds(position)) continue;
    const creature = before[position.row][position.col];
    if (!creature || seen.has(creature.id)) continue;
    seen.add(creature.id);
    const predators = predatorPositions(before, position);
    if (predators.length >= 3) reactions.push({
      prey: { position: { ...position }, creature },
      predators: predators.map(predator => ({ position: predator, creature: before[predator.row][predator.col]! })),
    });
  }
  if (!reactions.length) return null;
  const isApexReaction = (reaction: Reaction): boolean => {
    if (reaction.predators.length < 4 || reaction.predators.some(predator => predator.creature.level !== 4)) return false;
    const predatorPositions = new Set(reaction.predators.map(predator => `${predator.position.row},${predator.position.col}`));
    const formations = [
      [
        { row: reaction.prey.position.row - 1, col: reaction.prey.position.col },
        { row: reaction.prey.position.row, col: reaction.prey.position.col + 1 },
        { row: reaction.prey.position.row + 1, col: reaction.prey.position.col },
        { row: reaction.prey.position.row, col: reaction.prey.position.col - 1 },
      ],
      [
        { row: reaction.prey.position.row - 1, col: reaction.prey.position.col - 1 },
        { row: reaction.prey.position.row - 1, col: reaction.prey.position.col + 1 },
        { row: reaction.prey.position.row + 1, col: reaction.prey.position.col - 1 },
        { row: reaction.prey.position.row + 1, col: reaction.prey.position.col + 1 },
      ],
    ];
    return formations.some(formation => formation.every(position => predatorPositions.has(`${position.row},${position.col}`)));
  };
  const apex = reactions.some(isApexReaction);
  const creations: LocatedCreature[] = apex ? [] : reactions.map(reaction => ({
    position: { ...reaction.prey.position },
    creature: createCreature(Math.min(reaction.prey.creature.level + (reaction.predators.length === 3 ? 1 : 2), 4) as Level),
  }));
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
  }
  const after = cloneBoard(before);
  for (const item of removed.values()) after[item.position.row][item.position.col] = null;
  for (const creation of creations) after[creation.position.row][creation.position.col] = { ...creation.creature };
  return { before, after, reactions, removed: [...removed.values()], creations, explosionCells: [...explosions.values()], apex };
}