import type { Board, Position } from './creature.ts';

export const BOARD_SIZE = 8;

export function inBounds(position: Position): boolean {
  return Number.isInteger(position.row) && Number.isInteger(position.col)
    && position.row >= 0 && position.row < BOARD_SIZE && position.col >= 0 && position.col < BOARD_SIZE;
}

export function neighbors(position: Position): Position[] {
  const result: Position[] = [];
  for (let row = position.row - 1; row <= position.row + 1; row++) {
    for (let col = position.col - 1; col <= position.col + 1; col++) {
      if ((row !== position.row || col !== position.col) && inBounds({ row, col })) result.push({ row, col });
    }
  }
  return result;
}

export function predatorPositions(board: Board, position: Position): Position[] {
  if (!inBounds(position)) return [];
  const prey = board[position.row][position.col];
  if (!prey) return [];
  return neighbors(position).filter(neighbor => board[neighbor.row][neighbor.col]?.level === prey.level + 1);
}