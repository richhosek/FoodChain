import Phaser from 'phaser';
import { updateParameciumMotion } from './paramecium-motion.ts';
import type { ParameciumMotionFrame, ParameciumMotionState } from './paramecium-motion.ts';
import { parameciumLayerCanvas, parameciumNeutralBounds, parameciumTextureKey } from './paramecium-assets.ts';
import { creatureBoxTransform, creatureSizeFraction } from './creature-sizing.ts';

const SOURCE_SIZE = 896;
const TEXTURE_SIZE = 112;
const CILIA_FRAME_COUNT = 32;
const EYE_SCALE = 1.5;
const EYE_CENTER_X = 451 + 64;
const EYE_CENTER_Y = 202 + 64;
const COMPOSITE_INTERVAL_SECONDS = 0.1;
let nextCompositeTextureId = 0;

function canvasOffset(sourceOffset: number): number {
  return sourceOffset * TEXTURE_SIZE / SOURCE_SIZE;
}

function sameFrame(first: ParameciumMotionFrame, second: ParameciumMotionFrame): boolean {
  return first.ciliaFrameIndex === second.ciliaFrameIndex
    && first.blinkClosure === second.blinkClosure
    && first.gazeX === second.gazeX
    && first.gazeY === second.gazeY
    && first.internalDetails.every((offset, index) =>
      offset.x === second.internalDetails[index]?.x && offset.y === second.internalDetails[index]?.y);
}

export interface ParameciumArtwork {
  container: Phaser.GameObjects.Container;
  advance(deltaSeconds: number, reducedMotion: boolean): void;
}

export function createParameciumArtwork(
  scene: Phaser.Scene,
  state: ParameciumMotionState,
  cellSize: number,
  inverted: boolean,
): ParameciumArtwork {
  if (!parameciumNeutralBounds) throw new Error('Invalid or missing paramecium design metadata');
  const { scale, offsetX, offsetY } = creatureBoxTransform(parameciumNeutralBounds, cellSize, creatureSizeFraction(0, 0));
  const artwork = scene.add.container(0, 0);
  const ciliaLayers = Array.from({ length: CILIA_FRAME_COUNT }, (_, index) =>
    parameciumLayerCanvas(scene, `cilia-${index}`, inverted));
  const body = parameciumLayerCanvas(scene, 'body', inverted);
  const details = [0, 1, 2].map(index => parameciumLayerCanvas(scene, `detail-${index}`, inverted));
  const eye = parameciumLayerCanvas(scene, 'eye', inverted);
  const pupil = parameciumLayerCanvas(scene, 'pupil', inverted);
  const lids = [null, ...Array.from({ length: 10 }, (_, index) =>
    parameciumLayerCanvas(scene, `lid-${index + 1}`, inverted))];
  const outline = parameciumLayerCanvas(scene, 'outline', inverted);
  const bodyCanvas = document.createElement('canvas');
  bodyCanvas.width = bodyCanvas.height = TEXTURE_SIZE;
  const bodyContext = bodyCanvas.getContext('2d');
  const eyeCanvas = document.createElement('canvas');
  eyeCanvas.width = eyeCanvas.height = TEXTURE_SIZE;
  const eyeContext = eyeCanvas.getContext('2d');
  if (!bodyContext || !eyeContext) throw new Error('Canvas unavailable');
  const textureId = nextCompositeTextureId++;
  const bodyTextureKey = `${parameciumTextureKey('creature-body')}-${textureId}`;
  const eyeTextureKey = `${parameciumTextureKey('creature-eye')}-${textureId}`;
  const compositePhase = ((textureId * 37) % 64) / 64 * COMPOSITE_INTERVAL_SECONDS;
  const bodyTexture = scene.textures.addCanvas(bodyTextureKey, bodyCanvas);
  const eyeTexture = scene.textures.addCanvas(eyeTextureKey, eyeCanvas);
  if (!bodyTexture || !eyeTexture) {
    scene.textures.remove(bodyTextureKey);
    scene.textures.remove(eyeTextureKey);
    throw new Error('Unable to create paramecium textures');
  }
  const bodyImage = scene.add.image(offsetX + SOURCE_SIZE / 2 * scale, offsetY + SOURCE_SIZE / 2 * scale, bodyTextureKey)
    .setOrigin(0.5)
    .setScale(scale * SOURCE_SIZE / TEXTURE_SIZE);
  const eyeContainer = scene.add.container(
    offsetX + EYE_CENTER_X * scale,
    offsetY + EYE_CENTER_Y * scale,
  ).setName('paramecium-eye');
  const eyeImage = scene.add.image(0, 0, eyeTextureKey)
    .setOrigin(0.5)
    .setScale(scale * SOURCE_SIZE / TEXTURE_SIZE);
  eyeContainer.add(eyeImage);
  artwork.add([bodyImage, eyeContainer]);
  artwork.once('destroy', () => {
    scene.textures.remove(bodyTextureKey);
    scene.textures.remove(eyeTextureKey);
  });

  const drawFrame = (frame: ParameciumMotionFrame): void => {
    bodyContext.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    bodyContext.drawImage(ciliaLayers[frame.ciliaFrameIndex], 0, 0);
    bodyContext.drawImage(body, 0, 0);
    frame.internalDetails.forEach((offset, index) => {
      bodyContext.drawImage(details[index], canvasOffset(offset.x), canvasOffset(offset.y));
    });
    bodyTexture.refresh();

    const eyeOffsetX = canvasOffset(SOURCE_SIZE / 2 - EYE_CENTER_X);
    const eyeOffsetY = canvasOffset(SOURCE_SIZE / 2 - EYE_CENTER_Y);
    eyeContext.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    eyeContext.drawImage(eye, eyeOffsetX, eyeOffsetY);
    eyeContext.drawImage(
      pupil,
      eyeOffsetX + canvasOffset(frame.gazeX * EYE_SCALE),
      eyeOffsetY + canvasOffset(frame.gazeY * EYE_SCALE),
    );
    const lidFrame = Math.round(frame.blinkClosure * 10);
    if (lidFrame > 0) eyeContext.drawImage(lids[lidFrame]!, eyeOffsetX, eyeOffsetY);
    eyeContext.drawImage(outline, eyeOffsetX, eyeOffsetY);
    eyeTexture.refresh();

    const rotation = Phaser.Math.DegToRad(frame.rotationDegrees);
    artwork.setRotation(rotation);
    eyeContainer.setRotation(-rotation);
  };

  let lastFrame = updateParameciumMotion(state, 0, true);
  drawFrame(lastFrame);
  let compositeElapsed = compositePhase;
  let pendingMotionSeconds = 0;
  return {
    container: artwork,
    advance(deltaSeconds, reducedMotion) {
      if (reducedMotion) {
        compositeElapsed = 0;
        pendingMotionSeconds = 0;
        return;
      }
      compositeElapsed += deltaSeconds;
      pendingMotionSeconds += deltaSeconds;
      if (compositeElapsed < COMPOSITE_INTERVAL_SECONDS) return;
      const frame = updateParameciumMotion(state, pendingMotionSeconds);
      pendingMotionSeconds = 0;
      if (!sameFrame(frame, lastFrame)) {
        drawFrame(frame);
        lastFrame = frame;
      } else {
        const rotation = Phaser.Math.DegToRad(frame.rotationDegrees);
        artwork.setRotation(rotation);
        eyeContainer.setRotation(-rotation);
      }
      compositeElapsed %= COMPOSITE_INTERVAL_SECONDS;
    },
  };
}