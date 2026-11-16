# Tasks: Replenishment and Drag Interaction

**Input**: Design documents in `specs/002-refill-drag-interaction/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/interaction.md`, and `quickstart.md`

**Tests**: The constitution requires focused automated tests for gameplay and cross-input changes. Add tests before implementation and verify that new assertions fail for the intended missing behavior.

**Organization**: Tasks are grouped by user story; `[P]` indicates independent work in different files after its stated prerequisites have completed.

## Phase 1: Setup

**Purpose**: Verify the existing project and establish an honest baseline without undoing user edits.

- [X] T001 Verify the existing Node, dependencies, and npm scripts in `package.json` and `package-lock.json`; install with `npm ci` only if dependencies are missing, without changing the existing target or package configuration.
- [X] T002 Run the existing unit and browser suites using `package.json` scripts and record exact pre-existing failures, including any target-100 versus target-10 mismatch, in `specs/002-refill-drag-interaction/validation.md`; a documented baseline failure is not itself a reason to change the user's target.

## Phase 2: Foundational

**Purpose**: Establish deterministic test inputs without adding a production board-mutation interface.

- [X] T003 Review and extend `tests/fixtures/boards.ts` only as needed for known boards, scripted draws, and reproducible drag scenarios; keep fixture access limited to tests.
- [X] T004 Define a test-only browser setup in `tests/e2e/refill-drag-helpers.ts` using existing fixture techniques for deterministic boards, random values, pixel/position observation, and mouse/touch actions; do not expose production mutation hooks.

**Checkpoint**: Baseline results and shared test fixtures are available for both stories.

## Phase 3: User Story 1 - Rebalanced Replenishment (Priority: P1)

**Goal**: Refill with equal probability for levels 0 through 4 while leaving initial and reset generation unchanged.

**Independent Test**: Refill known empty cells with scripted values on both sides of each distribution boundary; verify levels, exactly one draw per spawn, and unchanged seeded initial boards.

### Tests for User Story 1

- [X] T005 [P] [US1] Add `tests/unit/refill-weights.test.ts` covering values at and immediately around 1/5, 2/5, 3/5, and 4/5, invalid draws, all five output levels, and one random draw per spawn.
- [X] T006 [P] [US1] Add `tests/unit/refill-integration.test.ts` covering multi-column independent refill, fixed draw order, starting/reset generation and reacting-swap guarantees unchanged for controlled seeds, and cascades using the new refill distribution.

### Implementation for User Story 1

- [X] T007 [US1] Add a dedicated replenishment sampler in `src/game/random.ts` with half-open cumulative intervals for equal level probabilities and retain the existing starting-board sampler unchanged.
- [X] T008 [US1] Update `src/game/board.ts` so `refillBoard` uses the replenishment sampler for every spawn while `generateBoard` and reset continue using the original distribution; retain random injection and column ordering.
- [X] T009 [US1] Run the focused refill tests in `tests/unit/refill-weights.test.ts` and `tests/unit/refill-integration.test.ts`; resolve new failures and compare existing unit results to the recorded baseline.

**Checkpoint**: Replenishment behavior is independently verifiable without drag changes.

## Phase 4: User Story 2 - See and Control a Dragged Swap (Priority: P1)

**Goal**: Show a reversible drag and neighboring slide, constrained to legal adjacent positions, and commit at most one move on release.

**Independent Test**: On a known board, move a creature into a neighbor and back before release, verify visual positions and unchanged counters, then release on a neighbor and observe exactly one legal swap.

### Tests for User Story 2

- [X] T010 [P] [US2] Add `tests/e2e/drag-preview.spec.ts` to assert visible pointer-following and neighbor slide before release, return to origin, direction changes, and unchanged authoritative state and counters during preview.
- [X] T011 [P] [US2] Add `tests/e2e/drag-boundaries.spec.ts` to cover all edges/corners, diagonal and nonadjacent confinement, pointer capture outside the canvas, final-neighbor release, one commit, and rejected non-reacting swaps with no free moves.
- [X] T012 [P] [US2] Add `tests/e2e/drag-cancel.spec.ts` to cover pointer cancellation, lost capture, blur/visibility changes, competing pointers, reset and board replacement during a drag, and stale releases.
- [X] T013 [P] [US2] Add `tests/e2e/drag-input.spec.ts` for equivalent mouse/touch previews and outcomes at desktop and mobile sizes, scaled canvas coordinates, and preservation of two-click/tap swaps.

### Implementation for User Story 2

- [X] T014 [US2] Implement a single-owner pointer gesture in `src/view/board-view.ts` with pointer capture, a movement threshold, grab offset, and current canvas-bounds scaling; ensure only one input path can commit a move.
- [X] T015 [US2] Implement constrained movement and reversible neighbor-slide preview in `src/view/board-view.ts`, including origin restoration, direction changes, deterministic tie handling, and no mutations or random draws before release.
- [X] T016 [US2] Implement release, beyond-board release, pointer cancellation, capture loss, blur/visibility loss, and stale-event invalidation in `src/view/board-view.ts`; clear gesture state before submitting at most one move.
- [X] T017 [US2] Integrate the preview with existing reset and rejected-swap handling in `src/main.ts` and `src/view/board-view.ts`, preserving click/tap selection, current target, resolution input locking, and authoritative redraws.
- [X] T018 [US2] Run the new drag browser tests in `tests/e2e/drag-preview.spec.ts`, `tests/e2e/drag-boundaries.spec.ts`, `tests/e2e/drag-cancel.spec.ts`, and `tests/e2e/drag-input.spec.ts`; fix feature-related failures and compare legacy results with the baseline.

**Checkpoint**: Drag behavior is independently testable with deterministic boards and the existing rules engine.

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T019 Run `npm run typecheck`, `npm run test:unit`, `npm run test:e2e`, and `npm run build` using `package.json`; record exact passes, skips, pre-existing failures, and any new failures in `specs/002-refill-drag-interaction/validation.md`.
- [X] T020 Verify desktop and mobile viewport layout and drag feedback, plus available physical iOS/Android touch and outside-release behavior, following `specs/002-refill-drag-interaction/quickstart.md`; record results or unavailability in `specs/002-refill-drag-interaction/validation.md`.
- [X] T021 Perform the five-participant preview/reversal task for SC-005 from `specs/002-refill-drag-interaction/quickstart.md`, or explicitly record it as unverified when participants are unavailable in `specs/002-refill-drag-interaction/validation.md`.
- [X] T022 Update `specs/002-refill-drag-interaction/quickstart.md` only if actual feature-validation commands or steps differ from the documented workflow.

## Dependencies & Execution Order

### Phase Dependencies

- Setup -> Foundational -> US1 and US2 -> Polish. Both stories are P1 and can be implemented independently after shared fixtures are stable; integration and final validation require both.
- T001 precedes T002; T002 is a baseline capture, not a request to change the goal or suppress failures. T003 precedes T004 if the browser helper reuses its fixtures.
- US1: T005 and T006 may be written in parallel after T003; T007 follows the tests, T008 follows T007, and T009 verifies both.
- US2: T010-T013 may be written in parallel after T004; T014 -> T015 -> T016 -> T017 touch the same view and run sequentially; T018 verifies the completed story.
- T019 follows both story checkpoints. T020 and T021 both write the validation record, so execute them sequentially or merge separately prepared notes; T022 follows any command changes.

### Parallel Opportunities

- **US1**: T005 and T006 author separate test files concurrently once T003 is complete.
- **US2**: T010, T011, T012, and T013 author separate browser test files concurrently once T004 is complete.
- **Across stories**: T007-T008 and T014-T017 touch separate game and view modules and can proceed in parallel after foundational work, provided shared tests and files are coordinated.

## Implementation Strategy

1. Establish the baseline and fixtures without modifying existing user changes.
2. Deliver US1 as the smallest independent MVP: a refill-only sampler with deterministic tests and unchanged starting distribution.
3. Deliver US2 as a separate increment: reversible preview and single commit with mouse, touch, cancellation, reset, and edge tests.
4. Run integrated checks and record physical-device and participant limitations without claiming unavailable tests passed.