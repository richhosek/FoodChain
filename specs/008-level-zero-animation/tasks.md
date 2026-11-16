---
description: "Implementation tasks for level-0 paramecium animation"
---

# Tasks: Level 0 Creature Animation

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [board contract](contracts/animation-and-board.md), and [quickstart.md](quickstart.md).

**Reference**: The approved [resting preview](../../docs/art/paramecium-resting-preview.html) uses **32 cilia**, stems twice the original length, a **30-degree swing**, and an eye scaled 1.5x. Preserve the editable [SVG master](../../docs/art/paramecium-concept.svg).

**Tests**: The feature specification requests controlled gameplay, visual, accessibility and performance verification, and the constitution requires automated coverage. Write focused tests before the corresponding implementation and establish that they detect missing behavior.

**Format**: `[P]` indicates independent tasks touching different files with no dependencies on unfinished parallel tasks. `[US1]`, `[US2]` and `[US3]` identify user stories.

## Phase 1: Setup

**Purpose**: Verify the existing project and establish a reproducible baseline without changing gameplay.

- [X] T001 Verify Node 24.16.x, existing dependency versions and available scripts in `package.json`; install locked dependencies only if needed.
- [X] T002 Run a bounded baseline of typecheck, unit and desktop/mobile browser tests using `package.json`; record exact commands, failures and environment limitations in `specs/008-level-zero-animation/validation.md`.

## Phase 2: Foundational Assets

**Purpose**: Prepare reusable artwork needed for all three stories without modifying game rules.

- [X] T003 Add test-first asset validation in `tests/e2e/paramecium-assets.spec.ts` for source alignment, transparent padding, independently composable features, 30-degree cilia frames, alpha-preserving inverse assets and unchanged SVG master in `docs/art/paramecium-concept.svg`.
- [X] T004 Implement a documented reproducible offline exporter in `scripts/generate-paramecium-assets.mjs` using the existing project tooling and the approved `docs/art/paramecium-resting-preview.html`; produce shared cilia frames and separate transparent body, eye, pupil, eyelid and internal-detail layers without flattening their independent motion.
- [X] T005 Generate and retain bundled normal and inverse artwork under `src/assets/paramecium/`, including a manifest at `src/assets/paramecium/manifest.json`; validate padding at 30-degree cilia swing and 24-degree body rotation, alpha, registration, frame ordering and reproducibility without requiring the exporter in normal builds.
- [X] T006 Implement atomic loading, decoding and registration of shared textures in `src/view/paramecium-assets.ts`; expose ready/unavailable status and a complete-set check so missing or invalid layers produce the existing colored `0` fallback, not partial artwork.

**Checkpoint**: Reusable artwork is available or fails safely; no change to the domain model, gameplay RNG or game rules.

## Phase 3: User Story 1 - See Living Level-0 Creatures (P1)

**Goal**: Replace level-0 labels with independently animated paramecia while preserving colored cells, fixed interaction areas and levels 1-4 placeholders.

**Independent Test**: Display a controlled mixed-level board on desktop and mobile, compare level-0 appearance with `docs/art/paramecium-resting-preview.html`, and verify distinct ripple, rotation, eyelid blinking, eight-direction gaze and internal drift without performing a reaction.

### Tests for User Story 1

- [X] T007 [P] [US1] Add deterministic motion tests in `tests/unit/paramecium-motion.test.ts` for the 30-degree cilia ripple, independent phases/periods, alternating 12-24 degree rotation, top-and-bottom eyelids, eight bounded gaze directions, longer centered pauses, short glances, small internal drift and pause/resume.
- [X] T008 [P] [US1] Add desktop/mobile appearance tests in `tests/e2e/paramecium-resting.spec.ts` for mixed levels, one-eyed artwork, existing tile colors, no `0` label when assets load, independent creature motion, fixed selection/hit areas, rotation-extrema padding, edge cells and comparison with `docs/art/paramecium-resting-preview.html`.

### Implementation for User Story 1

- [X] T009 [US1] Implement pure per-creature animation state and an isolated seeded visual PRNG in `src/view/paramecium-motion.ts`, following the motion ranges in `specs/008-level-zero-animation/data-model.md` and the updated 30-degree cilia reference; never use gameplay RNG or global `Math.random`.
- [X] T010 [US1] Compose shared cilia frames, body, internal shapes, eye, pupil and eyelids into a padded nested artwork container in `src/view/paramecium-view.ts`, updating each creature independently from its motion state while keeping the eye and eyelids upright during body rotation.
- [X] T011 [US1] Integrate the loaded paramecium view for level 0 in `src/view/board-view.ts`, keeping the outer tile and interaction container unrotated, preserving levels 1-4 and colored backgrounds, and updating the board's accessible description.
- [X] T012 [US1] Run `tests/unit/paramecium-motion.test.ts` and `tests/e2e/paramecium-resting.spec.ts` on applicable desktop/mobile projects; record results and visual comparison in `specs/008-level-zero-animation/validation.md`.

**Checkpoint**: Resting level-0 artwork is independently visible and testable on a mixed board; existing game rules remain unchanged.

## Phase 4: User Story 2 - Preserve Play and Effects (P1)

**Goal**: Preserve identity-associated animation through gameplay, effects, move rollback and reset while keeping existing gameplay outcomes and feedback unchanged.

**Independent Test**: With a controlled board containing level-0 creatures, perform drag/cancel, swap, hint, reaction, refill and reset; compare game state and gameplay random draws while tracking visual identities and phases.

### Tests for User Story 2

- [X] T013 [P] [US2] Add identity-state lifecycle tests in `tests/unit/paramecium-lifecycle.test.ts` for redraw, selection, flash, swap, falling, spawn, replacement, commit pruning, failed/cancelled move rollback, successful reset with reused IDs, failed reset with advanced game epoch, stale callbacks and shutdown cleanup.
- [X] T014 [P] [US2] Add Canvas effect tests in `tests/e2e/paramecium-effects.spec.ts` for four 125 ms flash phases, unchanged alpha at transparent edges, unaffected cells, convergence, meld, Apex, removal, refill and reset during an effect.
- [X] T015 [P] [US2] Add mouse/touch interaction tests in `tests/e2e/paramecium-effects.spec.ts` for fixed hit/selection areas through artwork rotation, drag previews, cancelled/rejected moves, falling survivors and no cell-edge overlap.
- [X] T016 [P] [US2] Add gameplay-randomness and outcome parity tests in `tests/unit/paramecium-gameplay-rng.test.ts` comparing the same boards, moves, gameplay draw counts, score, turns, free moves, refill and terminal results with visual animation enabled and disabled.

### Implementation for User Story 2

- [X] T017 [US2] Implement a view-owned generation/creature-ID state registry and explicit provisional move checkpoint, commit, rollback, successful reset and failed reset operations in `src/view/paramecium-state.ts`; retain rollback states until commit and prune removed or uncommitted identities at the correct boundary.
- [X] T018 [US2] Integrate the registry and lifecycle operations into `src/view/board-view.ts` so redraws and flashes reattach the same visual state, new identities receive independent state, and removed or stale views and callbacks are disposed.
- [X] T019 [US2] Wire explicit move success, rejected/cancelled/error rollback, successful reset and failed reset boundaries in `src/main.ts` to the view lifecycle; preserve existing game epoch/abort guards and retain prior visual state on failed reset.
- [X] T020 [US2] Preserve existing movement, hint and reaction effects in `src/view/board-view.ts`, using shared Canvas-compatible inverse artwork during affected flash phases while retaining existing tile inversion, timing, alpha and unaffected-cell behavior.
- [X] T021 [US2] Update affected existing image/color assertions without weakening drag, flash or reaction coverage in `tests/e2e/helpers.ts`, `tests/e2e/gameplay-helpers.spec.ts`, `tests/e2e/gameplay.spec.ts` and `tests/e2e/scoreboard.spec.ts`.
- [X] T022 [US2] Run the focused lifecycle, gameplay RNG, effects and gesture suites in `tests/unit/paramecium-lifecycle.test.ts`, `tests/unit/paramecium-gameplay-rng.test.ts`, `tests/e2e/paramecium-effects.spec.ts` and `tests/e2e/game.spec.ts`; record results in `specs/008-level-zero-animation/validation.md`.

**Checkpoint**: Animated level-0 creatures retain their own state and existing game interactions and effects remain unchanged.

## Phase 5: User Story 3 - Play Responsively With Many Creatures (P2)

**Goal**: Keep dense boards responsive on desktop and mobile and respect reduced-motion preferences.

**Independent Test**: Use a test-only 64-level-0 board, measure at least 30 seconds of foreground frame intervals on representative desktop and mobile configurations, and exercise interaction, reduced motion and artwork failure without changing production board generation.

### Tests for User Story 3

- [X] T023 [P] [US3] Add reduced-motion and artwork failure tests in `tests/e2e/paramecium-accessibility.spec.ts` covering initial and live preference changes, recognizable neutral art, preserved effect feedback, complete-load fallback, mixed-level accessibility and usable input.
- [X] T024 [P] [US3] Add a real-time test-only 64-creature performance and interaction harness in `tests/e2e/paramecium-performance.spec.ts`; capture every foreground frame interval for at least 30 seconds, report sample count, fraction at or below 33.4 ms, p95/p99, longest intervals, browser, viewport, DPR and renderer without fake timers or discarded stalls.

### Implementation for User Story 3

- [X] T025 [US3] Implement initial and live reduced-motion preference handling, a single scene update, listener cleanup and suitable dense-board optimizations in `src/view/board-view.ts` and `src/view/paramecium-view.ts`; preserve existing game-effect feedback and independent per-creature state.
- [X] T026 [US3] Run `tests/e2e/paramecium-accessibility.spec.ts` and `tests/e2e/paramecium-performance.spec.ts` on desktop and mobile emulation; compare against the 95%-within-33.4-ms target and record actual results and configuration in `specs/008-level-zero-animation/validation.md`.
- [ ] T027 [US3] Measure the same 30-second dense-board scenario on representative physical desktop and mobile devices and record device/browser, viewport, DPR, renderer, power conditions, responsiveness and unfiltered results in `specs/008-level-zero-animation/validation.md`; leave this task open and report unavailable hardware if physical devices cannot be accessed.

**Checkpoint**: Dense-board behavior and reduced motion are verified; physical-device performance is reported separately from browser emulation.

## Phase 6: Polish and Cross-Cutting Validation

- [X] T028 Run `npm run typecheck`, `npm run test:unit`, `npm run test:e2e -- --workers=2`, and `npm run build` using `package.json`; record exact outcomes and distinguish pre-existing or environment failures in `specs/008-level-zero-animation/validation.md`.
- [X] T029 Perform desktop and mobile visual review against `docs/art/paramecium-resting-preview.html` using `specs/008-level-zero-animation/quickstart.md`, including small-scale readability, 30-degree cilia visibility, edge clipping, mouse/touch input, flash behavior and reset.
- [X] T030 Reconcile actual asset-generation commands, test commands, performance results and unresolved physical-device limitations in `specs/008-level-zero-animation/quickstart.md` and `specs/008-level-zero-animation/validation.md`.

## Dependencies & Execution Order

- **Setup -> Foundation:** Complete T001-T002 before T003-T006. Asset validation precedes the exporter and generated assets; T006 follows the generated set.
- **US1:** T007-T008 can be written in parallel after the foundation. T009 precedes T010, T010 precedes T011, and T012 verifies the complete resting-visual slice.
- **US2:** T013-T016 may be written in parallel after the foundation. Their full integration requires US1's renderer and motion model; T017 precedes T018-T020, with shared-file edits to `src/view/board-view.ts` serialized. T021 follows the behavioral changes and T022 verifies the story.
- **US3:** T023-T024 can be prepared independently after the foundation. Dense-board measurement and final acceptance require US1 and US2 to be integrated; T025 precedes T026, and T027 requires access to representative physical hardware.
- **Polish:** T028-T030 follow implementation. Serialize edits to `specs/008-level-zero-animation/validation.md`; do not mark physical-device validation complete without actual evidence.

## Parallel Examples

- **US1:** Write T007 in `tests/unit/paramecium-motion.test.ts` and T008 in `tests/e2e/paramecium-resting.spec.ts` concurrently.
- **US2:** Write T013-T016 concurrently in their separate test files; coordinate T018 and T020 because both modify `src/view/board-view.ts`.
- **US3:** Write T023 in `tests/e2e/paramecium-accessibility.spec.ts` and T024 in `tests/e2e/paramecium-performance.spec.ts` concurrently; run physical measurements only where the actual devices are available.

## Implementation Strategy

1. Establish the baseline and prepare reusable, Canvas-compatible artwork from the approved 30-degree preview.
2. Deliver US1 as the MVP and verify the character's appearance and independent resting motion on a mixed board.
3. Complete US2's identity-safe lifecycle and effect compatibility, keeping gameplay and its random source unchanged.
4. Complete US3's reduced-motion, fallback and dense-board checks, then run full regression tests and document real-device evidence and remaining limitations.