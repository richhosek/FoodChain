import type { Board, Creature, Level, Position, RandomSource, ReactionWave, RefillResult } from './creature.ts';
import { abortError, cloneBoard, generateBoard, hasReactingSwap, meldProducingMoves, reactionCandidatesForMove, refillBoard, swapBoard, throwIfAborted } from './board.ts';
import { resolveWave } from './mechanics.ts';

export type LevelStatus = 'ready' | 'resolving' | 'won' | 'lost';
export interface LevelState { board: Board; target: number; removed: number; turns: number; freeMoves: number; status: LevelStatus; epoch: number }
export type LevelEvent = { type: 'reaction'; wave: ReactionWave; signal: AbortSignal } | { type: 'refill'; refill: RefillResult; signal: AbortSignal };
export type EffectHandler = (event: LevelEvent) => void | Promise<void>;
export interface LevelOptions { random?: RandomSource; generationBatchSize?: number; yieldControl?: () => Promise<void>; signal?: AbortSignal }

function waitFor<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const aborted = (): void => reject(abortError());
    signal.addEventListener('abort', aborted, { once: true });
    promise.then(value => { signal.removeEventListener('abort', aborted); resolve(value); }, error => { signal.removeEventListener('abort', aborted); reject(error); });
  });
}

export class GameLevel {
  private current: LevelState;
  private controller = new AbortController();
  private nextId = 0;
  private moveCheckpoint: LevelState | null = null;
  private resetCheckpoint: LevelState | null = null;
  private readonly random: RandomSource;
  private readonly options: LevelOptions;

  constructor(board: Board, options: LevelOptions = {}) {
    this.options = options;
    this.random = options.random ?? Math.random;
    this.current = { board: cloneBoard(board), target: 100, removed: 0, turns: 0, freeMoves: 3, status: 'ready', epoch: 0 };
  }

  get state(): LevelState { return { ...this.current, board: cloneBoard(this.current.board) }; }

  async reset(signal?: AbortSignal): Promise<void> {
    const checkpoint = this.moveCheckpoint ?? this.resetCheckpoint ?? this.state;
    this.moveCheckpoint = null;
    this.resetCheckpoint = checkpoint;
    this.controller.abort();
    const controller = new AbortController();
    this.controller = controller;
    const epoch = this.current.epoch + 1;
    this.current = { ...this.current, status: 'resolving', epoch };
    const externalAbort = (): void => controller.abort();
    signal?.addEventListener('abort', externalAbort, { once: true });
    if (signal?.aborted) controller.abort();
    try {
      const board = await generateBoard(this.random, { signal: controller.signal, batchSize: this.options.generationBatchSize, yieldControl: this.options.yieldControl });
      throwIfAborted(controller.signal);
      if (this.controller !== controller) throw abortError();
      this.nextId = 0;
      this.current = { board, target: checkpoint.target, removed: 0, turns: 0, freeMoves: 3, status: 'ready', epoch };
      this.resetCheckpoint = null;
    } catch (error) {
      if (this.controller === controller) {
        this.current = { ...checkpoint, epoch };
        this.resetCheckpoint = null;
        this.controller = new AbortController();
      }
      throw error;
    } finally {
      signal?.removeEventListener('abort', externalAbort);
    }
  }

  async move(first: Position, second: Position, onEffect?: EffectHandler, signal?: AbortSignal): Promise<boolean> {
    if (this.current.status !== 'ready' || signal?.aborted) return false;
    const swapped = swapBoard(this.current.board, first, second);
    if (!swapped) return false;
    const original = this.state;
    const controller = this.controller;
    const externalAbort = (): void => controller.abort();
    signal?.addEventListener('abort', externalAbort, { once: true });
    const createCreature = (level: Level): Creature => ({ id: `created-${this.current.epoch}-${this.nextId++}`, level });
    try {
      const candidates = reactionCandidatesForMove(swapped, first, second);
      let wave = resolveWave(swapped, candidates, createCreature, [first, second]);
      if (!wave && this.current.freeMoves === 0) return false;
      this.moveCheckpoint = original;
      this.current = { ...this.current, board: swapped, turns: this.current.turns + 1, freeMoves: this.current.freeMoves - (wave ? 0 : 1), status: 'resolving' };
      while (wave) {
        if (onEffect) await waitFor(Promise.resolve().then(() => { throwIfAborted(controller.signal); return onEffect({ type: 'reaction', wave: structuredClone(wave!), signal: controller.signal }); }), controller.signal);
        throwIfAborted(controller.signal);
        this.current = { ...this.current, board: wave.after, removed: this.current.removed + wave.removed.filter(item => item.creature.level === 0).length };
        const refill = refillBoard(wave.after, this.random, createCreature);
        if (onEffect) await waitFor(Promise.resolve().then(() => { throwIfAborted(controller.signal); return onEffect({ type: 'refill', refill: structuredClone(refill), signal: controller.signal }); }), controller.signal);
        throwIfAborted(controller.signal);
        this.current = { ...this.current, board: refill.board };
        await waitFor((this.options.yieldControl ?? (() => new Promise<void>(resolve => setTimeout(resolve, 0))))(), controller.signal);
        throwIfAborted(controller.signal);
        wave = resolveWave(refill.board, refill.candidates, createCreature);
      }
      const status: LevelStatus = this.current.removed >= this.current.target ? 'won'
        : this.current.freeMoves === 0 && !hasReactingSwap(this.current.board) && !meldProducingMoves(this.current.board).length ? 'lost' : 'ready';
      this.current = { ...this.current, status };
      return true;
    } catch (error) {
      if (this.controller === controller) {
        this.current = original;
        if (controller.signal.aborted) this.controller = new AbortController();
      }
      if (controller.signal.aborted) return false;
      throw error;
    } finally {
      if (this.moveCheckpoint === original) this.moveCheckpoint = null;
      signal?.removeEventListener('abort', externalAbort);
    }
  }
}

export async function createLevel(options: LevelOptions = {}): Promise<GameLevel> {
  const random = options.random ?? Math.random;
  const board = await generateBoard(random, { signal: options.signal, batchSize: options.generationBatchSize, yieldControl: options.yieldControl });
  return new GameLevel(board, { ...options, random });
}