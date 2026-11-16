import './styles.css';
import { createLevel } from './game/index.ts';
import type { GameLevel, LevelEvent, LevelState, Position } from './game/index.ts';
import { selectIdleHint } from './game/board.ts';
import { BoardView } from './view/board-view.ts';

const resetButton = document.querySelector<HTMLButtonElement>('#reset')!;
const status = document.querySelector<HTMLElement>('#status')!;
const progress = document.querySelector<HTMLElement>('.progress-track')!;
const progressFill = document.querySelector<HTMLElement>('#progress-fill')!;
const removed = document.querySelector<HTMLElement>('[data-testid="removed"]')!;
const target = document.querySelector<HTMLElement>('[data-testid="target"]')!;
const turns = document.querySelector<HTMLElement>('[data-testid="turns"]')!;
const freeMoves = document.querySelector<HTMLElement>('[data-testid="free-moves"]')!;
const failureDialog = document.querySelector<HTMLDialogElement>('#failure-dialog')!;
const dismissFailure = document.querySelector<HTMLButtonElement>('#dismiss-failure')!;
const winDialog = document.querySelector<HTMLDialogElement>('#win-dialog')!;
const dismissWin = document.querySelector<HTMLButtonElement>('#dismiss-win')!;
const freeMovesStat = freeMoves.closest('.stat') as HTMLElement;

let level: GameLevel;
let view: BoardView;
let resetting = false;
let failureDialogEpoch: number | null = null;
let winDialogEpoch: number | null = null;
let idleTimer: number | null = null;
let idleDeadline: number | null = null;
let pausedIdleRemaining: number | null = null;
let hintController: AbortController | null = null;
let hintRandomState = 0x4f1bbcdc;
let disposed = false;
const IDLE_HINT_DELAY_MS = 10_000;

function hintRandom(): number {
	hintRandomState = (hintRandomState + 0x6d2b79f5) >>> 0;
	let value = hintRandomState;
	value = Math.imul(value ^ (value >>> 15), value | 1);
	value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
	return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function cancelIdleHint(): void {
	if (idleTimer !== null) window.clearTimeout(idleTimer);
	idleTimer = null;
	idleDeadline = null;
	hintController?.abort();
	hintController = null;
	freeMovesStat.classList.remove('hint-flash');
}

function scheduleIdleHint(expectedEpoch: number, delayMs = IDLE_HINT_DELAY_MS): void {
	cancelIdleHint();
	if (disposed || resetting || level.state.status !== 'ready' || level.state.epoch !== expectedEpoch) return;
	idleDeadline = Date.now() + delayMs;
	idleTimer = window.setTimeout(() => {
		idleTimer = null;
		idleDeadline = null;
		if (resetting || level.state.status !== 'ready' || level.state.epoch !== expectedEpoch) return;
		const state = level.state;
		const choice = selectIdleHint(state.board, state.freeMoves, hintRandom);
		const controller = new AbortController();
		hintController = controller;
		const finish = (): void => {
			if (hintController !== controller) return;
			hintController = null;
			if (!controller.signal.aborted && !resetting && level.state.status === 'ready' && level.state.epoch === expectedEpoch) {
				scheduleIdleHint(expectedEpoch);
			}
		};
		if (choice.type === 'move') {
			void view.hint(choice.hint.highlight, controller.signal).catch(error => {
				if (!controller.signal.aborted) console.error(error);
			}).finally(finish);
		} else if (choice.type === 'free-moves') {
			void (async () => {
				try {
					for (const inverted of [true, false, true, false]) {
						if (controller.signal.aborted) return;
						freeMovesStat.classList.toggle('hint-flash', inverted);
						await new Promise<void>((resolve, reject) => {
							const cleanup = (): void => controller.signal.removeEventListener('abort', abort);
							const timer = window.setTimeout(() => { cleanup(); resolve(); }, 125);
							const abort = (): void => { window.clearTimeout(timer); cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
							controller.signal.addEventListener('abort', abort, { once: true });
							if (controller.signal.aborted) abort();
						});
					}
				} catch (error) {
					if (!controller.signal.aborted) console.error(error);
				} finally {
					freeMovesStat.classList.remove('hint-flash');
					finish();
				}
			})();
		}
	}, delayMs);
}

function beginBoardInteraction(): void {
	if (resetting || level.state.status !== 'ready') return;
	pausedIdleRemaining = idleDeadline === null ? IDLE_HINT_DELAY_MS : Math.max(0, idleDeadline - Date.now());
	cancelIdleHint();
}

function endBoardInteraction(): void {
	const remaining = pausedIdleRemaining;
	pausedIdleRemaining = null;
	if (remaining !== null && !resetting && level.state.status === 'ready') scheduleIdleHint(level.state.epoch, remaining);
}

function publish(state: LevelState, message?: string): void {
	removed.textContent = String(state.removed);
	target.textContent = String(state.target);
	turns.textContent = String(state.turns);
	freeMoves.textContent = String(state.freeMoves);
	progress.setAttribute('aria-valuemax', String(state.target));
	progress.setAttribute('aria-valuenow', String(Math.min(state.removed, state.target)));
	progressFill.style.width = `${Math.min(100, state.removed / state.target * 100)}%`;
	status.textContent = message ?? ({ ready: 'Choose two neighboring creatures.', resolving: 'Resolving the food chain...', won: 'Goal reached! Level complete.', lost: 'No moves left. Reset to try again.' }[state.status]);
	if (state.status === 'lost' && failureDialogEpoch !== state.epoch) {
		cancelIdleHint();
		failureDialogEpoch = state.epoch;
		if (!failureDialog.open) failureDialog.showModal();
	}
}

dismissFailure.addEventListener('click', () => failureDialog.close());
dismissWin.addEventListener('click', () => winDialog.close());

function showWinAfterRender(state: LevelState): void {
	if (disposed || resetting || state.status !== 'won' || winDialogEpoch === state.epoch) return;
	winDialogEpoch = state.epoch;
	winDialog.showModal();
}

async function move(first: Position, second: Position): Promise<void> {
	if (resetting || level.state.status !== 'ready') return;
	const remainingIdle = pausedIdleRemaining ?? (idleDeadline === null ? null : Math.max(0, idleDeadline - Date.now()));
	pausedIdleRemaining = null;
	cancelIdleHint();
	const epoch = level.state.epoch;
	try {
		const pending = level.move(first, second, async (event: LevelEvent) => {
			if (level.state.epoch !== epoch || event.signal.aborted) return;
			publish(level.state);
			await view.effect(event);
		});
		publish(level.state);
		view.render(level.state.board);
		const accepted = await pending;
		if (level.state.epoch !== epoch || resetting) return;
		view.render(level.state.board);
		publish(level.state, accepted ? undefined : 'That move is unavailable. Try another pair.');
		if (accepted) showWinAfterRender(level.state);
		if (level.state.status === 'ready') scheduleIdleHint(epoch, accepted ? IDLE_HINT_DELAY_MS : remainingIdle ?? IDLE_HINT_DELAY_MS);
	} catch (error) {
		if (level.state.epoch !== epoch || resetting) return;
		console.error(error);
		publish(level.state, 'The move could not be completed. Try again.');
		view.render(level.state.board);
		if (level.state.status === 'ready') scheduleIdleHint(epoch, remainingIdle ?? IDLE_HINT_DELAY_MS);
	}
}

resetButton.addEventListener('click', async () => {
	resetting = true;
	pausedIdleRemaining = null;
	cancelIdleHint();
	if (failureDialog.open) failureDialog.close();
	if (winDialog.open) winDialog.close();
	view.clearSelection();
	const pending = level.reset();
	const epoch = level.state.epoch;
	publish(level.state, 'Preparing a new board...');
	try {
		await pending;
		if (level.state.epoch !== epoch) return;
		resetting = false;
		failureDialogEpoch = null;
		view.render(level.state.board);
		publish(level.state);
		scheduleIdleHint(epoch);
	} catch (error) {
		if (level.state.epoch !== epoch) return;
		resetting = false;
		view.render(level.state.board);
		publish(level.state, 'Could not reset the board. Please try again.');
		scheduleIdleHint(epoch);
		console.error(error);
	}
});

try {
	level = await createLevel();
	view = new BoardView(
		document.querySelector<HTMLElement>('#board')!,
		level.state.board,
		move,
		() => !resetting && level.state.status === 'ready',
		beginBoardInteraction,
		endBoardInteraction,
	);
	resetButton.disabled = false;
	publish(level.state);
	scheduleIdleHint(level.state.epoch);
} catch (error) {
	status.textContent = 'Could not start the game. Reload the page to try again.';
	console.error(error);
}

window.addEventListener('pagehide', () => {
	disposed = true;
	pausedIdleRemaining = null;
	cancelIdleHint();
}, { once: true });