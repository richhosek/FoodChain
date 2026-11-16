# Research: Gameplay Helpers

## Reaction-Producing Legal Move Discovery

**Decision**: Define a reaction-producing legal move as an in-bounds orthogonal adjacent swap whose post-swap board yields at least one reaction candidate. Candidate discovery must match feature 004: include both moved creatures as possible prey and include neighboring stationary prey when either moved creature is exactly one level higher. A candidate qualifies when it has at least three eligible adjacent predators, including diagonals. Reuse this same pure rule for `GameLevel.move`, terminal move detection, and random hint selection.

**Rationale**: The hint must identify a move the game will actually accept as a reaction. The current `predictsReaction`/`hasReactingSwap` helpers only examine the two swapped positions, while `GameLevel.move` already includes stationary prey affected by moved predators. A shared candidate rule avoids disagreement between hints, terminal status, and accepted moves.

**Alternatives considered**: Enumerating only moved prey was rejected because it misses feature-004 predator-triggered reactions. Scanning for arbitrary already-valid prey groups was rejected because stationary unrelated groups must not activate unless a moved predator joins them. Mutating a live `GameLevel` to test moves was rejected because hint discovery must not change state, draw gameplay randomness, or fire effects.

## Hint Selection and Randomness

**Decision**: Enumerate all reacting adjacent swaps from the current ready board at the idle deadline, then choose one using a dedicated hint-random source that is separate from the gameplay random source. Inject the source so selection is deterministic in tests. Highlight a participating creature without applying the swap.

**Rationale**: The game consumes random values for generation and refill. A hint must be observational only and cannot shift future gameplay draws. Board size is fixed at 8x8, so enumerating adjacent pairs only when a hint is due is bounded and inexpensive.

**Alternatives considered**: Calling `Math.random` where it is also the game random source was rejected because it changes future gameplay outcomes. Predicting a move via `GameLevel.move` was rejected because it would mutate counters, trigger effects, and potentially consume refill values.

## Idle Timer and Cancellation

**Decision**: Own the inactivity timer in the app/controller layer. Start or restart a 10-second interval only after a ready board is settled. Cancel the timer and any active hint effect when a move starts, reset begins, the level becomes terminal, or the view/controller is disposed. After a hint completes, allow another hint only after another complete idle interval.

**Rationale**: The controller owns board lifecycle and knows when accepted moves and cascades have fully settled. This prevents hints during reaction/refill effects and makes reset epochs the authority for stale async work.

**Alternatives considered**: A timer inside the Phaser scene was rejected because terminal status, free-move state, and reset lifecycle belong to the controller/domain boundary. Resetting the timer on any pointer event was rejected because the requirement is based on making a move, not merely touching the board.

## Failure Dialog and Free-Move Feedback

**Decision**: Display an accessible dismissible failure dialog when the existing level state becomes `lost`. Dismissal closes the dialog but does not restore play or alter state; Reset is the recovery route. When no reaction-producing swaps exist but free moves remain, flash the existing Free Moves counter using the same inverse-phase effect pattern as creature hints. If neither reacting moves nor free moves exist, show the failure dialog instead of any idle hint.

**Rationale**: `GameLevel` already determines loss when free moves are exhausted and no reacting swap remains. The application shell owns status/scoreboard and reset; a dialog there preserves the separation from board mechanics. Existing `flashCells` provides four 125 ms alternating phases (500 ms total) and abort support.

**Alternatives considered**: A new modal or animation dependency is unnecessary. Treating the dismissal as a restart was rejected because the request only asks for a dismissible notice and the app already has Reset.

## Existing Project Choices

**Decision**: Retain TypeScript 6.0.2, Phaser 4.1.0, Vite 8.3.8, Node `node:test`, Playwright 1.65.1, and the existing desktop/mobile test projects.

**Rationale**: These are already pinned and used by the game. The feature extends existing board effects and DOM scoreboard presentation without a new package or platform.

**Sources**:

- Existing terminal/loss and accepted move flow: [src/game/level.ts](../../src/game/level.ts).
- Existing move candidate behavior and neighbor helpers: [src/game/board.ts](../../src/game/board.ts), [src/game/mechanics.ts](../../src/game/mechanics.ts).
- Existing inverse flash and abort behavior: [src/view/effects.ts](../../src/view/effects.ts).
- Existing app controller and Free Moves counter: [src/main.ts](../../src/main.ts), [index.html](../../index.html).
- Existing engine selection and project test decisions: [specs/001-gameplay-prototype/research.md](../001-gameplay-prototype/research.md).
