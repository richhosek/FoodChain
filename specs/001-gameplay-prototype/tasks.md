# Tasks: Single-Level Gameplay Prototype

**Input**: Design documents from `specs/001-gameplay-prototype/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui-and-rules.md`, and `quickstart.md`

**Tests**: Automated gameplay tests are mandatory under constitution v2.0.0. Write each story's tests before its implementation and confirm relevant tests fail for the intended missing behavior.

**Organization**: Tasks are grouped by user story. `[P]` marks work that can run concurrently with other marked tasks in the same explicitly stated dependency group; it does not override phase or task dependencies.

## Phase 1: Setup

**Purpose**: Establish the TypeScript browser project and repeatable commands.

- [X] T001 Create `package.json` and `package-lock.json` with Phaser 4.1.0, compatible pinned TypeScript, Vite, `@types/node`, Playwright, and `dev`, `typecheck`, `build`, `test:unit`, and `test:e2e` scripts from `specs/001-gameplay-prototype/quickstart.md`.
- [X] T002 [P] Create `tsconfig.json` for strict application and test type-checking with ES modules, bundler resolution, `isolatedModules`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, and `noEmit`.
- [X] T003 [P] Create `index.html` with the Food Chain title, accessible game mount, target/progress and status regions, and a placeholder for scoreboard controls.
- [X] T004 [P] Create `playwright.config.ts` with a managed Vite server and desktop and touch-enabled mobile viewport projects; keep test fixtures inaccessible in production builds.

## Phase 2: Foundational

**Purpose**: Supply shared typed entities, deterministic randomness, and fixtures before story work.

- [X] T005 [P] Define creature identity, levels 0-4, cell coordinates, board and reaction/effect types in `src/game/creature.ts` without importing Phaser.
- [X] T006 [P] Implement injectable seeded/scriptable random sampling and provisional 40:27:17:10:6 level weights in `src/game/random.ts`.
- [X] T007 Create reusable deterministic 8-by-8 boards, scripted random sequences, and test-only session setup in `tests/fixtures/boards.ts`, with no production board-mutating interface.

**Checkpoint**: Setup and foundational contracts are available; no gameplay story is complete yet.

## Phase 3: User Story 1 - Play the Food Chain (Priority: P1)

**Goal**: Play the single level using mouse or touch, with correct food-chain rules, cascades, and win state.

**Independent Test**: From a fresh valid 8-by-8 board, perform a known reacting swap using mouse and touch; verify identical board and goal outcomes, multi-wave resolution, and a win after the chain settles.

### Tests for User Story 1

- [X] T008 [P] [US1] Write board-generation tests in `tests/unit/domain.test.ts` for seeded reproducibility, all five levels, at least one reacting swap on fresh/reset boards, accepted-board rarity ordering, and independent weighted refill.
- [X] T009 [P] [US1] Write movement and neighbor tests in `tests/unit/domain.test.ts` for orthogonal swaps, diagonal predator counting, edges, invalid actions, and stationary-creature exclusion.
- [X] T010 [P] [US1] Write reaction tests in `tests/unit/domain.test.ts` for 2-8 predators, evolution levels, blast footprints, apex precedence, overlapping predator sets, protected creations, and deduplicated level-0 removals.
- [X] T011 [P] [US1] Write cascade tests in `tests/unit/domain.test.ts` for simultaneous landed and spawned prey, multi-wave snapshots, refill order, scoring across waves, and win only after the final wave.
- [X] T012 [P] [US1] Write level-state tests in `tests/unit/domain.test.ts` for turn counts, non-reacting free moves, rejected moves at zero free moves, and goal-over-loss precedence.
- [X] T013 [P] [US1] Write deterministic browser interaction tests in `tests/e2e/gameplay.spec.ts` and `tests/e2e/terminal-flows.spec.ts` for equivalent mouse and touch swaps, 64 numbered cells, and the win state.

### Implementation for User Story 1

- [X] T014 [US1] Implement 8-by-8 board access, in-bounds eight-neighbor lookup, orthogonal swap validation, column gravity, and fall/spawn positions in `src/game/board.ts`.
- [X] T015 [US1] Implement pure reacting-swap detection and valid starting/reset generation in `src/game/board.ts`: condition weighted samples on all five levels and at least one reacting swap, yield/cancel during retries, and never consume randomness during move checks.
- [X] T016 [US1] Implement snapshot-based predator counting and simultaneous reaction results in `src/game/mechanics.ts`, including 3-8 predator outcomes, protected creations, unioned removals, and apex precedence.
- [X] T017 [US1] Implement incremental refill and cascade waves in `src/game/level.ts`, evaluating all landed or spawned candidates against each settled snapshot and yielding without an invented wave limit.
- [X] T018 [US1] Implement `src/game/level.ts` session state, distinct level-0 removal counting across waves, turn/free-move accounting, no-move loss, and win only after settling.
- [X] T019 [US1] Implement the responsive page shell and square board sizing in `src/styles.css`, preserving legible colored numbers and controls at desktop and mobile sizes.
- [X] T020 [US1] Implement a Phaser board in `src/view/board-view.ts` with colored numbered creatures, fixed cell geometry, selection, orthogonal click/tap swaps, and equivalent pointer dragging.
- [X] T021 [US1] Connect the rules, board view, goal progress, and win/loss status in `src/main.ts`; use test-only seeded inputs in `tests/e2e/terminal-flows.spec.ts` without a production board-mutating interface.
- [X] T022 [US1] Run the US1 unit and browser tests through `package.json` scripts; fix failures and confirm a nonzero unit-test count and equivalent outcomes before proceeding.

**Checkpoint**: US1 is playable and independently testable; immediate state updates may stand in for the dedicated explosion and falling animations until US2.

## Phase 4: User Story 2 - Understand Explosions and Refill (Priority: P2)

**Goal**: Show the affected cells flashing before clearance and animate column falling and refill.

**Independent Test**: Use a deterministic explosion fixture and verify two 250 ms inversion cycles occur before removal, unaffected cells remain intact, and survivors visibly fall in order with top-entry refill.

### Tests for User Story 2

- [X] T023 [P] [US2] Write controlled-clock animation tests in `tests/unit/effects.test.ts` for four 125 ms phases and cancellation; verify gravity and wave ordering in `tests/e2e/game.spec.ts`.
- [X] T024 [P] [US2] Write browser explosion tests in `tests/e2e/explosions.spec.ts` for radius-1/radius-2 and board-wide effects, two inversion cycles, protected centers, and unaffected cells.
- [X] T025 [P] [US2] Extend `tests/e2e/game.spec.ts` to cover a landing-triggered subsequent wave alongside the existing survivor order, visible falling, and top-entry spawn checks.

### Implementation for User Story 2

- [X] T026 [US2] Implement wave-aware inversion, clearance, and falling/refill animations in `src/view/board-view.ts`, with two 250 ms inverted-to-normal cycles before removal and no geometry shifts.
- [X] T027 [US2] Implement epoch-aware effect sequencing and acknowledgment between `src/main.ts` and `src/view/board-view.ts`, advancing the next wave only after the previous wave's animations finish.
- [X] T028 [US2] Run timeline, explosion, gravity, and US1 regression tests via `package.json` scripts; verify effect ordering and timing.

**Checkpoint**: Explosion and refill behavior can be exercised with known fixtures independently of scoreboard refinements.

## Phase 5: User Story 3 - Track and Restart the Level (Priority: P2)

**Goal**: Display target, removed count, turns and free moves, and allow reset during play, effects, and terminal states.

**Independent Test**: Perform a reacting and non-reacting move, inspect each scoreboard value, then reset during an effect and from win/loss; verify a fresh playable board and initial counters.

### Tests for User Story 3

- [X] T029 [P] [US3] Write reset and session tests in `tests/unit/domain.test.ts` for fresh board guarantees, reset from ready/resolving/won/lost, stale-epoch rejection, and reset during a long scripted cascade or generation retries.
- [X] T030 [P] [US3] Write scoreboard tests in `tests/e2e/scoreboard.spec.ts`, `tests/e2e/game.spec.ts`, and `tests/e2e/terminal-flows.spec.ts` for initial values, turns, free moves, collateral/apex scoring, and win/loss messaging.
- [X] T031 [P] [US3] Write browser reset tests in `tests/e2e/game.spec.ts` and `tests/e2e/terminal-flows.spec.ts` for reset during flash and falling, subsequent stale callbacks, and restart from win/loss on desktop and mobile viewports.

### Implementation for User Story 3

- [X] T032 [US3] Implement accessible target, removed progress, turn/free-move values, terminal messages, and Reset binding in `src/main.ts` and `index.html`.
- [X] T033 [US3] Implement session-epoch invalidation, timer/tween cancellation, cancellable board generation, and fresh state construction in `src/game/level.ts` and `src/view/board-view.ts`.
- [X] T034 [US3] Wire scoreboard updates and reset across generation, active reactions, win and loss in `src/main.ts`; ensure old waves cannot alter the new session.
- [X] T035 [US3] Run reset, scoreboard, and prior-story regression tests via `package.json` scripts; confirm valid starting boards and counters after repeated resets.

**Checkpoint**: All three stories are functionally integrated and independently verifiable with their fixtures.

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T036 Run `npm run typecheck`, `npm run test:unit`, `npm run test:e2e`, and `npm run build` using `package.json`; resolve feature-related failures and report skipped or unavailable checks in `specs/001-gameplay-prototype/validation.md`.
- [X] T037 Verify responsive layouts, real mouse input, and touch tap/drag on available iOS and Android browsers using `specs/001-gameplay-prototype/quickstart.md`; record device results or unavailability in `specs/001-gameplay-prototype/validation.md`.
- [X] T038 Conduct the five-participant scoreboard/reset check in `specs/001-gameplay-prototype/quickstart.md`; record the result or mark SC-004 unverified in `specs/001-gameplay-prototype/validation.md`.
- [X] T039 Verify Phaser/TypeScript declaration compatibility, accepted-board rarity ordering, long-run cancellation, and dependency notices; record evidence and any unresolved generation/termination risks in `specs/001-gameplay-prototype/validation.md`.
- [X] T040 Update `specs/001-gameplay-prototype/quickstart.md` only where actual implementation commands or verification steps differ from the plan.

## Dependencies & Execution Order

### Phase Dependencies

- Setup -> Foundational -> US1 -> US2 and US3 integration -> Polish. US1 supplies rules and a working board used by the later stories; US2 and US3 tests can be prepared after their contracts are stable, but their shared-file implementation and integration must be coordinated.
- T001 precedes running scripts and installing browser dependencies. T005 and T006 may proceed independently after setup; T007 follows their shared data contracts.
- Within US1, T008-T013 are independent test files after T007. T014 precedes T015-T017; T016 precedes T017-T018; T019 and T020 may be developed after the relevant contracts are stable; T021 integrates them; T022 is the checkpoint.
- Within US2, T023-T025 are independent test files after US1 contracts exist; T026 precedes T027 and T028.
- Within US3, T029-T031 are independent test files after US1 contracts exist; T032 and T033 touch different areas but `index.html` and `src/view/game-scene.ts` are shared integration surfaces, so coordinate with US2; T034 follows both and T035 verifies the result.
- Polish follows all story checkpoints. T036-T039 all write `specs/001-gameplay-prototype/validation.md`, so execute them sequentially or merge separately prepared results.

### Parallel Opportunities

- After T001, T002-T004 can be completed in parallel because they touch different files.
- After Phase 1, T005 and T006 can run in parallel; T007 follows their agreed interfaces.
- US1: T008-T013 can be authored concurrently; the board view and styling in T019-T020 can proceed on separate files once interfaces are stable.
- US2: T023-T025 can be authored concurrently; implement effects only after the US1 wave-result contract is stable.
- US3: T029-T031 can be authored concurrently; scoreboard work in T032 and reset design in T033 can be prepared separately, with shared file edits serialized against US2.

## Implementation Strategy

1. Complete setup and foundational work, then implement US1 and validate its deterministic rules and basic mouse/touch interaction as the MVP.
2. Add US2 animations without changing rule outcomes; verify ordering and timing against known fixtures.
3. Add US3 scoreboard and reset handling; rerun all regressions, especially cancellation and stale session callbacks.
4. Perform build, type-check, browser, physical-device, usability, and rarity checks. Do not mark unavailable device or participant checks as passed.