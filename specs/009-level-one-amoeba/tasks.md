---

description: "Implementation tasks for level-one amoeba animation"
---

# Tasks: Level 1 Amoeba Animation

**Input**: Design documents from `specs/009-level-one-amoeba/`

**Prerequisites**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [board contract](contracts/animation-and-board.md), [quickstart.md](quickstart.md).

**Tests**: The specification explicitly requires automated visual, interaction, lifecycle, accessibility, gameplay-parity, and dense-board performance verification. Write focused tests before corresponding implementation tasks and confirm they detect missing behavior.

**Organization**: Tasks are grouped by user story. Every task includes a repository path; user-story tasks use `[US1]`, `[US2]`, or `[US3]`.

## Phase 1: Setup and Renderer Decision

**Purpose**: Establish a reproducible baseline and resolve the high-risk Canvas contour-rendering choice before broad integration.

- [X] T001 Verify Node/dependency versions and run baseline typecheck, unit tests, focused browser tests, and build from `package.json`; record environment and existing failures in `specs/009-level-one-amoeba/research.md`.
- [X] T002 Add a controlled 64-creature Canvas comparison for Phaser `Graphics` point paths, per-creature offscreen texture refresh, and shared contour frames in `tests/e2e/amoeba-renderer-spike.spec.ts`; capture unfiltered 30-second frame intervals and input responsiveness.
- [X] T003 Record the renderer experiments and select the measured dirty-cell board composite in `specs/009-level-one-amoeba/research.md`; retain physical-device measurements as outstanding.

## Phase 2: Foundational Shared Artwork

**Purpose**: Produce validated, reusable, offline-loaded art layers required by the user stories.

- [X] T004 Add asset contract coverage for source/master alignment, layer dimensions, transparent padding, inverse-alpha parity, manifest hashes, and complete layer inventory in `tests/e2e/amoeba-assets.spec.ts`.
- [X] T005 Implement a deterministic offline exporter from `docs/art/amoeba-concept.svg` in `scripts/generate-amoeba-assets.mjs`; emit shared body/detail frames, precomposed face poses, eyelid states, and normal/inverse flash variants.
- [X] T006 Generate and retain bundled normal/inverse assets and a source-hashed manifest under `src/assets/amoeba/`; verify reproducibility and that ordinary builds do not run the exporter.
- [X] T007 Implement atomic loading, decoding, registration, and ready/unavailable status for the complete amoeba layer set in `src/view/amoeba-assets.ts`; failure must retain the numbered `1` fallback.

**Checkpoint**: Renderer choice and validated shared art inputs are available; no gameplay rules or game-domain entities have changed.

## Phase 3: User Story 1 - See Living Level-1 Amoebae (Priority: P1)

**Goal**: Replace level-1 number labels with the approved amoeba and independently animated resting presentation while preserving all other levels and cell colors.

**Independent Test**: Display a controlled mixed-level board on desktop and mobile; verify the approved amoeba at level 1, paramecium at level 0, numbered levels 2-4, retained tile colors, and observable body/lobe/face/interior motion.

### Tests for User Story 1

- [X] T008 [P] [US1] Add deterministic motion tests for body/lobe wave bounds and periods, blink, eight-way gaze, counter-tilting brow, reduced-motion pause/resume, and collision-free interior drift in `tests/unit/amoeba-motion.test.ts`.
- [X] T009 [P] [US1] Add desktop/mobile resting-render tests for mixed levels, approved geometry, cell colors, independent specimen timing, and fixed cell bounds in `tests/e2e/amoeba-resting.spec.ts`.

### Implementation for User Story 1

- [X] T010 [US1] Implement pure `AmoebaMotionState` creation/update with deterministic per-creature visual randomness and bounded motion in `src/view/amoeba-motion.ts`.
- [X] T011 [US1] Implement the dirty-cell Phaser Canvas board composite from shared body/detail frames, face poses, eyelid states, and selected borders in `src/view/amoeba-view.ts`.
- [X] T012 [US1] Integrate level-1 artwork into the existing colored outer cell while preserving levels 0 and 2-4, fixed selection/input targets, and mixed-level accessible labeling in `src/view/board-view.ts`.
- [X] T013 [US1] Run motion and resting-render tests on desktop and mobile; record geometry, readability, and failures in `specs/009-level-one-amoeba/quickstart.md`.

**Checkpoint**: A mixed board can independently show and animate the level-1 amoeba without changing gameplay or the other creature levels.

## Phase 4: User Story 2 - Play Without Gameplay Changes (Priority: P1)

**Goal**: Preserve creature identity, effects, interaction, gameplay randomness, move rollback, and reset behavior while amoebae are animated.

**Independent Test**: On controlled boards, select, drag, cancel, swap, hint, react, refill, and reset; verify fixed cell targets, identity-associated visual state, correct flash scope, and unchanged gameplay outcomes/random draws.

### Tests for User Story 2

- [X] T014 [P] [US2] Add identity-registry tests for redraw, movement, spawn/removal, move commit/rollback, reset success/failure, reused IDs, stale generations, and shutdown in `tests/unit/amoeba-lifecycle.test.ts`.
- [X] T015 [P] [US2] Add gameplay-randomness and controlled-outcome parity tests proving amoeba visual state never calls global/gameplay randomness in `tests/unit/amoeba-gameplay-rng.test.ts`.
- [X] T016 [P] [US2] Add desktop/mobile tests for hint/reaction inversion, alpha preservation, unaffected cells, fixed mouse/touch targets, drag/cancel, refill, and reset during effects in `tests/e2e/amoeba-effects.spec.ts`.

### Implementation for User Story 2

- [X] T017 [US2] Implement a view-owned `AmoebaStateRegistry` keyed by generation and creature ID with move and reset checkpoints in `src/view/amoeba-state.ts`.
- [X] T018 [US2] Bind amoeba artwork to stable creature identity across `BoardView` redraw, flash, reaction, refill, commit, rollback, reset, and teardown paths in `src/view/board-view.ts`.
- [X] T019 [US2] Preserve existing cell inversion timing while compositing alpha-matched inverse shared body/face/lid frames and tile fills in `src/view/amoeba-view.ts` and `src/view/board-view.ts`.
- [X] T020 [US2] Run lifecycle, RNG parity, effects, and interaction tests on desktop and mobile; record outcomes in `specs/009-level-one-amoeba/quickstart.md`.

**Checkpoint**: Amoeba presentation follows surviving creature identity and all tested gameplay/effect outcomes remain unchanged.

## Phase 5: User Story 3 - Keep the Board Readable and Responsive (Priority: P2)

**Goal**: Preserve legibility, interaction, reduced-motion behavior, and acceptable rendering performance with up to 64 level-1 creatures.

**Independent Test**: Observe and interact with a 64-amoeba board for at least 30 foreground seconds on representative desktop and mobile configurations; repeat reduced-motion and unavailable-art scenarios and report physical-device coverage separately.

### Tests for User Story 3

- [X] T021 [P] [US3] Add startup/live reduced-motion, complete asset-failure fallback, mixed-level accessibility label, and playable-fallback tests in `tests/e2e/amoeba-accessibility.spec.ts`.
- [X] T022 [P] [US3] Add a real-time test-only 64-amoeba foreground frame and input-responsiveness harness in `tests/e2e/amoeba-performance.spec.ts`; retain all frame stalls and report samples, budget fraction, p95/p99, and longest intervals.

### Implementation and Validation for User Story 3

- [X] T023 [US3] Integrate live reduced-motion handling, complete-set fallback, listener cleanup, and mixed-level accessible description in `src/view/board-view.ts` and `src/view/amoeba-assets.ts`.
- [X] T024 [US3] Tune dirty-cell repainting, frame cadence, and lazy asset loading against the renderer spike without changing approved motion behavior in `src/view/amoeba-view.ts` and `src/view/board-view.ts`; document measured choices in `specs/009-level-one-amoeba/research.md`.
- [X] T025 [US3] Run the 30-second performance harness on desktop and mobile emulation, compare each result with the 95%-within-33.4-ms target, and record full conditions/results in `specs/009-level-one-amoeba/research.md` and `specs/009-level-one-amoeba/quickstart.md`.
- [ ] T026 [US3] Measure the finalized dense-board scenario on representative physical desktop/mobile devices when available; no physical device was available in this environment, as recorded in `specs/009-level-one-amoeba/research.md`.

**Checkpoint**: Dense-board results are measured, reduced motion and fallback remain usable, and emulation is not represented as physical-device evidence.

## Phase 6: Polish and Cross-Cutting Validation

**Purpose**: Complete regression checks and reconcile runnable validation instructions with actual results.

- [ ] T027 Run `npm run typecheck`, `npm run test:unit`, `npm run test:e2e -- --workers=2`, and `npm run build`; resolve and record the full E2E failures in `specs/009-level-one-amoeba/quickstart.md` (the earlier run completed with 117 passed, 50 failed, 5 skipped; it is not a clean regression pass).
- [ ] T028 Compare final desktop/mobile board renders with `docs/art/amoeba-concept.svg` and `docs/art/amoeba-resting-preview.html`, including dense-board legibility, edge cells, flash behavior, and fixed targets; record review results in `specs/009-level-one-amoeba/quickstart.md`.
- [X] T029 Reconcile asset generation, test commands, renderer decision, performance results, and remaining physical-device limitations in `specs/009-level-one-amoeba/quickstart.md` and `specs/009-level-one-amoeba/research.md`.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 baseline precedes the renderer spike T002; T003 records its decision. This phase blocks broad art/runtime integration.
- **Foundational (Phase 2)**: T004 asset validation precedes T005 exporter; T006 produces the validated bundle; T007 enables runtime loading. This phase blocks User Story 1.
- **User Story 1 (Phase 3)**: T008 and T009 can be authored in parallel after the foundation. T010 precedes T011; T010 and T011 precede BoardView integration T012; T013 validates the complete story.
- **User Story 2 (Phase 4)**: T014-T016 can be authored in parallel. T017 precedes T018; T018 and the shared assets precede T019; T020 validates lifecycle/effects/gameplay compatibility.
- **User Story 3 (Phase 5)**: T021 and T022 can be authored in parallel after integration. T023 precedes final accessibility checks; T024 follows renderer measurements; T025 follows T022-T024; T026 uses the same finalized workload where physical devices are available.
- **Polish (Phase 6)**: T027-T029 follow the desired user stories and performance measurement. Do not claim physical-device acceptance without evidence.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after the renderer decision and foundational assets; independently demonstrates the level-1 resting character.
- **User Story 2 (P1)**: Builds on the visible level-1 view and verifies it through existing game lifecycle/effects; does not change game rules.
- **User Story 3 (P2)**: Requires the integrated renderer and lifecycle/effects so its dense-board and input measurements represent the real feature.

### Parallel Opportunities

- T008 and T009 are separate motion and browser-test files and can be authored in parallel.
- T014, T015, and T016 cover lifecycle, RNG parity, and browser effects in separate files and can be authored in parallel.
- T021 and T022 are separate accessibility and performance harnesses and can be authored in parallel.
- Serialize changes to `src/view/board-view.ts` across User Story 1, 2, and 3 tasks; they share integration ownership.

## Parallel Examples

```text
User Story 1: T008 tests/unit/amoeba-motion.test.ts || T009 tests/e2e/amoeba-resting.spec.ts
User Story 2: T014 tests/unit/amoeba-lifecycle.test.ts || T015 tests/unit/amoeba-gameplay-rng.test.ts || T016 tests/e2e/amoeba-effects.spec.ts
User Story 3: T021 tests/e2e/amoeba-accessibility.spec.ts || T022 tests/e2e/amoeba-performance.spec.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete setup and renderer decision, then foundational asset validation/loading.
2. Implement and verify User Story 1 on a mixed-level board at desktop and mobile sizes.
3. Stop for an independent visual/motion review before adding the broader lifecycle/effects work.

### Incremental Delivery

1. Setup plus shared assets and renderer choice establish the implementation foundation.
2. User Story 1 delivers the animated amoeba as a level-1 replacement.
3. User Story 2 validates identity, interactions, effects, and gameplay parity.
4. User Story 3 validates accessibility, fallback, dense-board responsiveness, and physical-device evidence.
5. Run cross-cutting typecheck, unit, browser, build, and visual review; report any unmet performance/device targets honestly.
