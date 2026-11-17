import Phaser from 'phaser';
import { GameLevel } from '../../../../src/game/level.ts';
import type { Board, Creature, Position } from '../../../../src/game/creature.ts';
import { seededRandom } from '../../../../src/game/random.ts';
import { BoardView } from '../../../../src/view/board-view.ts';
import type { CandidateActionAcknowledgment, CandidateCapabilities, CandidateDefinition, CandidateInstance, RendererId } from '../contracts.ts';
import type { ScriptedAction, Workload } from '../fixtures.ts';
import { SharedFrameParameciumRenderer } from '../shared-frame-renderer.ts';

const capabilities: CandidateCapabilities = {
  silhouette: 'unverified',
  'rank-sizing': 'unverified',
  'independent-blink': 'unverified',
  'independent-gaze': 'unverified',
  'body-motion': 'unverified',
  selection: 'unverified',
  'drag-cancel': 'unverified',
  'reaction-flash': 'unverified',
  'movement-refill': 'unverified',
  reset: 'unverified',
  'reduced-motion': 'unverified',
  'mouse-input': 'unverified',
  'touch-input': 'unverified',
};

function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function cloneBoard(board: Board): Board {
  return board.map(row => row.map(creature => creature && { ...creature }));
}

function positionPoint(canvas: HTMLCanvasElement, position: Position): { x: number; y: number } {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: bounds.left + bounds.width * (position.col + 0.5) / 8,
    y: bounds.top + bounds.height * (position.row + 0.5) / 8,
  };
}

function dispatchPointer(
  canvas: HTMLCanvasElement,
  type: string,
  position: Position,
  pointerId: number,
  buttons: number,
): void {
  const point = positionPoint(canvas, position);
  canvas.dispatchEvent(new PointerEvent(type, {
    bubbles: true,
    pointerId,
    isPrimary: true,
    button: 0,
    buttons,
    clientX: point.x,
    clientY: point.y,
    pointerType: 'mouse',
  }));
}

async function withSyntheticPointerCapture<T>(canvas: HTMLCanvasElement, action: () => Promise<T>): Promise<T> {
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const name of ['setPointerCapture', 'hasPointerCapture', 'releasePointerCapture']) {
    originals.set(name, Object.getOwnPropertyDescriptor(canvas, name));
  }
  Object.defineProperties(canvas, {
    setPointerCapture: { configurable: true, value: () => {} },
    hasPointerCapture: { configurable: true, value: () => false },
    releasePointerCapture: { configurable: true, value: () => {} },
  });
  try {
    return await action();
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(canvas, name, descriptor);
      else delete (canvas as unknown as Record<string, unknown>)[name];
    }
  }
}

export function createBoardCandidate(
  id: 'current-canvas' | 'shared-frame' | 'webgl',
  forceWebGL: boolean,
): CandidateDefinition {
  const sharedFrame = id === 'shared-frame';
  return {
    id,
    version: forceWebGL ? 'production-BoardView-forced-webgl' : sharedFrame ? 'shared-board-canvas-v1' : 'production-BoardView',
    expectedRenderer: forceWebGL ? 'webgl' : 'canvas',
    capabilities,
    create: ({ container, workload, onAcknowledgment }) => {
      const level = new GameLevel(cloneBoard(workload.board), { random: seededRandom(workload.seed) });
      const mount = container.querySelector<HTMLElement>('#candidate-root') ?? container;
      Object.assign(mount.style, { width: 'min(800px, 100vw)', aspectRatio: '1', marginInline: 'auto' });
      let view: BoardView;
      let moveTask: Promise<boolean> = Promise.resolve(false);
  let pointerId = 0;
      let disposed = false;
      let sharedRenderer: SharedFrameParameciumRenderer | null = null;

      const performMove = async (first: Position, second: Position): Promise<boolean> => {
    if (disposed || level.state.status !== 'ready') return false;
    view.beginMove();
    const pending = level.move(first, second, event => view.effect(event));
    view.render(level.state.board);
    const accepted = await pending;
    if (disposed) return accepted;
    if (accepted) view.commitMove(level.state.board);
    else view.rollbackMove();
    view.render(level.state.board);
    return accepted;
  };

      const originalGameConstructor = Phaser.Game;
      if (forceWebGL) {
        const ForcedWebGLGame = class extends originalGameConstructor {
          constructor(configuration: Phaser.Types.Core.GameConfig) {
            super({ ...configuration, type: Phaser.WEBGL });
          }
        };
        Object.defineProperty(Phaser, 'Game', { configurable: true, writable: true, value: ForcedWebGLGame });
      }
      try {
        view = new BoardView(
          mount,
          level.state.board,
          (first, second) => { moveTask = performMove(first, second); },
          () => !disposed && level.state.status === 'ready',
        );
      } finally {
        if (forceWebGL) Object.defineProperty(Phaser, 'Game', { configurable: true, writable: true, value: originalGameConstructor });
      }
      const internals = view as unknown as {
        scene: Phaser.Scene;
        assetStatus: 'loading' | 'ready' | 'unavailable';
        amoebaAssetStatus: 'loading' | 'ready' | 'unavailable';
        attachParamecia: () => void;
        piece: (creature: Creature, position: Position, inverted?: boolean, tracked?: boolean) => Phaser.GameObjects.Container;
        render: (board: Board, inverted?: ReadonlySet<string>) => void;
        cells: Map<string, { x: number; y: number }>;
      };
      if (sharedFrame) {
        internals.attachParamecia = () => {};
        const originalPiece = internals.piece.bind(view);
        internals.piece = (creature, position, inverted, tracked) => {
          if (creature.level !== 0 || internals.assetStatus !== 'ready') {
            return originalPiece(creature, position, inverted, tracked);
          }
          internals.assetStatus = 'loading';
          try {
            const piece = originalPiece(creature, position, inverted, tracked);
            if (piece.length > 1) piece.removeAt(1, true);
            return piece;
          } finally {
            internals.assetStatus = 'ready';
          }
        };
        const originalRender = internals.render.bind(view);
        internals.render = (board, inverted = new Set()) => {
          originalRender(board, inverted);
          sharedRenderer?.setBoard(board, inverted);
        };
      }
      const canvas = mount.querySelector<HTMLCanvasElement>('canvas');
      if (!canvas) throw new Error('Production BoardView did not create a canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';

      let actualRenderer: RendererId = 'unknown';
      const ready = (async (): Promise<void> => {
        const deadline = performance.now() + 15_000;
        const requiresParamecia = workload.cells.some(cell => cell.creature.level === 0);
        while (performance.now() < deadline) {
          const label = canvas.getAttribute('aria-label') ?? '';
          const needsAmoebae = workload.cells.some(cell => cell.creature.level === 1);
          if ((requiresParamecia && internals.assetStatus === 'unavailable')
            || (needsAmoebae && internals.amoebaAssetStatus === 'unavailable')) {
            throw new Error('Required candidate artwork is unavailable; numbered fallback is not visual parity');
          }
          const parameciaReady = !requiresParamecia || internals.assetStatus === 'ready';
          const amoebaeReady = !needsAmoebae || internals.amoebaAssetStatus === 'ready';
          if (label.startsWith('Eight by eight game board.') && parameciaReady && amoebaeReady) {
            if (sharedFrame) {
              if (requiresParamecia && internals.assetStatus !== 'ready') throw new Error('Shared-frame candidate requires the complete paramecium asset set');
              for (const cell of workload.cells) {
                if (cell.creature.level !== 0) continue;
                const piece = internals.cells.get(`${cell.position.row},${cell.position.col}`) as Phaser.GameObjects.Container | undefined;
                if (piece && (piece.length ?? 0) > 1) piece.removeAt(1, true);
              }
              sharedRenderer = new SharedFrameParameciumRenderer(internals.scene, position => {
                const piece = internals.cells.get(`${position.row},${position.col}`);
                return piece ? { x: piece.x, y: piece.y } : { x: position.col * 100 + 50, y: position.row * 100 + 50 };
              });
              sharedRenderer.setBoard(level.state.board);
            }
            const rendererType = (view as unknown as { game: { renderer: { type: number } } }).game.renderer.type;
            actualRenderer = rendererType === Phaser.WEBGL ? 'webgl' : rendererType === Phaser.CANVAS ? 'canvas' : 'unknown';
            if (actualRenderer !== (forceWebGL ? 'webgl' : 'canvas')) {
              throw new Error(`Expected ${forceWebGL ? 'webgl' : 'canvas'}, initialized ${actualRenderer}`);
            }
            return;
          }
          await wait(25);
        }
        throw new Error('Production BoardView did not finish its asset readiness barrier');
      })();

      const dispatch = async (action: ScriptedAction): Promise<CandidateActionAcknowledgment> => {
        const requestedAt = performance.now();
        let accepted = false;
        await withSyntheticPointerCapture(canvas, async () => {
          if (action.type === 'select') {
            pointerId++;
            dispatchPointer(canvas, 'pointerdown', action.position, pointerId, 1);
            dispatchPointer(canvas, 'pointerup', action.position, pointerId, 0);
            accepted = true;
          } else if (action.type === 'drag') {
            pointerId++;
            dispatchPointer(canvas, 'pointerdown', action.from, pointerId, 1);
            dispatchPointer(canvas, 'pointermove', action.to, pointerId, 1);
            dispatchPointer(canvas, 'pointerup', action.to, pointerId, 0);
            accepted = await moveTask;
          } else if (action.type === 'cancel') {
            pointerId++;
            dispatchPointer(canvas, 'pointerdown', action.position, pointerId, 1);
            dispatchPointer(canvas, 'pointercancel', action.position, pointerId, 0);
            accepted = true;
          } else {
            view.beginReset();
            try {
              await level.reset();
              view.resetSucceeded();
              view.render(level.state.board);
              accepted = true;
            } catch (error) {
              view.resetFailed();
              view.render(level.state.board);
              throw error;
            }
          }
        });
        const acknowledgment: CandidateActionAcknowledgment = {
          action: structuredClone(action),
          requestedAt,
          acknowledgedAt: performance.now(),
          accepted,
          outcome: cloneBoard(level.state.board),
        };
        onAcknowledgment(acknowledgment);
        return acknowledgment;
      };

      const instance: CandidateInstance = {
        get renderer() { return actualRenderer; },
        ready,
        dispatch,
        snapshot: () => ({
          board: cloneBoard(level.state.board),
          selected: (view as unknown as { selected: Position | null }).selected,
          status: disposed ? 'incomplete' : 'ready',
        }),
        destroy: () => {
          if (disposed) return;
          disposed = true;
          sharedRenderer?.destroy();
          view.destroy();
          mount.replaceChildren();
        },
      };
  return instance;
    },
  };
}

export function createCurrentCanvasCandidate(): CandidateDefinition {
  return createBoardCandidate('current-canvas', false);
}

export function createSharedFrameCandidate(): CandidateDefinition {
  return createBoardCandidate('shared-frame', false);
}
