import type Phaser from 'phaser';
import manifest from '../assets/amoeba/manifest.json';

const SOURCE_SIZE = 832;
const TEXTURE_SIZE = 112;
const PREFIX = 'amoeba-';
export const AMOEBA_CONTOUR_FRAME_COUNT = 32;
export const AMOEBA_FACE_FRAME_COUNT = 33;
const layers = [
  ...Array.from({ length: AMOEBA_CONTOUR_FRAME_COUNT }, (_, index) => `body-frame-${String(index).padStart(2, '0')}`),
  ...Array.from({ length: AMOEBA_FACE_FRAME_COUNT }, (_, index) => `face-frame-${String(index).padStart(2, '0')}`),
  ...Array.from({ length: 11 }, (_, index) => `lid-${index}`),
];
const expectedFiles = new Set(layers.flatMap(layer => [`${layer}.png`, `${layer}-inverse.png`]));
const bundledPngs = import.meta.glob<string>('../assets/amoeba/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export type AmoebaArtworkStatus = 'loading' | 'ready' | 'unavailable';

export interface AmoebaArtworkMetadata {
  neutralBounds: { left: number; top: number; right: number; bottom: number };
  neutralPose: { body: string; face: string; lid: string; rotationDegrees: number };
  coordinates: { viewBox: { x: number; y: number; width: number; height: number }; rasterSize: number; runtimeSize: number };
}

export function validateAmoebaManifest(value: unknown): value is AmoebaArtworkMetadata {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, any>;
  const bounds = data.neutralBounds;
  const pose = data.neutralPose;
  const coordinates = data.coordinates;
  const viewBox = coordinates?.viewBox;
  return Boolean(data.size === SOURCE_SIZE && data.contourFrameCount === AMOEBA_CONTOUR_FRAME_COUNT
    && data.faceFrameCount === AMOEBA_FACE_FRAME_COUNT
    && typeof data.masterSha256 === 'string' && /^[a-f0-9]{64}$/.test(data.masterSha256)
    && typeof data.previewSha256 === 'string' && /^[a-f0-9]{64}$/.test(data.previewSha256)
    && Array.isArray(data.layers) && data.layers.length === layers.length
    && layers.every((layer, index) => data.layers[index] === layer)
    && bounds && [bounds.left, bounds.top, bounds.right, bounds.bottom].every(Number.isFinite)
    && bounds.left >= -32 && bounds.top >= -32 && bounds.right <= 800 && bounds.bottom <= 800
    && bounds.right > bounds.left && bounds.bottom > bounds.top
    && pose?.body === 'body-frame-00' && pose.face === 'face-frame-00' && pose.lid === 'open' && pose.rotationDegrees === 0
    && viewBox?.x === -32 && viewBox.y === -32 && viewBox.width === SOURCE_SIZE && viewBox.height === SOURCE_SIZE
    && coordinates.rasterSize === SOURCE_SIZE && coordinates.runtimeSize === TEXTURE_SIZE);
}

export function getAmoebaArtworkMetadata(): AmoebaArtworkMetadata | null {
  return validateAmoebaManifest(manifest) ? manifest : null;
}

export function amoebaTextureKey(layer: string, inverted = false): string {
  return `${PREFIX}${layer}${inverted ? '-inverse' : ''}`;
}

export function amoebaLayerCanvas(scene: Phaser.Scene, layer: string, inverted = false): HTMLCanvasElement {
  return scene.textures.get(amoebaTextureKey(layer, inverted)).getSourceImage() as HTMLCanvasElement;
}

export async function registerAmoebaAssets(scene: Phaser.Scene): Promise<boolean> {
  if (!getAmoebaArtworkMetadata()) {
    console.warn('Invalid amoeba asset metadata');
    return false;
  }
  const files = Object.entries(bundledPngs).map(([path, url]) => ({
    filename: path.slice(path.lastIndexOf('/') + 1),
    url,
  }));
  if (files.length !== expectedFiles.size || files.some(file => !expectedFiles.has(file.filename))) {
    console.warn('Incomplete amoeba asset set', { loaded: files.length, expected: expectedFiles.size });
    return false;
  }

  try {
    const images: Array<{ filename: string; canvas: HTMLCanvasElement }> = [];
    for (let offset = 0; offset < files.length; offset += 8) {
      const batch = await Promise.all(files.slice(offset, offset + 8).map(async ({ filename, url }) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (image.naturalWidth !== SOURCE_SIZE || image.naturalHeight !== SOURCE_SIZE) {
          throw new Error(`Invalid amoeba image dimensions: ${filename}`);
        }
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = TEXTURE_SIZE;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(image, 0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
        return { filename, canvas };
      }));
      images.push(...batch);
    }

    const addedKeys: string[] = [];
    try {
      for (const { filename, canvas } of images) {
        const key = `${PREFIX}${filename.slice(0, -4)}`;
        if (!scene.textures.addCanvas(key, canvas)) throw new Error(`Unable to register amoeba texture: ${key}`);
        addedKeys.push(key);
      }
      return true;
    } catch (error) {
      addedKeys.forEach(key => scene.textures.remove(key));
      throw error;
    }
  } catch (error) {
    console.warn('Unable to register the complete amoeba asset set', error);
    return false;
  }
}
