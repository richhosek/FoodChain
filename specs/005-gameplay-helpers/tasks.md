# Tasks: Gameplay Helpers

**Input**: Design documents from `specs/005-gameplay-helpers/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/idle-hints-and-failure-dialog.md`, and `quickstart.md`

**Tests**: Focused automated tests are required by the project constitution. Add regression tests before the corresponding implementation and verify the new assertions fail for the intended missing behavior.

**Organization**: Tasks are grouped by user story; shared reaction-swap discovery is foundational because all three stories depend on the same definition of an available reaction-producing move.

## Phase 1: Setup

**Purpose**: Verify the project environment and record a baseline without changing the level target or gameplay settings.

- [X] T001 Verify Node 24.16.x, installed dependencies, scripts, and pinned versions in `package.json` and `package-lock.json`; do not add dependencies or change the target.
- [X] T002 Run `npm run typecheck`, `npm run test:unit`, `npm run test:e2e`, and `npm run build`; record exact current totals and target-100 versus legacy target-10 failures in `specs/005-gameplay-helpers/validation.md`, referencing `specs/003-predator-evolution/validation.md` where applicable.

## Phase 2: Foundational

**Purpose**: Establish one pure and consistent definition of reaction-producing swaps for move execution, terminal detection, and hints.

- [X] T003 Add test-first coverage in `tests/unit/gameplay-helpers.test.ts` for reaction-producing swap enumeration, including moved-prey and moved-predator reactions, orthogonal/diagonal neighbors, and exclusion of unrelated stationary groups; verify the moved-predator regression fails before implementation.
- [X] T004 Implement shared post-swap reaction-candidate discovery and reaction-producing adjacent-swap enumeration in `src/game/board.ts`; reuse the candidate discovery in `src/game/level.ts` and update `hasReactingSwap`/`predictsReaction` to match feature 004 without changing refill-wave candidates.
- [X] T005 Run `node --test tests/unit/gameplay-helpers.test.ts tests/unit/domain.test.ts`; verify legal-swap discovery, loss detection, moved-predator reactions, and refill cascade candidate behavior.

**Checkpoint**: Actual move handling, terminal detection, and hint enumeration agree on what constitutes a reaction-producing swap.

## Phase 3: User Story 1 - Understand Level Failure (Priority: P1)

**Goal**: Show a dismissible failure dialog only when the settled level is lost, and keep the lost state unchanged when dismissed.

**Independent Test**: Enter the no-reaction/no-free-move state, verify the dialog appears, dismiss by close control and Escape, confirm the board remains lost, then Reset and confirm play resumes without the dialog.

### Tests for User Story 1

- [X] T006 [P] [US1] Add `tests/e2e/gameplay-helpers.spec.ts` coverage for failure-dialog trigger, close-button dismissal, Escape dismissal, unchanged lost board/counters, no dialog when free moves or reacting swaps remain, and reset cleanup; verify the new trigger assertion fails before implementation.

### Implementation for User Story 1

- [X] T007 [US1] Add an accessible dismissible failure `<dialog>` with a close control to `index.html`, including a stable test id and accessible name.
- [X] T008 [US1] Style the failure dialog, backdrop, focus state, and responsive sizing in `src/styles.css` using the existing visual system.
- [X] T009 [US1] In `src/main.ts`, show the dialog once on transition to `lost`, support Escape/close dismissal without mutating level state, and close it at reset start/success while preserving the existing Reset flow.
- [X] T010 [US1] Run the focused failure-dialog cases in `tests/e2e/gameplay-helpers.spec.ts` on desktop and mobile projects.

**Checkpoint**: Failure is clearly communicated and dismissible; closing it does not resume or mutate the terminal board.

## Phase 4: User Story 2 - Receive a Random Move Hint (Priority: P1)

**Goal**: After 10 seconds idle on a ready board with reaction-producing swaps, randomly inverse-flash one participating creature without executing a move or consuming gameplay randomness.

**Independent Test**: Use a controlled board with multiple reaction-producing swaps and controlled hint randomness; advance the timer by 10 seconds and verify the highlighted creature belongs to a valid swap while board, counters, and gameplay RNG remain unchanged.

### Tests for User Story 2

- [X] T011 [P] [US2] Extend `tests/unit/gameplay-helpers.test.ts` to verify deterministic hint choice from an injected hint-only random source, valid swap membership, no gameplay RNG draws, and no board/counter mutation.
- [X] T012 [P] [US2] Add Playwright scenarios in `tests/e2e/gameplay-helpers.spec.ts` that verify the real 10-second delay, inverse flash, no move execution, repeated idle interval, and cancellation on move, reset, and resolution; do not add production test hooks.

### Implementation for User Story 2

- [X] T013 [US2] Add a pure hint-selection helper in `src/game/board.ts` or a focused `src/game/hints.ts` that selects from the shared reaction-producing swap list using an injected hint-random source, never `GameLevel.random`.
- [X] T014 [US2] Add a cancellable single-creature inverse-flash method to `src/view/board-view.ts` or `src/view/effects.ts` that reuses the established flash phases and never mutates the authoritative board.
- [X] T015 [US2] Add the 10-second ready/settled idle scheduler in `src/main.ts`; cancel it on move start, reset, resolving/terminal transitions, disposal, and restart it after the full accepted move/cascade settles.
- [X] T016 [US2] Connect the idle callback in `src/main.ts` to select and flash one participating creature when reaction-producing swaps exist; schedule another hint only after another complete idle interval.
- [X] T017 [US2] Run the focused unit and desktop/mobile Playwright move-hint tests in `tests/unit/gameplay-helpers.test.ts` and `tests/e2e/gameplay-helpers.spec.ts`.

**Checkpoint**: Hints identify actual reaction-producing swaps, remain advisory, and do not consume gameplay randomness.

## Phase 5: User Story 3 - Point Out Remaining Free Moves (Priority: P1)

**Goal**: If no reaction-producing swap exists but free moves remain, flash the Free Moves counter after 10 idle seconds instead of showing a creature hint or failure dialog.

**Independent Test**: Use a ready board with no reacting swaps and free moves available, advance the idle interval, and verify only the counter flashes while the value and board remain unchanged.

### Tests for User Story 3

- [X] T018 [P] [US3] Add unit and Playwright assertions in `tests/unit/gameplay-helpers.test.ts` and `tests/e2e/gameplay-helpers.spec.ts` for the no-reacting-swaps/free-moves branch, counter flash, unchanged value, cancellation, and failure-dialog priority when free moves reach zero.

### Implementation for User Story 3

- [X] T019 [US3] Add an abortable inverse-flash treatment for the Free Moves counter in `src/main.ts` and `src/styles.css`, reusing the established inverse phase timing and preserving accessible counter text.
- [X] T020 [US3] Extend the idle callback in `src/main.ts` so it flashes Free Moves when no reaction-producing swaps exist and free moves remain, while giving lost-state dialog precedence and preventing overlapping hints.
- [X] T021 [US3] Run the focused free-move hint and terminal-priority cases in `tests/unit/gameplay-helpers.test.ts` and `tests/e2e/gameplay-helpers.spec.ts` on desktop and mobile projects.

**Checkpoint**: Players are directed to remaining free moves only when no reaction-producing swap exists; a terminal loss shows the failure dialog instead.

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Verify the helper feature integrates with existing gameplay and record results.

- [X] T022 Run `npm run typecheck` and `npm run build`; record results and existing build warnings in `specs/005-gameplay-helpers/validation.md`.
- [X] T023 Run `npm run test:unit` and `npm run test:e2e`; compare exact totals and failures with the baseline in `specs/005-gameplay-helpers/validation.md` without reverting target 100 or changing unrelated tests.
- [X] T024 Verify modal and hints at desktop and mobile viewport sizes; perform physical iOS/Android checks if devices are available, or record their unavailability in `specs/005-gameplay-helpers/validation.md`.
- [X] T025 Follow `specs/005-gameplay-helpers/quickstart.md` after implementation and update it only if actual validation commands or expected outcomes differ.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; verify environment and capture baseline.
- **Foundational (Phase 2)**: Depends on Setup; produces the shared reaction-producing swap definition needed by the lost-state condition and hint selection.
- **User stories (Phases 3-5)**: Depend on the foundation. The modal, creature hint, and counter hint all touch the app controller, so implement them sequentially in the listed order.
- **Polish (Phase 6)**: Depends on all three user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after T005; uses shared reaction-swap detection to retain the existing terminal condition.
- **US2 (P1)**: Starts after T005 and US1; needs the modal/terminal guards and shared legal-swap enumerator.
- **US3 (P1)**: Starts after US2; extends its idle scheduler with the no-reaction/free-moves branch and terminal priority.

### Within Each User Story

- Write and run regression tests before implementation.
- Keep legal-swap enumeration pure and share it with move execution and loss detection.
- Keep hint RNG independent from the gameplay generation/refill RNG.
- Keep timer and dialog lifecycle in the app controller; use cancellation/epoch checks to block stale effects.
- Run each story's focused checks before beginning the next sequential story.

### Parallel Opportunities

- T006's modal browser test can be authored independently from foundational move-enumeration tests after setup.
- T011 and T012 can be authored concurrently because they change separate unit and browser test files.
- T022 typecheck/build and T023 full test runs can execute concurrently after all stories are complete.

## Implementation Strategy

### MVP First

1. Complete setup and shared reaction-swap discovery (T001-T005).
2. Deliver US1 failure dialog and validate terminal behavior (T006-T010).
3. Stop and validate the first usable increment before adding idle hints.

### Incremental Delivery

1. Deliver the failure dialog for a true lost state.
2. Add the randomly chosen creature hint for reaction-producing swaps.
3. Add the Free Moves counter hint for boards with no reacting swap but remaining free moves.
4. Run integrated validation, compare failures to baseline, and record physical-device limitations.

## Notes

- Every task uses an unchecked checkbox, sequential ID, optional parallel marker, required user-story label, and exact repository-relative paths.
- Tests are included because the approved spec and project constitution require automated gameplay and platform regression coverage.
- Do not add a package, change free-move quantity, or alter the level target.
