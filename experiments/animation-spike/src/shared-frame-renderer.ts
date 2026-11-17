import Phaser from 'phaser';
import type { Board, Position } from '../../../src/game/creature.ts';
import { creatureBoxTransform, creatureSizeFraction } from '../../../src/view/creature-sizing.ts';
import { parameciumLayerCanvas, parameciumNeutralBounds, parameciumTextureKey } from '../../../src/view/paramecium-assets.ts';
import { createParameciumMotion, updateParameciumMotion } from '../../../src/view/paramecium-motion.ts';
import type { ParameciumMotionFrame, ParameciumMotionState } from '../../../src/view/paramecium-motion.ts';

const BOARD_SIZE = 800;
const CELL_SIZE = 100;
const SOURCE_SIZE = 896;
const UPDATE_INTERVAL_SECONDS = 0.1;
const EYE_CENTER_X = 515;
const EYE_CENTER_Y = 266;
const EYE_SCALE = 1.5;
let nextTextureId = 0;

interface SharedParamecium {
  id: string;
  position: Position;
  state: ParameciumMotionState;
  frame: ParameciumMotionFrame;
  pendingMotionSeconds: number;
  inverted: boolean;
}

export class SharedFrameParameciumRenderer {
  private readonly scene: Phaser.Scene;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly texture: Phaser.Textures.CanvasTexture;
  private readonly image: Phaser.GameObjects.Image;
  private readonly motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  private creatures = new Map<string, SharedParamecium>();
  private accumulatedSeconds = 0;
  private destroyed = false;
  private readonly onUpdate = (_time: number, deltaMilliseconds: number): void => this.advance(deltaMilliseconds / 1000);
  private readonly onMotionPreference = (): void => this.drawAll();
  private readonly positionAt: (position: Position) => { x: number; y: number };

  constructor(scene: Phaser.Scene, positionAt: (position: Position) => { x: number; y: number }) {
    if (!parameciumNeutralBounds) throw new Error('Invalid or missing paramecium design metadata');
    this.scene = scene;
    this.positionAt = positionAt;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = BOARD_SIZE;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    this.context = context;
    const textureKey = `${parameciumTextureKey('shared-board')}-${nextTextureId++}`;
    const texture = scene.textures.addCanvas(textureKey, this.canvas);
    if (!texture) {
      scene.textures.remove(textureKey);
      throw new Error('Unable to create shared paramecium board texture');
    }
    this.texture = texture;
    this.image = scene.add.image(BOARD_SIZE / 2, BOARD_SIZE / 2, textureKey).setDepth(0.6);
    this.image.once('destroy', () => scene.textures.remove(textureKey));
    scene.events.on('update', this.onUpdate);
    this.motionPreference.addEventListener('change', this.onMotionPreference);
  }

  setBoard(board: Board, inverted: ReadonlySet<string> = new Set()): void {
    const next = new Map<string, SharedParamecium>();
    board.forEach((row, rowIndex) => row.forEach((creature, col) => {
      if (creature?.level !== 0) return;
      const position = { row: rowIndex, col };
      const existing = this.creatures.get(creature.id);
      const state = existing?.state ?? createParameciumMotion(`0:${creature.id}`);
      next.set(creature.id, {
        id: creature.id,
        position,
        state,
        frame: existing?.frame ?? updateParameciumMotion(state, 0, true),
        pendingMotionSeconds: existing?.pendingMotionSeconds ?? 0,
        inverted: inverted.has(`${rowIndex},${col}`),
      });
    }));
    this.creatures = next;
    this.drawAll();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off('update', this.onUpdate);
    this.motionPreference.removeEventListener('change', this.onMotionPreference);
    this.creatures.clear();
    this.image.destroy();
  }

  private advance(deltaSeconds: number): void {
    if (this.destroyed || this.motionPreference.matches) return;
    this.accumulatedSeconds += deltaSeconds;
    if (this.accumulatedSeconds < UPDATE_INTERVAL_SECONDS) return;
    const elapsed = this.accumulatedSeconds;
    this.accumulatedSeconds %= UPDATE_INTERVAL_SECONDS;
    for (const creature of this.creatures.values()) {
      creature.pendingMotionSeconds += elapsed;
      creature.frame = updateParameciumMotion(creature.state, creature.pendingMotionSeconds);
      creature.pendingMotionSeconds = 0;
    }
    this.drawAll();
  }

  private drawAll(): void {
    if (this.destroyed) return;
    this.context.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    for (const creature of this.creatures.values()) this.drawCreature(creature);
    this.texture.refresh();
  }

  private drawCreature(creature: SharedParamecium): void {
    const bounds = parameciumNeutralBounds;
    if (!bounds) return;
    const { scale, offsetX, offsetY } = creatureBoxTransform(bounds, CELL_SIZE, creatureSizeFraction(0, 0));
    const center = this.positionAt(creature.position);
    const rotation = Phaser.Math.DegToRad(creature.frame.rotationDegrees);
    const left = offsetX;
    const top = offsetY;
    const size = SOURCE_SIZE * scale;
    const inverted = creature.inverted;

    this.context.save();
    this.context.translate(center.x, center.y);
    this.context.rotate(rotation);
    this.context.drawImage(parameciumLayerCanvas(this.scene, `cilia-${creature.frame.ciliaFrameIndex}`, inverted), left, top, size, size);
    this.context.drawImage(parameciumLayerCanvas(this.scene, 'body', inverted), left, top, size, size);
    creature.frame.internalDetails.forEach((offset, index) => {
      this.context.drawImage(
        parameciumLayerCanvas(this.scene, `detail-${index}`, inverted),
        left + offset.x * scale,
        top + offset.y * scale,
        size,
        size,
      );
    });

    const gazeOffsetX = creature.frame.gazeX * EYE_SCALE * scale;
    const gazeOffsetY = creature.frame.gazeY * EYE_SCALE * scale;
    this.context.save();
    this.context.translate(center.x, center.y);
    this.context.rotate(rotation);
    this.context.translate(offsetX + EYE_CENTER_X * scale, offsetY + EYE_CENTER_Y * scale);
    this.context.rotate(-rotation);
    const eyeLeft = -SOURCE_SIZE / 2 * scale;
    const eyeTop = -SOURCE_SIZE / 2 * scale;
    const eyeLayerOffsetX = (SOURCE_SIZE / 2 - EYE_CENTER_X) * scale;
    const eyeLayerOffsetY = (SOURCE_SIZE / 2 - EYE_CENTER_Y) * scale;
    this.context.drawImage(
      parameciumLayerCanvas(this.scene, 'eye', inverted),
      eyeLeft + eyeLayerOffsetX,
      eyeTop + eyeLayerOffsetY,
      size,
      size,
    );
    this.context.drawImage(
      parameciumLayerCanvas(this.scene, 'pupil', inverted),
      eyeLeft + eyeLayerOffsetX + gazeOffsetX,
      eyeTop + eyeLayerOffsetY + gazeOffsetY,
      size,
      size,
    );
    const lidFrame = Math.round(creature.frame.blinkClosure * 10);
    if (lidFrame > 0) {
      this.context.drawImage(
        parameciumLayerCanvas(this.scene, `lid-${lidFrame}`, inverted),
        eyeLeft + eyeLayerOffsetX,
        eyeTop + eyeLayerOffsetY,
        size,
        size,
      );
    }
    this.context.drawImage(
      parameciumLayerCanvas(this.scene, 'outline', inverted),
      eyeLeft + eyeLayerOffsetX,
      eyeTop + eyeLayerOffsetY,
      size,
      size,
    );
    this.context.restore();
    this.context.restore();
  }
}