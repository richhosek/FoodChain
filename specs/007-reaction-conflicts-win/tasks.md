---
description: "Implementation tasks for reaction conflicts and the win dialog"
---

# Tasks: Reaction Conflicts and Win Dialog

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contract](contracts/reaction-and-win.md), and [quickstart.md](quickstart.md).

**Tests**: The specification requires verifiable behavior and the constitution requires automated rule and desktop/mobile interaction coverage. Write story tests before implementation and verify they expose the missing behavior.

**Format**: `[P]` indicates work in separate files with no dependencies on unfinished parallel tasks; `[US1]` and `[US2]` identify the user story.

## Phase 1: Setup

**Purpose**: Establish the existing project and test baseline without changing gameplay.

- [X] T001 Verify Node 24.16.x and the existing dependencies and scripts in `package.json`; install locked dependencies only if needed.
- [X] T002 Run a bounded baseline of typecheck, unit, and desktop/mobile browser tests from `specs/007-reaction-conflicts-win/quickstart.md`; record commands, failures and timeouts in `specs/007-reaction-conflicts-win/validation.md` without masking existing failures.

## Phase 2: Foundational

**Purpose**: Provide deterministic fixtures usable by either story without changing production rules.

- [X] T003 Add reusable non-meld board fixtures in `tests/fixtures/boards.ts` and use existing seeded or scripted refill helpers in `src/game/random.ts`, preserving existing fixture behavior and avoiding constant-value infinite cascades.
- [X] T004 Use bounded Playwright `expect.poll` waits and deterministic board/refill fixtures from `tests/e2e/helpers.ts` for effect and terminal-state assertions on desktop and mobile.

**Checkpoint**: Baseline recorded and fixture helpers ready; either story may be implemented independently.

## Phase 3: User Story 1 - Resolve Competing Reactions (P1)

**Goal**: Select non-sharing reactions by highest currently available predator count, with deterministic ties, reassessment, and specified meld/Apex precedence.

**Independent Test**: On controlled boards, compare five-versus-four and five-versus-three shared-predator groups; verify reassessment, disjoint reactions, cross-role conflicts, tie ordering and later cascades without relying on the win dialog.

### Tests for User Story 1

- [X] T005 [US1] Add pure-selection regression cases in `tests/unit/reaction-conflicts.test.ts` and `tests/unit/activation-selection.test.ts` for shared conflicts, reassessment, cross-role sharing, disjoint groups, deterministic ties, snapshot immutability and identity uniqueness.
- [X] T006 [US1] Add wave-outcome cases in `tests/unit/activation-selection.test.ts` and `tests/unit/nine-creature-meld.test.ts` for reduced predator counts, Apex and meld selection passes, protected creations and provisional selection; document impossible Apex/meld participant overlap in `specs/007-reaction-conflicts-win/validation.md`.
- [X] T007 [US1] Cover move, refill cascade, zero-free-move, loss and hint agreement in `tests/unit/activation-selection.test.ts`, `tests/unit/domain.test.ts`, `tests/unit/move-reaction-candidates.test.ts` and `tests/unit/gameplay-helpers.test.ts`.
- [X] T008 [US1] Replace the shared-predator visual-copy assumption in `tests/e2e/reaction-convergence.spec.ts` with selected-participant convergence and abort-restoration checks while retaining the existing 1000 ms cue coverage.

### Implementation for User Story 1

- [X] T009 [US1] Implement a pure, reusable activation-selection primitive in `src/game/activation-selection.ts` that discovers affected row-major melds and deterministically selects predator groups by current unassigned count and prey row/column; preserve candidate boundaries, use identity reservations, and avoid board mutation, IDs and RNG.
- [X] T010 [US1] Integrate the selector in `src/game/mechanics.ts`: honor top-level meld Apex, provisional predator Apex, discarded provisional selection, reserved-meld final selection and final-pass Apex; apply only selected reactions, actual predator counts, protected creations and deduplicated removals.
- [X] T011 [US1] Align prediction, reacting-move enumeration and hint selection in `src/game/board.ts` with the shared activation selector, preserving meld hints, candidate scope, separate hint RNG and the existing initial-board generation policy without circular imports.
- [X] T012 [US1] Align accepted moves, refill waves and terminal no-move detection in `src/game/level.ts` with the shared selected activations; retain abort/epoch handling, turn/free-move accounting, target 100 and existing refill distribution.
- [X] T013 [US1] Update `src/view/board-view.ts` to animate only predators in resolving reactions, preserve the 1000 ms convergence cue and abort restoration, and avoid visual copies for shared reaction participants.
- [X] T014 [US1] Update existing conflicting shared-predator assertions and affected deterministic fixtures in `tests/unit/domain.test.ts` and `tests/unit/move-reaction-candidates.test.ts` to the new rule without weakening unrelated coverage.
- [X] T015 [US1] Run the focused conflict suites in `tests/unit/activation-selection.test.ts`, `tests/unit/reaction-conflicts.test.ts`, and `tests/unit/nine-creature-meld.test.ts`, plus `tests/e2e/reaction-convergence.spec.ts`; record results and baseline differences in `specs/007-reaction-conflicts-win/validation.md`.

**Checkpoint**: Conflicting reactions, move predictions, hints and convergence follow the new rules independently of the win-dialog feature.

## Phase 4: User Story 2 - Recognize and Dismiss a Win (P1)

**Goal**: Show an accessible, dismissible "You Won" modal once after a winning cascade settles, while retaining the terminal board and reset behavior.

**Independent Test**: Reach the goal of 100, verify the modal appears only after the final refill and cascade, dismiss it with Close and Escape in separate runs, and verify state remains won until reset.

### Tests for User Story 2

- [X] T016 [US2] Cover deterministic level lifecycle cases in `tests/unit/domain.test.ts` for reaching 100, remaining resolving through later waves/refills, win-over-loss precedence, cancellation and reset invalidation without a production cascade cap.
- [X] T017 [US2] Add desktop and mobile browser cases in `tests/e2e/win-dialog.spec.ts` for post-settlement presentation, accessible title/focus, Close and Escape dismissal, unchanged board and counters, no repeat for the same epoch, reset, later win, touch interaction and stale-work cancellation.
- [X] T018 [US2] Update the existing goal and terminal-interaction expectations in `tests/e2e/terminal-flows.spec.ts` for the target of 100 and dismissal before blocked interactions; preserve loss-dialog coverage.

### Implementation for User Story 2

- [X] T019 [US2] Add an accessible "You Won" dialog with a labeled visible close control in `index.html`, following the existing failure-dialog structure.
- [X] T020 [US2] Add responsive desktop/mobile win-dialog styling and focus-visible treatment in `src/styles.css`, preserving the established site identity and avoiding obscured controls.
- [X] T021 [US2] Integrate once-per-epoch win presentation in `src/main.ts` after the final board render; support Close and Escape, preserve terminal state, close on reset, cancel stale effects and hints, and prevent failure-dialog overlap. Depends on T019 and T020.
- [X] T022 [US2] Verify post-cascade won/lost transition and reset safeguards in `src/game/level.ts` using lifecycle tests, retaining target 100.
- [X] T023 [US2] Run `tests/unit/domain.test.ts`, `tests/e2e/win-dialog.spec.ts`, and `tests/e2e/terminal-flows.spec.ts` on applicable desktop/mobile projects; record results in `specs/007-reaction-conflicts-win/validation.md`.

**Checkpoint**: A completed level displays one dismissible win dialog and remains terminal until reset, independently of conflict-selection implementation.

## Phase 5: Polish and Cross-Cutting Validation

- [X] T024 Update remaining affected goal-10, uniform-board or shared-predator expectations in `tests/unit/domain.test.ts`, `tests/unit/gameplay-helpers.test.ts`, and `tests/e2e/gameplay-helpers.spec.ts`, as justified by the baseline; preserve unrelated assertions and use bounded deterministic fixtures.
- [X] T025 Run `npm run typecheck`, `npm run test:unit`, the equivalent Playwright suite with bounded workers and timeout, and `npm run build` using `package.json`; record exact results and distinguish pre-existing or environment failures in `specs/007-reaction-conflicts-win/validation.md`.
- [ ] T026 Perform desktop and mobile manual checks from `specs/007-reaction-conflicts-win/quickstart.md`, including mouse/touch and keyboard dismissal; record actual coverage and any unavailable physical-device checks in `specs/007-reaction-conflicts-win/validation.md`.
- [X] T027 Reconcile final commands, tested scenarios and any remaining limitations in `specs/007-reaction-conflicts-win/quickstart.md` and `specs/007-reaction-conflicts-win/validation.md`.

## Dependencies & Execution Order

- Setup T001-T002 precedes foundational T003-T004. T003 and T004 both follow baseline setup and touch different files; they may be performed in parallel if desired.
- Both P1 stories can start after Phase 2 and are independently deliverable. Within each story, complete and run its test tasks before the associated implementation.
- US1: T005-T008 are test work; T009 precedes T010-T012; T013 follows the resolving reaction contract; T014 follows the behavior change; T015 verifies the complete story.
- US2: T016-T018 are test work; T019 and T020 can run concurrently; T021 depends on both; T022 coordinates `src/game/level.ts` with T012; T023 verifies the complete story.
- Phase 5 follows both selected stories. T024 precedes the full-suite run T025; T026 and T027 follow the relevant implementation and test results. Tasks that append to `validation.md` must be serialized.

## Parallel Examples

- **US1**: Coordinate shared `tests/unit/activation-selection.test.ts` edits; T008 in `tests/e2e/reaction-convergence.spec.ts` can proceed separately.
- **US2**: T017 in `tests/e2e/win-dialog.spec.ts` and T018 in `tests/e2e/terminal-flows.spec.ts` can proceed separately; T019 in `index.html` and T020 in `src/styles.css` touch distinct files.

## Implementation Strategy

1. Complete setup and foundational fixtures, recording the current test baseline.
2. Deliver US1 as the MVP: tests, deterministic selection, Apex/meld interaction, prediction, effects and independent verification.
3. Deliver US2 independently or next: tests, accessible modal, lifecycle integration and independent verification.
4. Reconcile legacy tests and run full automated and desktop/mobile validation. Preserve the target of 100 and do not add a production cascade limit.