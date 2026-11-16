import type Phaser from 'phaser';

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

export function parameciumTextureKey(layer: string, inverted = false): string {
  return `${PREFIX}${layer}${inverted ? '-inverse' : ''}`;
}

export function parameciumLayerCanvas(scene: Phaser.Scene, layer: string, inverted = false): HTMLCanvasElement {
  return scene.textures.get(parameciumTextureKey(layer, inverted)).getSourceImage() as HTMLCanvasElement;
}

export async function registerParameciumAssets(scene: Phaser.Scene): Promise<boolean> {
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