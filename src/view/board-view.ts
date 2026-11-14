import Phaser from 'phaser';
import { BOARD_SIZE } from '../game/index.ts';
import type { Board, Creature, LevelEvent, Position } from '../game/index.ts';
import { flashCells } from './effects.ts';

const SIZE = 800;
const CELL = SIZE / BOARD_SIZE;
const COLORS = [0xb9dcb8, 0xf1d394, 0xefa997, 0xa9cdd0, 0xb6b9d9];
const TEXT = [0x264e3a, 0x694f24, 0x703e35, 0x28535a, 0x3b416a];

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
  private start: Position | null = null;
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
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.canMove()) return;
      this.start = this.position(pointer);
    });
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const start = this.start;
      this.start = null;
      if (!start || !this.canMove()) return;
      const end = this.position(pointer);
      if (!end) return;
      if (!same(start, end)) {
        if (adjacent(start, end)) { this.clearSelection(); this.onMove(start, end); }
        return;
      }
      if (this.selected && adjacent(this.selected, end)) {
        const first = this.selected;
        this.clearSelection();
        this.onMove(first, end);
      } else {
        this.selected = this.selected && same(this.selected, end) ? null : end;
        this.render(this.board);
      }
    });
    this.game.canvas.setAttribute('role', 'img');
    this.game.canvas.setAttribute('aria-label', 'Eight by eight game board. Select or drag between neighboring numbered creatures.');
    this.render(this.board);
  }

  private position(pointer: Phaser.Input.Pointer): Position | null {
    const col = Math.floor(pointer.x / CELL);
    const row = Math.floor(pointer.y / CELL);
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE ? { row, col } : null;
  }

  private piece(creature: Creature, position: Position, inverted = false): Phaser.GameObjects.Container {
    const color = inverted ? COLORS[creature.level] ^ 0xffffff : COLORS[creature.level];
    const textColor = inverted ? TEXT[creature.level] ^ 0xffffff : TEXT[creature.level];
    const tile = this.scene.add.graphics();
    tile.fillStyle(color).fillRoundedRect(-45, -45, 90, 90, 10);
    if (this.selected && same(this.selected, position)) tile.lineStyle(4, 0x234f3d).strokeRoundedRect(-43, -43, 86, 86, 8);
    const label = this.scene.add.text(0, 0, String(creature.level), {
      fontFamily: 'Space Grotesk, sans-serif', fontSize: '38px', fontStyle: 'bold', color: `#${textColor.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
    const container = this.scene.add.container(position.col * CELL + CELL / 2, position.row * CELL + CELL / 2, [tile, label]);
    this.pieces.push(container);
    return container;
  }

  render(board: Board, inverted: ReadonlySet<string> = new Set()): void {
    this.board = board;
    if (!this.scene) return;
    this.pieces.forEach(piece => piece.destroy());
    this.pieces = [];
    board.forEach((row, rowIndex) => row.forEach((creature, col) => {
      if (creature) this.piece(creature, { row: rowIndex, col }, inverted.has(`${rowIndex},${col}`));
    }));
  }

  clearSelection(): void {
    this.selected = null;
    this.start = null;
    this.render(this.board);
  }

  async effect(event: LevelEvent): Promise<void> {
    if (event.signal.aborted) return;
    if (event.type === 'reaction') {
      const cells = new Set(event.wave.explosionCells.map(position => `${position.row},${position.col}`));
      this.render(event.wave.before);
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
    this.pieces.forEach(piece => piece.destroy());
    this.pieces = [];
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