import Phaser from 'phaser';
import { amoebaLayerCanvas, amoebaTextureKey, getAmoebaArtworkMetadata } from './amoeba-assets.ts';
import { updateAmoebaMotion } from './amoeba-motion.ts';
import type { AmoebaMotionFrame, AmoebaMotionState } from './amoeba-motion.ts';
import { creatureBoxTransform, creatureSizeFraction } from './creature-sizing.ts';

const BOARD_SIZE = 800;
const CELL_SIZE = 100;
const TILE_SIZE = 90;
const TILE_RADIUS = 10;
const UPDATE_INTERVAL_SECONDS = 0.125;
const LEVEL_ONE_COLOR = 0xf1d394;
let nextBoardTextureId = 0;

type Cell = {
  state: AmoebaMotionState;
  piece: Phaser.GameObjects.Container;
  inverted: boolean;
  selected: boolean;
  frame: AmoebaMotionFrame;
  accumulatedSeconds: number;
  pendingMotionSeconds: number;
  lastX: number;
  lastY: number;
};

type DirtyRegion = { left: number; top: number; right: number; bottom: number };

function cellRegion(x: number, y: number): DirtyRegion {
  return {
    left: Math.floor(x - CELL_SIZE / 2),
    top: Math.floor(y - CELL_SIZE / 2),
    right: Math.ceil(x + CELL_SIZE / 2),
    bottom: Math.ceil(y + CELL_SIZE / 2),
  };
}

function intersects(first: DirtyRegion, second: DirtyRegion): boolean {
  return first.left < second.right && first.right > second.left
    && first.top < second.bottom && first.bottom > second.top;
}

export type AmoebaBoardEntry = {
  creatureId: string;
  state: AmoebaMotionState;
  piece: Phaser.GameObjects.Container;
  inverted: boolean;
  selected: boolean;
};

function sameFrame(first: AmoebaMotionFrame, second: AmoebaMotionFrame): boolean {
  return first.bodyFrameIndex === second.bodyFrameIndex
    && first.faceFrameIndex === second.faceFrameIndex
    && Math.round(first.blinkClosure * 10) === Math.round(second.blinkClosure * 10);
}

function colorString(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export class AmoebaBoardRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly textureKey: string;
  private readonly texture: Phaser.Textures.CanvasTexture;
  private readonly image: Phaser.GameObjects.Image;
  private readonly scene: Phaser.Scene;
  private readonly artwork: { x: number; y: number; width: number; height: number } | null;
  private cells = new Map<string, Cell>();
  private destroyed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const metadata = getAmoebaArtworkMetadata();
    if (metadata) {
      const { scale, offsetX, offsetY } = creatureBoxTransform(metadata.neutralBounds, CELL_SIZE, creatureSizeFraction(1, 0));
      const viewBox = metadata.coordinates.viewBox;
      this.artwork = {
        x: offsetX + viewBox.x * scale,
        y: offsetY + viewBox.y * scale,
        width: viewBox.width * scale,
        height: viewBox.height * scale,
      };
    } else {
      this.artwork = null;
    }
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = BOARD_SIZE;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    this.context = context;
    this.textureKey = `${amoebaTextureKey('board-composite')}-${nextBoardTextureId++}`;
    const texture = scene.textures.addCanvas(this.textureKey, this.canvas);
    if (!texture) {
      scene.textures.remove(this.textureKey);
      throw new Error('Unable to create amoeba board composite texture');
    }
    this.texture = texture;
    this.image = scene.add.image(BOARD_SIZE / 2, BOARD_SIZE / 2, this.textureKey).setDepth(0.5);
    this.image.once('destroy', () => scene.textures.remove(this.textureKey));
  }

  setEntries(entries: AmoebaBoardEntry[]): void {
    const next = new Map<string, Cell>();
    for (const entry of entries) {
      const existing = this.cells.get(entry.creatureId);
      if (existing?.state === entry.state && existing.inverted === entry.inverted) {
        existing.piece = entry.piece;
        existing.selected = entry.selected;
        next.set(entry.creatureId, existing);
      } else {
        const phaseSlot = [...entry.creatureId].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 64;
        next.set(entry.creatureId, {
          state: entry.state,
          piece: entry.piece,
          inverted: entry.inverted,
          selected: entry.selected,
          frame: updateAmoebaMotion(entry.state, 0, true),
          accumulatedSeconds: phaseSlot / 64 * UPDATE_INTERVAL_SECONDS,
          pendingMotionSeconds: 0,
          lastX: entry.piece.x,
          lastY: entry.piece.y,
        });
      }
    }
    this.cells = next;
    this.context.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    for (const cell of this.cells.values()) this.drawCell(cell);
    this.texture.refresh();
  }

  advance(deltaSeconds: number, reducedMotion: boolean): void {
    if (this.destroyed) return;
    const changed = new Map<Cell, DirtyRegion>();
    for (const cell of this.cells.values()) {
      const previous = cellRegion(cell.lastX, cell.lastY);
      let dirty = false;
      if (cell.piece.x !== cell.lastX || cell.piece.y !== cell.lastY) {
        cell.lastX = cell.piece.x;
        cell.lastY = cell.piece.y;
        dirty = true;
      }
      if (!reducedMotion) {
        cell.accumulatedSeconds += deltaSeconds;
        cell.pendingMotionSeconds += deltaSeconds;
        if (cell.accumulatedSeconds >= UPDATE_INTERVAL_SECONDS) {
          const frame = updateAmoebaMotion(cell.state, cell.pendingMotionSeconds);
          cell.accumulatedSeconds %= UPDATE_INTERVAL_SECONDS;
          cell.pendingMotionSeconds = 0;
          if (!sameFrame(frame, cell.frame)) {
            cell.frame = frame;
            dirty = true;
          }
        }
      }
      if (dirty) changed.set(cell, previous);
    }
    if (!changed.size) return;

    const regions = [...changed].flatMap(([cell, previous]) => [previous, cellRegion(cell.lastX, cell.lastY)]);
    const overlapping = [...changed].some(([cell, previous]) => {
      const current = cellRegion(cell.lastX, cell.lastY);
      return [...this.cells.values()].some(other => {
        if (cell === other) return false;
        const otherCurrent = cellRegion(other.lastX, other.lastY);
        const otherPrevious = changed.get(other) ?? otherCurrent;
        return [previous, current].some(region => intersects(region, otherCurrent) || intersects(region, otherPrevious));
      });
    });
    if (!overlapping) {
      for (const [cell, previous] of changed) {
        this.clearRegion(previous);
        this.drawCell(cell);
      }
    } else {
      const affected = new Set<Cell>();
      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const cell of this.cells.values()) {
          if (affected.has(cell)) continue;
          const current = cellRegion(cell.lastX, cell.lastY);
          if (regions.some(region => intersects(region, current))) {
            affected.add(cell);
            regions.push(current);
            expanded = true;
          }
        }
      }
      for (const region of regions) this.clearRegion(region);
      for (const cell of this.cells.values()) {
        if (affected.has(cell)) this.drawCell(cell);
      }
    }
    this.texture.refresh();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cells.clear();
    this.image.destroy();
  }

  private clearRegion(region: DirtyRegion): void {
    this.context.clearRect(region.left, region.top, region.right - region.left, region.bottom - region.top);
  }

  private drawCell(cell: Cell): void {
    const centerX = cell.piece.x;
    const centerY = cell.piece.y;
    const tileColor = LEVEL_ONE_COLOR ^ (cell.inverted ? 0xffffff : 0);
    const left = centerX - TILE_SIZE / 2;
    const top = centerY - TILE_SIZE / 2;
    this.context.fillStyle = colorString(tileColor);
    this.context.beginPath();
    this.context.roundRect(left, top, TILE_SIZE, TILE_SIZE, TILE_RADIUS);
    this.context.fill();

    if (!this.artwork) throw new Error('Invalid amoeba artwork metadata');
    const drawX = centerX + this.artwork.x;
    const drawY = centerY + this.artwork.y;
    const { width, height } = this.artwork;
    const body = amoebaLayerCanvas(this.scene, `body-frame-${String(cell.frame.bodyFrameIndex).padStart(2, '0')}`, cell.inverted);
    const face = amoebaLayerCanvas(this.scene, `face-frame-${String(cell.frame.faceFrameIndex).padStart(2, '0')}`, cell.inverted);
    this.context.drawImage(body, drawX, drawY, width, height);
    this.context.drawImage(face, drawX, drawY, width, height);
    const lidIndex = Math.round(cell.frame.blinkClosure * 10);
    if (lidIndex > 0) {
      this.context.drawImage(amoebaLayerCanvas(this.scene, `lid-${lidIndex}`, cell.inverted), drawX, drawY, width, height);
    }
    if (cell.selected) {
      this.context.strokeStyle = '#234f3d';
      this.context.lineWidth = 4;
      this.context.beginPath();
      this.context.roundRect(centerX - 43, centerY - 43, 86, 86, 8);
      this.context.stroke();
    }
  }
}
