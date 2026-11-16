import { createParameciumMotion } from './paramecium-motion.ts';
import type { ParameciumMotionState } from './paramecium-motion.ts';

type Checkpoint = {
  kind: 'move' | 'reset';
  states: Map<string, ParameciumMotionState>;
};

export class ParameciumStateRegistry {
  private states = new Map<string, ParameciumMotionState>();
  private checkpoint: Checkpoint | null = null;
  private currentGeneration = 0;
  private isShutdown = false;

  get generation(): number {
    return this.currentGeneration;
  }

  getOrCreate(creatureId: string): ParameciumMotionState {
    this.ensureActive();
    const existing = this.states.get(creatureId);
    if (existing) return existing;

    const state = createParameciumMotion(`${this.currentGeneration}:${creatureId}`);
    this.states.set(creatureId, state);
    return state;
  }

  get(creatureId: string): ParameciumMotionState | undefined {
    return this.states.get(creatureId);
  }

  beginMove(): void {
    this.beginCheckpoint('move');
  }

  commit(boardCreatureIds: Iterable<string>): void {
    this.ensureCheckpoint('move');
    const boardIds = new Set(boardCreatureIds);
    for (const creatureId of this.states.keys()) {
      if (!boardIds.has(creatureId)) this.states.delete(creatureId);
    }
    this.checkpoint = null;
  }

  rollback(): void {
    if (this.checkpoint?.kind !== 'move') return;
    this.states = new Map(this.checkpoint.states);
    this.checkpoint = null;
  }

  beginReset(): void {
    this.beginCheckpoint('reset');
  }

  resetSucceeded(): void {
    this.ensureCheckpoint('reset');
    this.currentGeneration += 1;
    this.states.clear();
    this.checkpoint = null;
  }

  resetFailed(): void {
    this.ensureCheckpoint('reset');
    this.states = new Map(this.checkpoint?.states);
    this.checkpoint = null;
  }

  isCurrentGeneration(generation: number): boolean {
    return !this.isShutdown && generation === this.currentGeneration;
  }

  shutdown(): void {
    if (this.isShutdown) return;
    this.currentGeneration += 1;
    this.states.clear();
    this.checkpoint = null;
    this.isShutdown = true;
  }

  private beginCheckpoint(kind: Checkpoint['kind']): void {
    this.ensureActive();
    if (this.checkpoint) throw new Error('A paramecium state checkpoint is already active');
    this.checkpoint = { kind, states: new Map(this.states) };
  }

  private ensureCheckpoint(kind: Checkpoint['kind']): void {
    this.ensureActive();
    if (this.checkpoint?.kind !== kind) {
      throw new Error(`No active ${kind} checkpoint`);
    }
  }

  private ensureActive(): void {
    if (this.isShutdown) throw new Error('Paramecium state registry is shut down');
  }
}