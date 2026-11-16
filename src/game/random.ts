import type { Level, RandomSource } from './creature.ts';

export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function scriptedRandom(values: readonly number[]): RandomSource {
  let index = 0;
  return () => {
    if (index >= values.length) throw new RangeError('Scripted random values exhausted');
    return values[index++];
  };
}

export function sampleLevel(random: RandomSource): Level {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Random values must be in [0, 1)');
  if (value < 0.4) return 0;
  if (value < 0.67) return 1;
  if (value < 0.84) return 2;
  if (value < 0.94) return 3;
  return 4;
}

export function sampleRefillLevel(random: RandomSource): Level {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Random values must be in [0, 1)');
  if (value < 1 / 5) return 0;
  if (value < 2 / 5) return 1;
  if (value < 3 / 5) return 2;
  if (value < 4 / 5) return 3;
  return 4;
}