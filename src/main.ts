import './styles.css';
import { createLevel } from './game/index.ts';
import type { GameLevel, LevelEvent, LevelState, Position } from './game/index.ts';
import { BoardView } from './view/board-view.ts';

const resetButton = document.querySelector<HTMLButtonElement>('#reset')!;
const status = document.querySelector<HTMLElement>('#status')!;
const progress = document.querySelector<HTMLElement>('.progress-track')!;
const progressFill = document.querySelector<HTMLElement>('#progress-fill')!;
const removed = document.querySelector<HTMLElement>('[data-testid="removed"]')!;
const target = document.querySelector<HTMLElement>('[data-testid="target"]')!;
const turns = document.querySelector<HTMLElement>('[data-testid="turns"]')!;
const freeMoves = document.querySelector<HTMLElement>('[data-testid="free-moves"]')!;

let level: GameLevel;
let view: BoardView;
let resetting = false;

function publish(state: LevelState, message?: string): void {
	removed.textContent = String(state.removed);
	target.textContent = String(state.target);
	turns.textContent = String(state.turns);
	freeMoves.textContent = String(state.freeMoves);
	progress.setAttribute('aria-valuemax', String(state.target));
	progress.setAttribute('aria-valuenow', String(Math.min(state.removed, state.target)));
	progressFill.style.width = `${Math.min(100, state.removed / state.target * 100)}%`;
	status.textContent = message ?? ({ ready: 'Choose two neighboring creatures.', resolving: 'Resolving the food chain...', won: 'Goal reached! Level complete.', lost: 'No moves left. Reset to try again.' }[state.status]);
}

async function move(first: Position, second: Position): Promise<void> {
	if (resetting || level.state.status !== 'ready') return;
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
		publish(level.state, accepted ? undefined : 'That move is unavailable. Try another pair.');
		view.render(level.state.board);
	} catch (error) {
		if (level.state.epoch !== epoch || resetting) return;
		console.error(error);
		publish(level.state, 'The move could not be completed. Try again.');
		view.render(level.state.board);
	}
}

resetButton.addEventListener('click', async () => {
	resetting = true;
	view.clearSelection();
	const pending = level.reset();
	const epoch = level.state.epoch;
	publish(level.state, 'Preparing a new board...');
	try {
		await pending;
		if (level.state.epoch !== epoch) return;
		resetting = false;
		view.render(level.state.board);
		publish(level.state);
	} catch (error) {
		if (level.state.epoch !== epoch) return;
		resetting = false;
		view.render(level.state.board);
		publish(level.state, 'Could not reset the board. Please try again.');
		console.error(error);
	}
});

try {
	level = await createLevel();
	view = new BoardView(document.querySelector<HTMLElement>('#board')!, level.state.board, move, () => !resetting && level.state.status === 'ready');
	resetButton.disabled = false;
	publish(level.state);
} catch (error) {
	status.textContent = 'Could not start the game. Reload the page to try again.';
	console.error(error);
}