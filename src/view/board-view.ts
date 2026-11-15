import Phaser from 'phaser';
import { BOARD_SIZE } from '../game/index.ts';
import type { Board, Creature, LevelEvent, Position } from '../game/index.ts';
import { flashCells } from './effects.ts';

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
  private pieces: Phaser.GameObjects.Container[] = [];
  private selected: Position | null = null;
  private board: Board;
  private gesture: Gesture | null = null;
  private cells = new Map<string, Phaser.GameObjects.Container>();
  private readonly game: Phaser.Game;
  private readonly onMove: (first: Position, second: Position) => void;
  private readonly canMove: () => boolean;

  constructor(parent: HTMLElement, board: Board, onMove: (first: Position, second: Position) => void, canMove: () => boolean) {
    this.board = board;
    this.onMove = onMove;
    this.canMove = canMove;
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
      this.cancelGesture();
      canvas.removeEventListener('pointerdown', this.pointerDown);
      canvas.removeEventListener('pointermove', this.pointerMove);
      canvas.removeEventListener('pointerup', this.pointerUp);
      canvas.removeEventListener('pointercancel', this.pointerCancel);
      canvas.removeEventListener('lostpointercapture', this.pointerCancel);
      window.removeEventListener('blur', this.cancelGesture);
      document.removeEventListener('visibilitychange', this.visibilityChange);
    });
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Eight by eight game board. Select or drag between neighboring numbered creatures.');
    this.render(this.board);
  }

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
  };

  private piece(creature: Creature, position: Position, inverted = false, tracked = true): Phaser.GameObjects.Container {
    const color = inverted ? COLORS[creature.level] ^ 0xffffff : COLORS[creature.level];
    const textColor = inverted ? TEXT[creature.level] ^ 0xffffff : TEXT[creature.level];
    const tile = this.scene.add.graphics();
    tile.fillStyle(color).fillRoundedRect(-45, -45, 90, 90, 10);
    if (this.selected && same(this.selected, position)) tile.lineStyle(4, 0x234f3d).strokeRoundedRect(-43, -43, 86, 86, 8);
    const label = this.scene.add.text(0, 0, String(creature.level), {
      fontFamily: 'Space Grotesk, sans-serif', fontSize: '38px', fontStyle: 'bold', color: `#${textColor.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
    const container = this.scene.add.container(position.col * CELL + CELL / 2, position.row * CELL + CELL / 2, [tile, label]);
    if (tracked) {
      this.pieces.push(container);
      this.cells.set(this.key(position), container);
    }
    return container;
  }

  private convergePredators(event: Extract<LevelEvent, { type: 'reaction' }>): Promise<void> {
    if (event.signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
    const targets: Array<{ piece: Phaser.GameObjects.Container; prey: Position }> = [];
    const temporary: Phaser.GameObjects.Container[] = [];
    const originals = new Map<Phaser.GameObjects.Container, { x: number; y: number }>();
    const used = new Set<Phaser.GameObjects.Container>();
    for (const reaction of event.wave.reactions) {
      for (const predator of reaction.predators) {
        const key = this.key(predator.position);
        let piece = this.cells.get(key);
        if (!piece?.scene) continue;
        if (used.has(piece)) {
          const copy = this.piece(predator.creature, predator.position, false, false);
          copy.setDepth(2);
          temporary.push(copy);
          targets.push({ piece: copy, prey: reaction.prey.position });
        } else {
          used.add(piece);
          originals.set(piece, { x: piece.x, y: piece.y });
          targets.push({ piece, prey: reaction.prey.position });
        }
        piece.setDepth(2);
      }
    }
    if (!targets.length) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      let remaining = targets.length;
      let settled = false;
      const cleanup = (restore: boolean): void => {
        temporary.forEach(piece => piece.destroy());
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
    if (!this.scene) return;
    this.pieces.forEach(piece => piece.destroy());
    this.pieces = [];
    this.cells.clear();
    board.forEach((row, rowIndex) => row.forEach((creature, col) => {
      if (creature) this.piece(creature, { row: rowIndex, col }, inverted.has(`${rowIndex},${col}`));
    }));
  }

  clearSelection(): void {
    this.selected = null;
    this.cancelGesture();
    this.render(this.board);
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