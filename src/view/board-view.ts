import Phaser from 'phaser';
import { BOARD_SIZE } from '../game/index.ts';
import type { Board, Creature, LevelEvent, Position } from '../game/index.ts';
import { flashCells } from './effects.ts';
import { registerParameciumAssets } from './paramecium-assets.ts';
import { createParameciumArtwork } from './paramecium-view.ts';
import { ParameciumStateRegistry } from './paramecium-state.ts';
import { registerAmoebaAssets } from './amoeba-assets.ts';
import { createAmoebaMotion } from './amoeba-motion.ts';
import { AmoebaBoardRenderer } from './amoeba-view.ts';
import type { AmoebaBoardEntry } from './amoeba-view.ts';
import { AmoebaStateRegistry } from './amoeba-state.ts';
import { createCreatureLabelRenderer } from './creature-label.ts';
import type { CreatureLabelRenderer } from './creature-label.ts';
import { creatureSizeFraction } from './creature-sizing.ts';

const SIZE = 800;
const CELL = SIZE / BOARD_SIZE;
const COLORS = [0xb9dcb8, 0xf1d394, 0xefa997, 0xa9cdd0, 0xb6b9d9];
const TEXT = [0x264e3a, 0x694f24, 0x703e35, 0x28535a, 0x3b416a];
const DRAG_THRESHOLD = 6;
const REACTION_CONVERGENCE_MS = 1000;

type Gesture = {
  pointerId: number;
  origin: Position;
  piece: Phaser.GameObjects.Container;
  pressX: number;
  pressY: number;
  offsetX: number;
  offsetY: number;
  dragging: boolean;
  preview: Position | null;
};

type ParameciumViewEntry = {
  advance: (deltaSeconds: number, reducedMotion: boolean) => void;
};

function same(first: Position, second: Position): boolean {
  return first.row === second.row && first.col === second.col;
}

function adjacent(first: Position, second: Position): boolean {
  return Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const timer = window.setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
    const abort = (): void => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    signal.addEventListener('abort', abort, { once: true });
  });
}

export class BoardView {
  private scene!: Phaser.Scene;
  private labels!: CreatureLabelRenderer;
  private pieces: Phaser.GameObjects.Container[] = [];
  private selected: Position | null = null;
  private board: Board;
  private gesture: Gesture | null = null;
  private cells = new Map<string, Phaser.GameObjects.Container>();
  private paramecia = new Map<string, ParameciumViewEntry>();
  private amoebae = new Map<string, AmoebaBoardEntry>();
  private readonly amoebaStates = new AmoebaStateRegistry();
  private amoebaRenderer: AmoebaBoardRenderer | null = null;
  private invertedCells = new Set<string>();
  private readonly parameciumStates = new ParameciumStateRegistry();
  private assetStatus: 'loading' | 'ready' | 'unavailable' = 'loading';
  private amoebaAssetStatus: 'loading' | 'ready' | 'unavailable' = 'loading';
  private amoebaAssetLoad: Promise<void> | null = null;
  private reducedMotion = false;
  private motionPreference: MediaQueryList | null = null;
  private moveCheckpointOpen = false;
  private resetCheckpointOpen = false;
  private disposed = false;
  private readonly game: Phaser.Game;
  private readonly onMove: (first: Position, second: Position) => void;
  private readonly canMove: () => boolean;
  private readonly onInteractionStart: () => void;
  private readonly onInteractionEnd: () => void;

  constructor(
    parent: HTMLElement,
    board: Board,
    onMove: (first: Position, second: Position) => void,
    canMove: () => boolean,
    onInteractionStart: () => void = () => {},
    onInteractionEnd: () => void = () => {},
  ) {
    this.board = board;
    this.onMove = onMove;
    this.canMove = canMove;
    this.onInteractionStart = onInteractionStart;
    this.onInteractionEnd = onInteractionEnd;
    const owner = this;
    this.game = new Phaser.Game({
      type: Phaser.CANVAS, width: SIZE, height: SIZE, parent, backgroundColor: '#dce9dc',
      scene: { create() { owner.setup(this); } },
      input: { activePointers: 1 },
      audio: { noAudio: true },
    });
  }

  private setup(scene: Phaser.Scene): void {
    this.scene = scene;
    this.labels = createCreatureLabelRenderer(scene);
    this.amoebaRenderer = new AmoebaBoardRenderer(scene);
    const background = scene.add.graphics();
    for (let row = 0; row < BOARD_SIZE; row++) for (let col = 0; col < BOARD_SIZE; col++) {
      background.fillStyle(0xc8d9c8, 0.6).fillRoundedRect(col * CELL + 5, row * CELL + 5, CELL - 10, CELL - 10, 10);
    }
    const canvas = this.game.canvas;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerCancel);
    canvas.addEventListener('lostpointercapture', this.pointerCancel);
    window.addEventListener('blur', this.cancelGesture);
    document.addEventListener('visibilitychange', this.visibilityChange);
    scene.events.once('shutdown', () => {
      this.disposed = true;
      this.cancelGesture();
      scene.events.off('update', this.updateParamecia);
      scene.events.off('update', this.updateAmoebae);
      this.motionPreference?.removeEventListener('change', this.reducedMotionChanged);
      this.motionPreference = null;
      this.parameciumStates.shutdown();
      this.amoebaStates.shutdown();
      this.amoebaRenderer?.destroy();
      this.amoebaRenderer = null;
      this.paramecia.clear();
      this.amoebae.clear();
      canvas.removeEventListener('pointerdown', this.pointerDown);
      canvas.removeEventListener('pointermove', this.pointerMove);
      canvas.removeEventListener('pointerup', this.pointerUp);
      canvas.removeEventListener('pointercancel', this.pointerCancel);
      canvas.removeEventListener('lostpointercapture', this.pointerCancel);
      window.removeEventListener('blur', this.cancelGesture);
      document.removeEventListener('visibilitychange', this.visibilityChange);
    });
    this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = this.motionPreference.matches;
    this.motionPreference.addEventListener('change', this.reducedMotionChanged);
    scene.events.on('update', this.updateParamecia);
    scene.events.on('update', this.updateAmoebae);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Eight by eight game board. Creatures are numbered zero through four. Select or drag between neighboring creatures.');
    this.render(this.board);
    void registerParameciumAssets(scene).then(loaded => {
      if (this.disposed) return;
      this.assetStatus = loaded ? 'ready' : 'unavailable';
      this.updateBoardAccessibilityLabel();
      if (loaded) {
        this.attachParamecia();
      }
    });
  }

  private ensureAmoebaAssets(): void {
    if (this.amoebaAssetStatus !== 'loading' || this.amoebaAssetLoad) return;
    this.amoebaAssetLoad = registerAmoebaAssets(this.scene).then(loaded => {
      if (this.disposed) return;
      this.amoebaAssetStatus = loaded ? 'ready' : 'unavailable';
      this.amoebaAssetLoad = null;
      this.updateBoardAccessibilityLabel();
      if (loaded) this.attachAmoebae();
    });
  }

  private attachAmoebae(): void {
    this.amoebae.clear();
    let pieceIndex = 0;
    this.board.forEach((row, rowIndex) => row.forEach((creature, col) => {
      if (!creature) return;
      const piece = this.pieces[pieceIndex++];
      if (creature.level !== 1 || !piece?.scene) return;
      piece.removeAll(true);
      const position = { row: rowIndex, col };
      this.amoebae.set(creature.id, {
        creatureId: creature.id,
        state: this.amoebaStates.getOrCreate(creature.id),
        piece,
        inverted: this.invertedCells.has(this.key(position)),
        selected: Boolean(this.selected && same(this.selected, position)),
      });
    }));
    this.amoebaRenderer?.setEntries([...this.amoebae.values()]);
  }

  private updateBoardAccessibilityLabel(): void {
    const levelZero = this.assetStatus === 'ready'
      ? 'Level zero creatures are animated paramecia'
      : 'Level zero creatures are numbered';
    const levelOne = this.amoebaAssetStatus === 'ready'
      ? 'level one creatures are animated amoebae'
      : 'level one creatures are numbered';
    this.game.canvas?.setAttribute(
      'aria-label',
      `Eight by eight game board. ${levelZero}; ${levelOne}; levels two through four are numbered. Select or drag between neighboring creatures.`,
    );
  }

  private attachParamecia(): void {
    this.paramecia.clear();
    this.board.forEach((row, rowIndex) => row.forEach((creature, col) => {
      if (creature?.level !== 0) return;
      const piece = this.cells.get(this.key({ row: rowIndex, col }));
      if (!piece?.scene) return;
      if (piece.length > 1) piece.removeAt(1, true);
      const state = this.parameciumStates.getOrCreate(creature.id);
      const key = this.key({ row: rowIndex, col });
      const artwork = createParameciumArtwork(this.scene, state, CELL, this.invertedCells.has(key));
      piece.add(artwork.container);
      this.paramecia.set(creature.id, { advance: artwork.advance });
    }));
  }

  private reducedMotionChanged = (event: MediaQueryListEvent): void => {
    this.reducedMotion = event.matches;
  };

  private updateParamecia = (_time: number, deltaMilliseconds: number): void => {
    if (this.assetStatus !== 'ready' || this.disposed) return;
    for (const paramecium of this.paramecia.values()) {
      paramecium.advance(deltaMilliseconds / 1000, this.reducedMotion);
    }
  };

  private updateAmoebae = (_time: number, deltaMilliseconds: number): void => {
    if (this.amoebaAssetStatus !== 'ready' || this.disposed) return;
    this.amoebaRenderer?.advance(deltaMilliseconds / 1000, this.reducedMotion);
  };

  private coordinates(event: PointerEvent): { x: number; y: number } | null {
    const canvas = this.game.canvas;
    if (!canvas?.isConnected) return null;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    return { x: (event.clientX - bounds.left) * SIZE / bounds.width, y: (event.clientY - bounds.top) * SIZE / bounds.height };
  }

  private position(point: { x: number; y: number }): Position | null {
    const col = Math.floor(point.x / CELL);
    const row = Math.floor(point.y / CELL);
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE ? { row, col } : null;
  }

  private key(position: Position): string {
    return `${position.row},${position.col}`;
  }

  private pointerDown = (event: PointerEvent): void => {
    if (this.gesture || !event.isPrimary || event.button !== 0 || !this.canMove()) return;
    const point = this.coordinates(event);
    const origin = point && this.position(point);
    const piece = origin && this.cells.get(this.key(origin));
    if (!point || !origin || !piece?.scene) return;
    this.gesture = {
      pointerId: event.pointerId, origin, piece, pressX: event.clientX, pressY: event.clientY,
      offsetX: point.x - piece.x, offsetY: point.y - piece.y, dragging: false, preview: null,
    };
    this.onInteractionStart();
    try { this.game.canvas.setPointerCapture(event.pointerId); } catch { this.cancelGesture(); }
  };

  private pointerMove = (event: PointerEvent): void => {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (!this.canMove() || !gesture.piece.scene) { this.cancelGesture(); return; }
    const point = this.coordinates(event);
    if (!point) { this.cancelGesture(); return; }
    if (!gesture.dragging && Math.hypot(event.clientX - gesture.pressX, event.clientY - gesture.pressY) < DRAG_THRESHOLD) return;
    gesture.dragging = true;
    const positions = [gesture.origin, ...[
      { row: gesture.origin.row - 1, col: gesture.origin.col },
      { row: gesture.origin.row, col: gesture.origin.col + 1 },
      { row: gesture.origin.row + 1, col: gesture.origin.col },
      { row: gesture.origin.row, col: gesture.origin.col - 1 },
    ].filter(position => position.row >= 0 && position.row < BOARD_SIZE && position.col >= 0 && position.col < BOARD_SIZE && this.cells.has(this.key(position)))];
    const desiredX = point.x - gesture.offsetX;
    const desiredY = point.y - gesture.offsetY;
    const candidates = positions.map(position => {
      const x = Phaser.Math.Clamp(desiredX, position.col * CELL, Math.min((position.col + 1) * CELL, SIZE - .001));
      const y = Phaser.Math.Clamp(desiredY, position.row * CELL, Math.min((position.row + 1) * CELL, SIZE - .001));
      return { position, x, y, distance: (desiredX - x) ** 2 + (desiredY - y) ** 2 };
    });
    candidates.sort((first, second) => first.distance - second.distance ||
      (gesture.preview && same(first.position, gesture.preview) ? -1 : gesture.preview && same(second.position, gesture.preview) ? 1 : 0));
    const target = candidates[0];
    const preview = same(target.position, gesture.origin) ? null : target.position;
    if (gesture.preview && (!preview || !same(gesture.preview, preview))) {
      const previous = this.cells.get(this.key(gesture.preview));
      if (previous?.scene) previous.setPosition(gesture.preview.col * CELL + CELL / 2, gesture.preview.row * CELL + CELL / 2);
    }
    if (preview) {
      const neighbor = this.cells.get(this.key(preview));
      if (neighbor?.scene) neighbor.setPosition(gesture.origin.col * CELL + CELL / 2, gesture.origin.row * CELL + CELL / 2);
    }
    gesture.preview = preview;
    gesture.piece.setPosition(
      Math.min(target.x, (target.position.col + 1) * CELL - .001),
      Math.min(target.y, (target.position.row + 1) * CELL - .001),
    ).setDepth(1);
  };

  private pointerUp = (event: PointerEvent): void => {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    this.pointerMove(event);
    if (this.gesture !== gesture) return;
    const { origin, preview, dragging } = gesture;
    this.cancelGesture();
    if (!this.canMove()) return;
    if (dragging) {
      if (preview) { this.clearSelection(); this.onMove(origin, preview); }
      return;
    }
    if (this.selected && adjacent(this.selected, origin)) {
      const first = this.selected;
      this.clearSelection();
      this.onMove(first, origin);
    } else {
      this.selected = this.selected && same(this.selected, origin) ? null : origin;
      this.render(this.board);
    }
  };

  private pointerCancel = (event: PointerEvent): void => {
    if (this.gesture?.pointerId === event.pointerId) this.cancelGesture();
  };

  private visibilityChange = (): void => {
    if (document.hidden) this.cancelGesture();
  };

  private cancelGesture = (): void => {
    const gesture = this.gesture;
    if (!gesture) return;
    this.gesture = null;
    if (gesture.piece.scene) gesture.piece.setPosition(gesture.origin.col * CELL + CELL / 2, gesture.origin.row * CELL + CELL / 2).setDepth(0);
    if (gesture.preview) {
      const neighbor = this.cells.get(this.key(gesture.preview));
      if (neighbor?.scene) neighbor.setPosition(gesture.preview.col * CELL + CELL / 2, gesture.preview.row * CELL + CELL / 2);
    }
    const canvas = this.game.canvas;
    if (canvas?.hasPointerCapture(gesture.pointerId)) canvas.releasePointerCapture(gesture.pointerId);
    this.onInteractionEnd();
  };

  private piece(creature: Creature, position: Position, inverted = false, tracked = true): Phaser.GameObjects.Container {
    const color = inverted ? COLORS[creature.level] ^ 0xffffff : COLORS[creature.level];
    const textColor = inverted ? TEXT[creature.level] ^ 0xffffff : TEXT[creature.level];
    const isRenderedAmoeba = creature.level === 1 && this.amoebaAssetStatus === 'ready';
    const children: Phaser.GameObjects.GameObject[] = [];
    if (!isRenderedAmoeba) {
      const tile = this.scene.add.graphics();
      tile.fillStyle(color).fillRoundedRect(-45, -45, 90, 90, 10);
      if (this.selected && same(this.selected, position)) tile.lineStyle(4, 0x234f3d).strokeRoundedRect(-43, -43, 86, 86, 8);
      children.push(tile);
    }
    if (creature.level === 0 && this.assetStatus === 'ready') {
      const state = this.parameciumStates.getOrCreate(creature.id);
      const artwork = createParameciumArtwork(this.scene, state, CELL, inverted);
      children.push(artwork.container);
      this.paramecia.set(creature.id, { advance: artwork.advance });
    } else if (creature.level === 1 && this.amoebaAssetStatus === 'ready') {
      const state = this.amoebaStates.getOrCreate(creature.id);
      const piece = this.scene.add.container(position.col * CELL + CELL / 2, position.row * CELL + CELL / 2, children)
        .setDepth(this.selected && same(this.selected, position) ? 1 : 0);
      this.amoebae.set(creature.id, {
        creatureId: creature.id,
        state,
        piece,
        inverted,
        selected: Boolean(this.selected && same(this.selected, position)),
      });
      if (tracked) {
        this.pieces.push(piece);
        this.cells.set(this.key(position), piece);
      }
      return piece;
    } else {
      const label = this.labels.create(String(creature.level), CELL, creatureSizeFraction(creature.level, 0), `#${textColor.toString(16).padStart(6, '0')}`);
      children.push(label);
    }
    const container = this.scene.add.container(position.col * CELL + CELL / 2, position.row * CELL + CELL / 2, children)
      .setDepth(this.selected && same(this.selected, position) ? 1 : 0);
    if (tracked) {
      this.pieces.push(container);
      this.cells.set(this.key(position), container);
    }
    return container;
  }

  private convergePredators(event: Extract<LevelEvent, { type: 'reaction' }>): Promise<void> {
    if (event.signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
    const targets: Array<{ piece: Phaser.GameObjects.Container; prey: Position }> = [];
    const originals = new Map<Phaser.GameObjects.Container, { x: number; y: number }>();
    for (const reaction of event.wave.reactions) {
      for (const predator of reaction.predators) {
        const key = this.key(predator.position);
        const piece = this.cells.get(key);
        if (!piece?.scene) continue;
        originals.set(piece, { x: piece.x, y: piece.y });
        targets.push({ piece, prey: reaction.prey.position });
        piece.setDepth(2);
      }
    }
    if (!targets.length) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      let remaining = targets.length;
      let settled = false;
      const cleanup = (restore: boolean): void => {
        if (restore) for (const [piece, position] of originals) {
          if (piece.scene) piece.setPosition(position.x, position.y).setDepth(0);
        }
      };
      const abort = (): void => {
        if (settled) return;
        settled = true;
        tweens.forEach(tween => tween.stop());
        event.signal.removeEventListener('abort', abort);
        cleanup(true);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      const tweens = targets.map(({ piece, prey }) => this.scene.tweens.add({
          targets: piece,
          x: prey.col * CELL + CELL / 2,
          y: prey.row * CELL + CELL / 2,
          duration: REACTION_CONVERGENCE_MS,
          ease: 'Linear',
          onComplete: () => {
            if (--remaining !== 0 || settled) return;
            settled = true;
            event.signal.removeEventListener('abort', abort);
            cleanup(false);
            resolve();
          },
        }));
      event.signal.addEventListener('abort', abort, { once: true });
      if (event.signal.aborted) abort();
    });
  }

  render(board: Board, inverted: ReadonlySet<string> = new Set()): void {
    this.cancelGesture();
    this.board = board;
    this.invertedCells = new Set(inverted);
    if (!this.scene) return;
    if (this.amoebaAssetStatus === 'loading' && board.some(row => row.some(creature => creature?.level === 1))) {
      this.ensureAmoebaAssets();
    }
    this.pieces.forEach(piece => piece.destroy());
    this.pieces = [];
    this.cells.clear();
    this.paramecia.clear();
    this.amoebae.clear();
    board.forEach((row, rowIndex) => row.forEach((creature, col) => {
      if (creature) this.piece(creature, { row: rowIndex, col }, inverted.has(`${rowIndex},${col}`));
    }));
    this.amoebaRenderer?.setEntries([...this.amoebae.values()]);
  }

  beginMove(): void {
    if (this.resetCheckpointOpen || this.moveCheckpointOpen) return;
    this.parameciumStates.beginMove();
    this.amoebaStates.beginMove();
    this.moveCheckpointOpen = true;
  }

  commitMove(board: Board): void {
    if (!this.moveCheckpointOpen) return;
    this.parameciumStates.commit(board.flatMap(row => row.flatMap(creature => creature?.level === 0 ? [creature.id] : [])));
    this.amoebaStates.commit(board.flatMap(row => row.flatMap(creature => creature?.level === 1 ? [creature.id] : [])));
    this.moveCheckpointOpen = false;
  }

  rollbackMove(): void {
    if (!this.moveCheckpointOpen) return;
    this.parameciumStates.rollback();
    this.amoebaStates.rollback();
    this.moveCheckpointOpen = false;
    this.paramecia.clear();
  }

  beginReset(): void {
    if (this.resetCheckpointOpen) return;
    this.rollbackMove();
    this.parameciumStates.beginReset();
    this.amoebaStates.beginReset();
    this.resetCheckpointOpen = true;
  }

  resetSucceeded(): void {
    if (!this.resetCheckpointOpen) return;
    this.parameciumStates.resetSucceeded();
    this.amoebaStates.resetSucceeded();
    this.resetCheckpointOpen = false;
  }

  resetFailed(): void {
    if (!this.resetCheckpointOpen) return;
    this.parameciumStates.resetFailed();
    this.amoebaStates.resetFailed();
    this.resetCheckpointOpen = false;
  }

  destroy(): void {
    if (this.disposed) return;
    this.game.destroy(true);
  }

  clearSelection(): void {
    this.selected = null;
    this.cancelGesture();
    this.render(this.board);
  }

  async hint(position: Position, signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const key = this.key(position);
    if (!this.cells.has(key)) return;
    try {
      await flashCells(inverted => {
        if (signal.aborted) return;
        this.render(this.board, inverted ? new Set([key]) : new Set());
      }, delay, signal);
    } finally {
      if (!signal.aborted) this.render(this.board);
    }
  }

  async effect(event: LevelEvent): Promise<void> {
    if (event.signal.aborted) return;
    if (event.type === 'reaction') {
      const cells = new Set(event.wave.explosionCells.map(position => `${position.row},${position.col}`));
      this.render(event.wave.before);
      await this.convergePredators(event);
      if (event.signal.aborted) return;
      if (cells.size) {
        await flashCells(inverted => this.render(event.wave.before, inverted ? cells : new Set()), delay, event.signal);
      }
      if (!event.signal.aborted) this.render(event.wave.after);
      return;
    }

    const { board, movements } = event.refill;
    const moved = new Map(movements.map(movement => [movement.creature.id, movement]));
    const spawnCounts = Array.from({ length: BOARD_SIZE }, (_, col) => movements.filter(movement => movement.from === null && movement.to.col === col).length);
    this.board = board;
    this.cancelGesture();
    this.pieces.forEach(piece => piece.destroy());
    this.pieces = [];
    this.cells.clear();
    this.paramecia.clear();
    const animated: Array<{ piece: Phaser.GameObjects.Container; destination: number }> = [];
    board.forEach((row, rowIndex) => row.forEach((creature, col) => {
      if (!creature) return;
      const movement = moved.get(creature.id);
      const start = movement?.from ?? (movement ? { row: rowIndex - spawnCounts[col], col } : { row: rowIndex, col });
      const piece = this.piece(creature, start);
      if (movement) animated.push({ piece, destination: rowIndex * CELL + CELL / 2 });
    }));
    if (!animated.length) return;
    await new Promise<void>((resolve, reject) => {
      if (event.signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
      let remaining = animated.length;
      const tweens = animated.map(({ piece, destination }) => this.scene.tweens.add({
        targets: piece, y: destination, duration: 300, ease: 'Cubic.easeOut',
        onComplete: () => { if (--remaining === 0) { event.signal.removeEventListener('abort', abort); resolve(); } },
      }));
      const abort = (): void => { tweens.forEach(tween => tween.stop()); reject(new DOMException('Aborted', 'AbortError')); };
      event.signal.addEventListener('abort', abort, { once: true });
    });
  }
}