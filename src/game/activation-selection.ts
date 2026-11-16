import type { Board, Level, LocatedCreature, MeldActivation, Position, Reaction } from './creature.ts';
import { BOARD_SIZE, inBounds, predatorPositions } from './geometry.ts';

export interface ActivationSelection { reactions: Reaction[]; melds: MeldActivation[]; apex: boolean }

export function selectActivations(
  board: Board,
  candidates: readonly Position[],
  activationCandidates: readonly Position[] = candidates,
): ActivationSelection {
  const reactionCandidates: Reaction[] = [];
  const seen = new Set<string>();
  for (const position of candidates) {
    if (!inBounds(position)) continue;
    const creature = board[position.row][position.col];
    if (!creature || seen.has(creature.id)) continue;
    seen.add(creature.id);
    const predators = predatorPositions(board, position);
    if (predators.length >= 3) reactionCandidates.push({
      prey: { position: { ...position }, creature },
      predators: predators.map(predator => ({ position: predator, creature: board[predator.row][predator.col]! })),
    });
  }
  const melds: MeldActivation[] = [];
  const reserved = new Set<string>();
  const affected = new Set(activationCandidates.filter(inBounds).map(position => `${position.row},${position.col}`));
  for (let top = 0; top <= BOARD_SIZE - 3; top++) for (let left = 0; left <= BOARD_SIZE - 3; left++) {
    let touchesChangedCell = false;
    for (let row = top; row < top + 3 && !touchesChangedCell; row++) for (let col = left; col < left + 3; col++) {
      if (affected.has(`${row},${col}`)) { touchesChangedCell = true; break; }
    }
    if (!touchesChangedCell) continue;
    const matched: LocatedCreature[] = [];
    let level: Level | undefined;
    let uniform = true;
    for (let row = top; row < top + 3 && uniform; row++) for (let col = left; col < left + 3; col++) {
      const creature = board[row][col];
      if (!creature || (level !== undefined && creature.level !== level)) { uniform = false; break; }
      level = creature.level;
      matched.push({ position: { row, col }, creature });
    }
    if (!uniform || level === undefined || matched.some(item => reserved.has(item.creature.id))) continue;
    for (const item of matched) reserved.add(item.creature.id);
    const centerPosition = { row: top + 1, col: left + 1 };
    melds.push({ level, center: { position: centerPosition, creature: board[centerPosition.row][centerPosition.col]! }, matched });
  }
  const isApexReaction = (reaction: Reaction): boolean => {
    if (reaction.predators.length < 4 || reaction.predators.some(predator => predator.creature.level !== 4)) return false;
    const positions = new Set(reaction.predators.map(predator => `${predator.position.row},${predator.position.col}`));
    const { row, col } = reaction.prey.position;
    const formations = [
      [{ row: row - 1, col }, { row, col: col + 1 }, { row: row + 1, col }, { row, col: col - 1 }],
      [{ row: row - 1, col: col - 1 }, { row: row - 1, col: col + 1 }, { row: row + 1, col: col - 1 }, { row: row + 1, col: col + 1 }],
    ];
    return formations.some(formation => formation.every(position => positions.has(`${position.row},${position.col}`)));
  };
  const selectReactions = (initiallyReserved: ReadonlySet<string>): Reaction[] => {
    const assigned = new Set(initiallyReserved);
    const selected: Reaction[] = [];
    for (;;) {
      const available = reactionCandidates
        .filter(reaction => !assigned.has(reaction.prey.creature.id))
        .map(reaction => ({ ...reaction, predators: reaction.predators.filter(predator => !assigned.has(predator.creature.id)) }))
        .filter(reaction => reaction.predators.length >= 3)
        .sort((first, second) => second.predators.length - first.predators.length
          || first.prey.position.row - second.prey.position.row || first.prey.position.col - second.prey.position.col);
      const next = available[0];
      if (!next) return selected;
      selected.push(next);
      assigned.add(next.prey.creature.id);
      for (const predator of next.predators) assigned.add(predator.creature.id);
    }
  };
  if (melds.some(meld => meld.level === 4)) return { reactions: [], melds, apex: true };
  let reactions = selectReactions(new Set());
  let apex = reactions.some(isApexReaction);
  if (!apex && melds.length) {
    reactions = selectReactions(reserved);
    apex = reactions.some(isApexReaction);
  }
  return { reactions, melds, apex };
}