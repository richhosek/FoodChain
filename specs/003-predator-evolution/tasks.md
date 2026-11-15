# Tasks: Predator Evolution and Apex Formation

**Input**: Design documents from `specs/003-predator-evolution/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/reaction-and-animation.md`, and `quickstart.md`

**Tests**: Focused automated tests are required by the project constitution. Add regression tests before the corresponding implementation and verify the assertions fail for the intended missing behavior.

**Organization**: Tasks are grouped by user story so rule outcomes and reaction presentation can be validated independently.

## Phase 1: Setup

**Purpose**: Verify the current development environment and record an honest baseline without changing existing game settings.

- [X] T001 Verify Node 24.16.x, installed dependencies, and the existing scripts and pinned versions in `package.json` and `package-lock.json`; do not add dependencies or change the target.
- [X] T002 Run `npm run typecheck`, `npm run test:unit`, `npm run test:e2e`, and `npm run build`; record exact pre-existing failures, including goal-100 versus legacy goal-10 assertions, in `specs/003-predator-evolution/validation.md`.

## Phase 2: Foundational

**Purpose**: Provide deterministic fixtures shared by the independent reaction-rule tests.

- [X] T003 Add or extend a test-only helper in `tests/fixtures/boards.ts` to create a board with a selected prey position and explicit predator positions/levels for cardinal, diagonal, and noncanonical layouts; preserve existing fixture behavior.

**Checkpoint**: Baseline is recorded and deterministic reaction layouts can be built without production-only hooks.

## Phase 3: User Story 1 - Evolve Consumed Creatures (Priority: P1)

**Goal**: Replace prey at predator level for exactly three predators, and one level above predator level for four or more non-apex predators, capped at level 4.

**Independent Test**: Resolve controlled non-apex boards with three predators, four predators, and maximum-level predators; assert the replacement level and unchanged surrounding board rules.

### Tests for User Story 1

- [X] T004 [P] [US1] Add `tests/unit/predator-evolution.test.ts` cases proving three predators yield predator-level replacement and four or more yield predator-level-plus-one replacement; verify the assertions fail before implementation.
- [X] T005 [P] [US1] Update the three-predator replacement expectations in `tests/unit/domain.test.ts` to the approved predator-level rule while retaining existing explosion, removal, and simultaneous-wave assertions.

### Implementation for User Story 1

- [X] T006 [US1] Update replacement-level calculation in `src/game/mechanics.ts` to use predator count and the fixed level-4 cap for non-apex reactions, preserving the existing snapshot, removal, and blast behavior.
- [X] T007 [US1] Run `node --test tests/unit/predator-evolution.test.ts tests/unit/domain.test.ts`; confirm the new replacement cases pass and compare remaining legacy failures with `specs/003-predator-evolution/validation.md`.

**Checkpoint**: Replacement levels are independently verified and do not exceed level 4.

## Phase 4: User Story 2 - Require a Formation for an Apex Reaction (Priority: P1)

**Goal**: Trigger the existing no-replacement full-board apex clear only for at least four level-4 predators with a complete four-cardinal or four-diagonal formation.

**Independent Test**: Evaluate centered controlled boards for qualifying cardinal and diagonal formations, near-miss layouts, and non-maximum-level predators; verify apex flag, board clear, and replacement outcome.

### Tests for User Story 2

- [X] T008 [P] [US2] Add `tests/unit/apex-formation.test.ts` cases for full cardinal and diagonal formations, incomplete near misses, fewer than four predators, non-maximum predator levels, capped level-4 replacement for a non-apex level-3 prey, both formations at once, and the no-replacement full-board apex outcome; verify assertions fail before implementation.
- [X] T009 [P] [US2] Update the apex fixture and assertions in `tests/unit/domain.test.ts` to use at least four level-4 predators in a complete cardinal or diagonal formation.

### Implementation for User Story 2

- [X] T010 [US2] Update apex detection in `src/game/mechanics.ts` to evaluate each reaction from the pre-wave snapshot and require four or more level-4 predators plus a complete cardinal or diagonal formation; preserve wave-level apex precedence and ordinary blast behavior.
- [X] T011 [US2] Run `node --test tests/unit/apex-formation.test.ts tests/unit/predator-evolution.test.ts tests/unit/domain.test.ts`; verify both user stories and compare any remaining baseline-only goal failures with `specs/003-predator-evolution/validation.md`.

**Checkpoint**: Apex formation rules and the unchanged apex outcome are independently verified.

## Phase 5: User Story 3 - See Predators Converge Before a Reaction (Priority: P1)

**Goal**: Show all reaction predators converging on their prey for 1000 milliseconds before the existing blast and board update, with cancellation-safe visual-only handling for shared predators.

**Independent Test**: Start a deterministic reaction effect, verify predator movement at an intermediate time and completion at 1000 milliseconds, verify the board outcome remains unapplied until the cue finishes, and verify cancellation/reset prevents stale updates.

### Tests for User Story 3

- [X] T012 [P] [US3] Add `tests/e2e/reaction-convergence.spec.ts` cases that capture the board before, during, and after the 1000 ms cue, assert the reaction outcome follows the cue, cover simultaneous reactions/shared predators and cancellation cleanup, and add a non-reacting-effect assertion in `tests/unit/domain.test.ts`; use existing browser fixture techniques without adding production mutation hooks.

### Implementation for User Story 3

- [X] T013 [US3] Implement the 1000 ms predator-convergence tween in `src/view/board-view.ts` before the existing flash and after-board render; await completion, stop on the event abort signal, clean temporary visual copies, and keep copies out of authoritative game state.
- [X] T014 [US3] Update `tests/e2e/explosions.spec.ts` and the existing flash-abort scenario in `tests/e2e/game.spec.ts` to distinguish the convergence interval from the existing flash phases and preserve blast-footprint and cancellation coverage.
- [X] T015 [US3] Run `npm run test:e2e -- tests/e2e/reaction-convergence.spec.ts tests/e2e/explosions.spec.ts` on desktop and mobile projects; verify visible intermediate movement, event ordering, and cancellation behavior.

**Checkpoint**: Each reaction has a visible 1000 ms cue before its existing outcome, and canceled effects do not leak into later boards.

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Verify integration, responsive presentation, and documented outcomes.

- [X] T016 Run `npm run typecheck` and `npm run build`; record results and any build warnings in `specs/003-predator-evolution/validation.md`.
- [X] T017 Run `npm run test:unit` and `npm run test:e2e`; record exact totals and compare all failures with the baseline in `specs/003-predator-evolution/validation.md` without changing unrelated goal-100 behavior.
- [X] T018 Verify the 1000 ms reaction cue and board layout in desktop and mobile browser projects; perform physical iOS/Android checks when devices are available, or record their unavailability in `specs/003-predator-evolution/validation.md`.
- [X] T019 Follow `specs/003-predator-evolution/quickstart.md` after implementation and update that file only if actual validation commands or user-visible steps differ.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; captures environment and baseline.
- **Foundational (Phase 2)**: Depends on Setup; provides controlled reaction fixtures for the story tests.
- **User stories (Phases 3-5)**: Depend on the foundation. US1 and US2 modify the same resolver and should be implemented sequentially. US3 touches the view layer and can proceed in parallel with either rules story after T003.
- **Polish (Phase 6)**: Depends on all three user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after T003; no dependency on another story.
- **US2 (P1)**: Its tests can start after T003, but its resolver implementation follows US1 because both change `src/game/mechanics.ts`.
- **US3 (P1)**: Starts after T003; uses the existing reaction/effect contract and can be developed independently of the mechanics edits.

### Within Each User Story

- Write and run the new focused tests before implementation.
- Keep US1 and US2 resolver edits sequential to avoid concurrent changes to `src/game/mechanics.ts`.
- Keep the 1000 ms tween in the view layer and preserve `GameLevel.move` as the owner of authoritative state and cancellation.
- Run each story's focused tests before moving to the next sequential implementation task.

### Parallel Opportunities

- T004 and T005 may be authored concurrently because they change separate unit-test files.
- T008 and T009 may be authored concurrently because they change separate unit-test files.
- US3 T012-T014 may proceed independently of resolver work after T003, while respecting the test-before-implementation order within US3.
- T016's typecheck/build run is independent from T017's test run after all story work is complete.

## Implementation Strategy

### MVP First

1. Complete setup and deterministic fixture work (T001-T003).
2. Complete US1 replacement behavior and focused validation (T004-T007).
3. Stop and validate the replacement-level MVP before adding apex and animation changes.

### Incremental Delivery

1. Deliver US1: replacement formulas and level cap.
2. Deliver US2: apex formation eligibility without changing its established outcome.
3. Deliver US3: 1000 ms convergence cue, shared-reaction visuals, and cancellation.
4. Run integrated checks and record baseline comparisons and unavailable device checks.

## Notes

- All tasks use the required unchecked checkbox, sequential ID, optional parallel marker, required user-story label, and repository-relative file path.
- Test tasks are included because the approved spec and project constitution require automated coverage for gameplay changes.
- No dependency or package-script changes are expected.
