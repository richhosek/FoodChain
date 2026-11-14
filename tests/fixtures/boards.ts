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

export const pos = (row: number, col: number): Position => ({ row, col });