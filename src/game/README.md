# FoodChain domain API

Import from `src/game/index.ts`. The domain has no UI or Phaser dependency. A board is an 8-by-8 row-major array, row 0 at the top. Each non-null creature must have a unique stable `id` and a `level` in 0 through 4. Caller-supplied boards must satisfy these invariants.

```ts
type Level = 0 | 1 | 2 | 3 | 4;
type RandomSource = () => number; // finite, in [0, 1)
interface Position { row: number; col: number }
interface Creature { id: string; level: Level }
type Board = Array<Array<Creature | null>>;
type CreatureFactory = (level: Level) => Creature;
interface LocatedCreature { position: Position; creature: Creature }
interface Movement { creature: Creature; from: Position | null; to: Position }
interface Reaction { prey: LocatedCreature; predators: LocatedCreature[] }
interface ReactionWave {
  before: Board; after: Board; reactions: Reaction[];
  removed: LocatedCreature[]; creations: LocatedCreature[];
  explosionCells: Position[]; apex: boolean;
}
interface RefillResult { board: Board; movements: Movement[]; candidates: Position[] }
type LevelStatus = 'ready' | 'resolving' | 'won' | 'lost';
interface LevelState {
  board: Board; target: number; removed: number; turns: number;
  freeMoves: number; status: LevelStatus; epoch: number;
}
type LevelEvent =
  | { type: 'reaction'; wave: ReactionWave; signal: AbortSignal }
  | { type: 'refill'; refill: RefillResult; signal: AbortSignal };
type EffectHandler = (event: LevelEvent) => void | Promise<void>;
interface LevelOptions {
  random?: RandomSource; generationBatchSize?: number;
  yieldControl?: () => Promise<void>; signal?: AbortSignal;
}
interface GenerationOptions {
  signal?: AbortSignal; batchSize?: number; yieldControl?: () => Promise<void>;
}
```

```ts
const BOARD_SIZE: 8;
function seededRandom(seed: number): RandomSource;
function scriptedRandom(values: readonly number[]): RandomSource;
function sampleLevel(random: RandomSource): Level;
function inBounds(position: Position): boolean;
function neighbors(position: Position): Position[];
function cloneBoard(board: Board): Board;
function swapBoard(board: Board, first: Position, second: Position): Board | null;
function predatorPositions(board: Board, position: Position): Position[];
function predictsReaction(board: Board, first: Position, second: Position): boolean;
function hasReactingSwap(board: Board): boolean;
function generateBoard(random: RandomSource, options?: GenerationOptions): Promise<Board>;
function refillBoard(board: Board, random: RandomSource, createCreature: CreatureFactory): RefillResult;
function resolveWave(board: Board, candidates: readonly Position[], createCreature: CreatureFactory): ReactionWave | null;
function createLevel(options?: LevelOptions): Promise<GameLevel>;
class GameLevel {
  constructor(board: Board, options?: LevelOptions);
  get state(): LevelState;
  move(first: Position, second: Position, onEffect?: EffectHandler, signal?: AbortSignal): Promise<boolean>;
  reset(signal?: AbortSignal): Promise<void>;
}
```

Use `createLevel` for a weighted, valid starting board. `GameLevel` also accepts an already prepared full board, copied on construction. `state` and event payloads are detached snapshots. On an accepted move, `move` commits the swap and enters `resolving`; it calls the handler before clearing each reaction and again before committing each refill. Await the handler to animate that step. `wave.before`, `wave.explosionCells`, and `wave.after` describe the flash and clearance; `refill.movements` describes falling and top-entry spawns (`from: null`). Explosion animation timing is a view responsibility: inverted/normal/inverted/normal, 125 ms per phase. Reaction-free moves do not emit effects.

Each event carries a signal that aborts on reset or move cancellation. The handler should cancel its own timers and animations when it fires. Reset immediately invalidates the old epoch and asynchronously generates a fresh board; stale callbacks cannot commit. A cancelled move returns `false` and rolls back its state. An aborted or failed reset rejects and restores the previous stable state with a new epoch. Handler errors reject the move and roll back state. Random draws already consumed by cancelled or failed work cannot be rewound; use a restorable random source externally if replay requires it. Invalid or blocked moves return `false` without consuming randomness.

Starting generation uses rejection sampling and yields every 32 failed samples by default. Refill draws are independent, with weights 40:27:17:10:6. Generation and cascades have no fixed termination bound. Cascades yield after each refill using a timer by default; a custom `yieldControl` must actually yield to the host for UI responsiveness. A signal can interrupt pending scheduler and effect promises even if those promises never settle. The caller remains responsible for cancelling any work started inside them.