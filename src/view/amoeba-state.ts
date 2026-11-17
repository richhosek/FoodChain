import { createAmoebaMotion } from './amoeba-motion.ts';
import type { AmoebaMotionState } from './amoeba-motion.ts';

type Checkpoint = {
  kind: 'move' | 'reset';
  states: Map<string, AmoebaMotionState>;
};

export class AmoebaStateRegistry {
  private states = new Map<string, AmoebaMotionState>();
  private checkpoint: Checkpoint | null = null;
  private currentGeneration = 0;
  private isShutdown = false;

  get generation(): number {
    return this.currentGeneration;
  }

  getOrCreate(creatureId: string): AmoebaMotionState {
    this.ensureActive();
    const existing = this.states.get(creatureId);
    if (existing) return existing;
    const state = createAmoebaMotion(`${this.currentGeneration}:${creatureId}`);
    this.states.set(creatureId, state);
    return state;
  }

  get(creatureId: string): AmoebaMotionState | undefined {
    return this.states.get(creatureId);
  }

  beginMove(): void {
    this.beginCheckpoint('move');
  }

  commit(boardCreatureIds: Iterable<string>): void {
    this.ensureCheckpoint('move');
    const ids = new Set(boardCreatureIds);
    for (const creatureId of this.states.keys()) {
      if (!ids.has(creatureId)) this.states.delete(creatureId);
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
    const checkpoint = this.checkpoint!;
    this.states = new Map(checkpoint.states);
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
    if (this.checkpoint) throw new Error('An amoeba state checkpoint is already active');
    this.checkpoint = { kind, states: new Map(this.states) };
  }

  private ensureCheckpoint(kind: Checkpoint['kind']): void {
    this.ensureActive();
    if (this.checkpoint?.kind !== kind) throw new Error(`No active ${kind} checkpoint`);
  }

  private ensureActive(): void {
    if (this.isShutdown) throw new Error('Amoeba state registry is shut down');
  }
}
