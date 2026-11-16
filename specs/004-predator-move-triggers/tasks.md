# Tasks: Predator Moves Trigger Eating Reactions

**Input**: Design documents from `specs/004-predator-move-triggers/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/move-reaction-discovery.md`, and `quickstart.md`

**Tests**: Focused automated tests are required by the project constitution. Add regression tests before implementation and verify the new assertions fail for the intended missing behavior.

**Organization**: Tasks are grouped by the single independently testable user story.

## Phase 1: Setup

**Purpose**: Verify the current development environment and capture a baseline without changing existing game settings.

- [X] T001 Verify Node 24.16.x, installed dependencies, scripts, and pinned versions in `package.json` and `package-lock.json`; do not add dependencies or change the goal.
- [X] T002 Run `npm run typecheck`, `npm run test:unit`, `npm run test:e2e`, and `npm run build`; record exact current results and existing target-100 versus legacy target-10 failures in `specs/004-predator-move-triggers/validation.md`, referencing `specs/003-predator-evolution/validation.md` where applicable.

## Phase 2: Foundational

**Purpose**: Ensure controlled move fixtures can express a prey and its surrounding predators without exposing new production hooks.

- [X] T003 Verify the existing `tests/fixtures/boards.ts` helpers already build deterministic prey/predator layouts with controlled positions and levels; make no duplicate fixture API changes.

**Checkpoint**: Baseline is recorded and controlled boards are available for move-trigger tests.

## Phase 3: User Story 1 - Trigger Reactions When Predators Move Into Position (Priority: P1) 🎯 MVP

**Goal**: Trigger reactions for stationary prey when a moved predator becomes part of its qualifying group, while preserving moved-prey behavior and avoiding unrelated board scans.

**Independent Test**: On a controlled board, move a third eligible predator next to stationary prey and verify the reaction resolves once; compare with moving the prey into a qualifying predator group and verify nonqualifying or unrelated situations do not react.

### Tests for User Story 1

- [X] T004 [P] [US1] Add `tests/unit/move-reaction-candidates.test.ts` cases for a moved third predator, moved prey, multiple affected prey, duplicate candidate suppression, nonqualifying predator levels/counts, unrelated stationary groups, rejected swaps, and unchanged refill candidates; verify new assertions fail before implementation.
- [X] T005 [P] [US1] Add a deterministic browser regression in `tests/e2e/gameplay.spec.ts` using `tests/e2e/helpers.ts` to move a predator into a stationary prey group and verify reaction/score/board outcome without production test hooks; verify it fails before implementation.

### Implementation for User Story 1

- [X] T006 [US1] Extend the initial candidate discovery in `src/game/level.ts` after a successful `swapBoard` result: retain both moved positions, inspect each moved creature's post-swap neighbors, and add prey positions where that moved creature is exactly one level higher; pass the combined candidates to `resolveWave` without changing refill-wave candidates or reaction outcomes.
- [ ] T007 [US1] Run `node --test tests/unit/move-reaction-candidates.test.ts tests/unit/domain.test.ts`; verify moved-prey, moved-predator, multi-prey, unrelated-group, duplicate, rejected-move, and cascade behavior, comparing unrelated failures with `specs/004-predator-move-triggers/validation.md`.
- [X] T008 [US1] Run the focused browser regression from `tests/e2e/gameplay.spec.ts` in desktop and mobile Playwright projects; verify predator-triggered and existing prey-triggered swaps resolve as specified.

**Checkpoint**: A moved predator can trigger all qualifying prey it joins, each prey resolves once, and unrelated stationary groups remain untouched.

## Phase 4: Polish & Cross-Cutting Validation

**Purpose**: Validate compatibility with existing move, cascade, and platform behavior.

- [ ] T009 Run `npm run typecheck` and `npm run build`; record results and any existing build warnings in `specs/004-predator-move-triggers/validation.md`.
- [ ] T010 Run `npm run test:unit` and `npm run test:e2e`; compare exact pass/fail/skip totals and test names against the baseline in `specs/004-predator-move-triggers/validation.md` without changing unrelated target-100 behavior.
- [ ] T011 Verify move-trigger behavior and board presentation in desktop and mobile Playwright projects; perform physical iOS/Android checks if devices are available, or record their unavailability in `specs/004-predator-move-triggers/validation.md`.
- [ ] T012 Follow `specs/004-predator-move-triggers/quickstart.md` after implementation and update it only if actual validation steps or expected outcomes differ.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; verify environment and capture baseline.
- **Foundational (Phase 2)**: Depends on Setup; provides deterministic fixtures.
- **User Story 1 (Phase 3)**: Depends on the foundational fixture. It is the only user story and has no cross-story dependencies.
- **Polish (Phase 4)**: Depends on the story implementation and its focused tests.

### User Story Dependencies

- **US1 (P1)**: Starts after T003. Unit and browser test authoring can proceed concurrently; implementation follows both test tasks.

### Within the User Story

- Write and run the focused unit and browser regressions before changing production code.
- Implement candidate expansion only for the first post-swap wave in `src/game/level.ts`.
- Preserve the existing `resolveWave` snapshot/deduplication behavior and leave refill cascade candidate discovery unchanged.
- Run focused unit and browser checks before full validation.

### Parallel Opportunities

- T004 and T005 can run in parallel after T003 because they modify separate test files.
- T009's typecheck/build validation may run in parallel with T010's unit/browser suite after T008.

## Implementation Strategy

### MVP First

1. Complete setup and controlled fixture verification (T001-T003).
2. Add and fail the unit and browser regressions (T004-T005).
3. Implement candidate expansion and pass the focused validations (T006-T008).
4. Stop at the story checkpoint if the predator-triggered reaction, moved-prey behavior, and unrelated-group exclusion are all verified.

### Incremental Delivery

1. Deliver the single P1 story as a bounded move-time reaction-discovery change.
2. Run focused unit and browser validation.
3. Run full unit/browser suites, typecheck, build, and document baseline comparisons and unavailable device checks.

## Notes

- Every task uses an unchecked checkbox, sequential ID, optional parallel marker, required user-story label, and repository-relative file path.
- Test tasks are included because the feature spec and project constitution require automated gameplay coverage.
- No package, dependency, UI, or production fixture-hook changes are expected.
