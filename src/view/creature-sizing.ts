export interface CreatureBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const RANK_FRACTIONS = [0.75, 0.8, 0.85, 0.9, 0.95] as const;

export function creatureSizeFraction(level: number, lowestLevel: number): number {
  if (!Number.isSafeInteger(lowestLevel) || lowestLevel < 0 || !Number.isSafeInteger(lowestLevel + 4)
    || !Number.isSafeInteger(level) || level < lowestLevel || level > lowestLevel + 4) {
    throw new RangeError('Level must belong to a valid five-level chain');
  }
  return RANK_FRACTIONS[level - lowestLevel]!;
}

export function creatureBoxTransform(bounds: CreatureBounds, cellSize: number, fraction: number): {
  scale: number;
  offsetX: number;
  offsetY: number;
} {
  const { left, top, right, bottom } = bounds;
  if (![left, top, right, bottom, cellSize, fraction].every(Number.isFinite)
    || right <= left || bottom <= top || cellSize <= 0 || fraction <= 0 || fraction > 1) {
    throw new RangeError('Invalid creature bounds or target size');
  }
  const scale = cellSize * fraction / Math.max(right - left, bottom - top);
  return { scale, offsetX: -(left + right) / 2 * scale, offsetY: -(top + bottom) / 2 * scale };
}