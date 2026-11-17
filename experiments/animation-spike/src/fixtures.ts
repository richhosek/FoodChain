import { seededRandom } from '../../../src/game/random.ts';
import type { Board, Level, Position } from '../../../src/game/creature.ts';

export const WORKLOAD_IDS = ['dense-paramecium', 'dense-amoeba', 'mixed'] as const;
export type WorkloadId = typeof WORKLOAD_IDS[number];

export interface VisualState {
  bodyPhase: number;
  blinkPhase: number;
  gazeX: number;
  gazeY: number;
}

export interface WorkloadCell {
  creature: { id: string; level: Level };
  position: Position;
  visualState: VisualState;
}

export type ScriptedAction =
  | { atMs: number; type: 'select'; position: Position }
  | { atMs: number; type: 'drag'; from: Position; to: Position }
  | { atMs: number; type: 'cancel'; position: Position }
  | { atMs: number; type: 'reset' };

export interface Workload {
  id: WorkloadId;
  seed: number;
  cells: WorkloadCell[];
  board: Board;
  actions: ScriptedAction[];
  checksum: string;
}

const positions = Array.from({ length: 64 }, (_, index) => ({
  row: Math.floor(index / 8),
  col: index % 8,
}));

const sharedActions: ScriptedAction[] = [
  { atMs: 0, type: 'select', position: { row: 3, col: 3 } },
  { atMs: 250, type: 'drag', from: { row: 3, col: 3 }, to: { row: 3, col: 4 } },
  { atMs: 1_500, type: 'cancel', position: { row: 3, col: 4 } },
  { atMs: 2_000, type: 'reset' },
];

function levelsFor(id: WorkloadId, random: () => number): Level[] {
  if (id === 'dense-paramecium') return Array.from({ length: 64 }, () => 0);
  if (id === 'dense-amoeba') return Array.from({ length: 64 }, () => 1);

  const levels: Level[] = [
    ...Array.from({ length: 16 }, () => 0 as const),
    ...Array.from({ length: 16 }, () => 1 as const),
    ...Array.from({ length: 11 }, () => 2 as const),
    ...Array.from({ length: 11 }, () => 3 as const),
    ...Array.from({ length: 10 }, () => 4 as const),
  ];
  for (let index = levels.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [levels[index], levels[swapIndex]] = [levels[swapIndex], levels[index]];
  }
  return levels;
}

export async function createWorkload(id: WorkloadId, seed: number): Promise<Workload> {
  if (!WORKLOAD_IDS.includes(id)) throw new RangeError(`Unknown workload: ${String(id)}`);
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
    throw new RangeError('Seed must be an unsigned 32-bit safe integer');
  }

  const random = seededRandom(seed);
  const levels = levelsFor(id, random);
  const cells = positions.map((position, index): WorkloadCell => ({
    creature: { id: `${id}-${position.row}-${position.col}`, level: levels[index] },
    position: { ...position },
    visualState: {
      bodyPhase: random(),
      blinkPhase: random(),
      gazeX: random() * 2 - 1,
      gazeY: random() * 2 - 1,
    },
  }));
  const board: Board = Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => {
      const cell = cells[row * 8 + col];
      return { ...cell.creature };
    }),
  );
  const payload = {
    id,
    seed,
    cells,
    board,
    actions: sharedActions,
  };
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
  const checksum = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');

  return {
    ...payload,
    cells: structuredClone(cells),
    board,
    actions: structuredClone(sharedActions),
    checksum,
  };
}