import type Phaser from 'phaser';
import manifestText from '../assets/paramecium/manifest.json?raw';

const SIZE = 896;
const RENDER_SIZE = 112;
const PREFIX = 'paramecium-';
const layers = [
  'body',
  'detail-0',
  'detail-1',
  'detail-2',
  'eye',
  'pupil',
  'outline',
  ...Array.from({ length: 10 }, (_, index) => `lid-${index + 1}`),
  ...Array.from({ length: 32 }, (_, index) => `cilia-${index}`),
];
const expectedFiles = new Set(layers.flatMap(layer => [`${layer}.png`, `${layer}-inverse.png`]));
const bundledPngs = import.meta.glob<string>('../assets/paramecium/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export interface ParameciumBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function validateParameciumMetadata(value: unknown): ParameciumBounds | null {
  if (!value || typeof value !== 'object') return null;
  const metadata = value as Record<string, unknown>;
  const bounds = metadata.neutralBounds as Record<string, unknown> | null | undefined;
  const raster = metadata.raster as Record<string, unknown> | null | undefined;
  if (!bounds || typeof bounds !== 'object' || !raster || typeof raster !== 'object') return null;
  const { left, top, right, bottom } = bounds;
  if (![left, top, right, bottom].every(number => typeof number === 'number' && Number.isFinite(number))) return null;
  if (typeof left !== 'number' || typeof top !== 'number' || typeof right !== 'number' || typeof bottom !== 'number'
    || left >= right || top >= bottom) return null;
  const sameArray = (candidate: unknown, expected: number[]) => Array.isArray(candidate)
    && candidate.length === expected.length && candidate.every((entry, index) => entry === expected[index]);
  if (metadata.size !== SIZE || !sameArray(metadata.designViewBox, [-32, -32, 832, 832])
    || !sameArray(raster.viewBox, [-64, -64, SIZE, SIZE]) || raster.width !== SIZE || raster.height !== SIZE
    || raster.scaleX !== 1 || raster.scaleY !== 1 || raster.offsetX !== 64 || raster.offsetY !== 64
    || metadata.neutralPose !== 'unrotated body; undeformed cilia; open eye; centered gaze; stationary details'
    || metadata.coordinates !== 'SVG user units; includes strokes and round cilia caps'
    || typeof metadata.masterSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(metadata.masterSha256)
    || typeof metadata.previewSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(metadata.previewSha256)
    || left < -64 || top < -64 || right > 832 || bottom > 832) return null;
  return { left: left + 64, top: top + 64, right: right + 64, bottom: bottom + 64 };
}

export const parameciumNeutralBounds = (() => {
  try { return validateParameciumMetadata(JSON.parse(manifestText)); }
  catch { return null; }
})();

export function parameciumTextureKey(layer: string, inverted = false): string {
  return `${PREFIX}${layer}${inverted ? '-inverse' : ''}`;
}

export function parameciumLayerCanvas(scene: Phaser.Scene, layer: string, inverted = false): HTMLCanvasElement {
  return scene.textures.get(parameciumTextureKey(layer, inverted)).getSourceImage() as HTMLCanvasElement;
}

export async function registerParameciumAssets(scene: Phaser.Scene): Promise<boolean> {
  if (!parameciumNeutralBounds) {
    console.warn('Invalid or missing paramecium design metadata');
    return false;
  }
  const files = Object.entries(bundledPngs).map(([path, url]) => ({
    filename: path.slice(path.lastIndexOf('/') + 1),
    url,
  }));
  if (files.length !== expectedFiles.size || files.some(file => !expectedFiles.has(file.filename))) {
    console.warn('Incomplete paramecium asset set', { loaded: files.length, expected: expectedFiles.size });
    return false;
  }

  try {
    const images: Array<{ filename: string; canvas: HTMLCanvasElement }> = [];
    for (let offset = 0; offset < files.length; offset += 8) {
      const batch = await Promise.all(files.slice(offset, offset + 8).map(async ({ filename, url }) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (image.naturalWidth !== SIZE || image.naturalHeight !== SIZE) {
          throw new Error(`Invalid paramecium image dimensions: ${filename}`);
        }
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = RENDER_SIZE;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(image, 0, 0, RENDER_SIZE, RENDER_SIZE);
        return { filename, canvas };
      }));
      images.push(...batch);
    }

    const addedKeys: string[] = [];
    try {
      for (const { filename, canvas } of images) {
        const key = `${PREFIX}${filename.slice(0, -4)}`;
        scene.textures.addCanvas(key, canvas);
        addedKeys.push(key);
      }
    } catch (error) {
      addedKeys.forEach(key => scene.textures.remove(key));
      throw error;
    }
    return true;
  } catch (error) {
    console.warn('Unable to register the complete paramecium asset set', error);
    return false;
  }
}