import type Phaser from 'phaser';
import { creatureBoxTransform } from './creature-sizing.ts';
import type { CreatureBounds } from './creature-sizing.ts';

type LabelEntry = {
  cellSize: number;
  fraction: number;
  remove: () => void;
};

export interface CreatureLabelRenderer {
  create: (value: string, cellSize: number, fraction: number, color: string, fontFamily?: string) => Phaser.GameObjects.Text;
  refresh: () => void;
  destroy: () => void;
}

export function createCreatureLabelRenderer(scene: Phaser.Scene): CreatureLabelRenderer {
  const boundsCache = new Map<string, CreatureBounds>();
  const labels = new Map<Phaser.GameObjects.Text, LabelEntry>();
  const fonts = document.fonts;
  let disposed = false;

  function calibrate(label: Phaser.GameObjects.Text, entry: LabelEntry): void {
    const key = JSON.stringify([label.text, label.style.fontFamily, label.style.fontSize, label.style.fontStyle]);
    let bounds = boundsCache.get(key);
    if (!bounds) {
      const canvas = label.canvas;
      const pixels = label.context.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (!pixels[(y * canvas.width + x) * 4 + 3]) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
      }
      bounds = { left, top, right, bottom };
      boundsCache.set(key, bounds);
    }
    const relativeBounds = {
      left: bounds.left - label.displayOriginX, top: bounds.top - label.displayOriginY,
      right: bounds.right - label.displayOriginX, bottom: bounds.bottom - label.displayOriginY,
    };
    const transform = creatureBoxTransform(relativeBounds, entry.cellSize, entry.fraction);
    label.setScale(transform.scale).setPosition(transform.offsetX, transform.offsetY);
  }

  function refresh(): void {
    if (disposed) return;
    boundsCache.clear();
    for (const [label, entry] of labels) {
      label.style.update(true);
      calibrate(label, entry);
    }
  }

  function destroy(): void {
    if (disposed) return;
    disposed = true;
    fonts?.removeEventListener('loadingdone', refresh);
    fonts?.removeEventListener('loadingerror', refresh);
    scene.events.off('shutdown', destroy);
    for (const [label, entry] of labels) label.off('destroy', entry.remove);
    labels.clear();
    boundsCache.clear();
  }

  fonts?.addEventListener('loadingdone', refresh);
  fonts?.addEventListener('loadingerror', refresh);
  void fonts?.ready.then(refresh);
  scene.events.once('shutdown', destroy);

  return {
    create(value, cellSize, fraction, color, fontFamily = 'Space Grotesk, sans-serif') {
      if (disposed) throw new Error('Creature label renderer has been destroyed');
      if (!/^\d+$/.test(value)) throw new RangeError('Creature labels must contain digits');
      creatureBoxTransform({ left: 0, top: 0, right: 1, bottom: 1 }, cellSize, fraction);
      const label = scene.add.text(0, 0, value, {
        fontFamily, fontSize: '152px', fontStyle: 'bold', color,
      }).setOrigin(0.5);
      const entry = { cellSize, fraction, remove: () => { labels.delete(label); } };
      labels.set(label, entry);
      label.once('destroy', entry.remove);
      try {
        calibrate(label, entry);
      } catch (error) {
        label.destroy();
        throw error;
      }
      return label;
    },
    refresh,
    destroy,
  };
}