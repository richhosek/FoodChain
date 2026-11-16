import type { Board, Level, Position } from '../../src/game/creature.ts';

export function boardWith(entries: Array<[number, number, Level]> = [], fill: Level = 0): Board {
  const overrides = new Map(entries.map(([row, col, level]) => [`${row},${col}`, level]));
  return Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => ({
      id: `c${row}-${col}`,
      level: overrides.get(`${row},${col}`) ?? fill,
    })),
  );
}

export function boardWithoutActivations(entries: Array<[number, number, Level]> = []): Board {
  const board = boardWith(entries);
  const overrides = new Set(entries.map(([row, col]) => `${row},${col}`));
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    if (!overrides.has(`${row},${col}`)) board[row][col]!.level = (row + col) % 2 === 0 ? 0 : 4;
  }
  return board;
}

export const pos = (row: number, col: number): Position => ({ row, col });

export function boardWithReaction(
  preyPosition: Position,
  predatorPositions: readonly Position[],
  predatorLevel: Level,
  fillLevel: Level = 0,
): Board {
  if (predatorLevel === 0) throw new RangeError('Predators must be above the prey level');
  const board = boardWith([], fillLevel);
  board[preyPosition.row][preyPosition.col] = {
    id: 'prey',
    level: (predatorLevel - 1) as Level,
  };
  predatorPositions.forEach((position, index) => {
    board[position.row][position.col] = { id: `predator-${index}`, level: predatorLevel };
  });
  return board;
}