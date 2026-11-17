# Tasks: Creature Sizing by Food-Chain Rank

**Input**: Design documents from `specs/010-creature-sizing/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/board-sizing.md`, and `quickstart.md`.

**Tests**: The specification requires independent measurable verification and the constitution requires automated reproducible coverage. Write focused tests before their implementations and confirm they fail for the intended missing behavior.

**Organization**: Tasks are grouped by user story and ordered by priority. `[P]` indicates distinct files and no dependency on another incomplete task in the same parallel group; it does not override the dependencies below.

## Phase 1: Setup

**Purpose**: Establish a comparable baseline without changing gameplay or unrelated work.

- [X] T001 Record Node/browser versions and results of `npm run typecheck`, `npm run test:unit`, `npm run build`, and the focused desktop/mobile baseline commands in `specs/010-creature-sizing/quickstart.md`; identify failures without assuming they are unrelated.
- [X] T002 Run the existing 30-second amoeba and paramecium dense-board tests individually for desktop and mobile as listed in `specs/010-creature-sizing/quickstart.md`; record unfiltered timing, input, and environment as a baseline in `specs/010-creature-sizing/quickstart.md`.

## Phase 2: Foundational

**Purpose**: Supply shared deterministic rank and transform logic for every story.

- [X] T003 [P] Add unit tests for the current 0-4 rank mapping, absent board occupants, invalid chain/rank values, and unchanged randomness in `tests/unit/creature-sizing-rank.test.ts`.
- [X] T004 [P] Add unit tests for padding-free asymmetric bounds, uniform scale, centering, invalid dimensions, and the 1-percentage-point measurement convention in `tests/unit/creature-sizing-geometry.test.ts`.
- [X] T005 Implement a pure five-rank mapping and authored-box-to-cell transform with explicit input validation in `src/view/creature-sizing.ts`; retain the current chain starting at 0 and do not modify game-domain levels.

**Checkpoint**: T003-T005 pass, and the mapping does not depend on occupied cells or gameplay randomness.

## Phase 3: User Story 1 - Read the Hierarchy on the Board (Priority: P1)

**Goal**: Render the existing five levels at 75%, 80%, 85%, 90%, and 95% of the cell using tight design-authored neutral bounds or actual glyph ink.

**Independent Test**: Display a mixed 0-4 board on desktop and mobile, independently measure neutral visible bounds and center within one cell percentage point of each target, and confirm the hierarchy key and stable sizes on sparse boards.

### Tests for User Story 1

- [X] T006 [P] [US1] Add authored-box, source/preview consistency, neutral composite tightness, runtime downsample, and normal/inverse alpha parity tests for paramecium in `tests/e2e/paramecium-assets.spec.ts`.
- [X] T007 [P] [US1] Add authored-box, source coordinate, neutral composite tightness, runtime downsample, and normal/inverse alpha parity tests for amoeba in `tests/e2e/amoeba-assets.spec.ts`.
- [X] T008 [P] [US1] Add independent desktop/mobile neutral-pixel tests for all five sizes, centering, aspect ratio, repeated levels, sparse/empty boards, artwork loading/failure, preferred/fallback fonts, and unchanged hierarchy key in `tests/e2e/creature-sizing.spec.ts`.

### Implementation for User Story 1

- [X] T009 [P] [US1] Author a named non-rendering, padding-free neutral rectangle including visible strokes and cilia, and document its pose and coordinates in `docs/art/paramecium-concept.svg` and `docs/art/paramecium-resting-preview.html`; reconcile the master and the preview used for export without altering approved artwork.
- [X] T010 [P] [US1] Author a named non-rendering, padding-free neutral rectangle including visible strokes and details, and document its pose and coordinates in `docs/art/amoeba-concept.svg`.
- [X] T011 [P] [US1] Update `scripts/generate-paramecium-assets.mjs` to validate and export the authored master box, source/preview relationship, pose, hashes and coordinate transform while preserving aligned internal animation canvases and inverse alpha.
- [X] T012 [P] [US1] Update `scripts/generate-amoeba-assets.mjs` to validate and export the authored design box, pose, source hash and coordinate transform while preserving aligned internal animation canvases and inverse alpha.
- [X] T013 [US1] Verify isolated regenerated outputs against `src/assets/paramecium/` and `src/assets/amoeba/`; PNGs were byte-identical, so preserve existing artwork and update only manifests.
- [X] T014 [P] [US1] Load and validate the exported paramecium design box and coordinate metadata in `src/view/paramecium-assets.ts` while preserving complete-set fallback behavior.
- [X] T015 [P] [US1] Load and validate the exported amoeba design box and coordinate metadata in `src/view/amoeba-assets.ts` while preserving lazy complete-set fallback behavior.
- [X] T016 [P] [US1] Implement cached visible glyph-ink measurement and font-resolution invalidation for numbered placeholders and fallbacks in `src/view/creature-label.ts`; use the actual selected font and never add bounding-box padding.
- [X] T017 [P] [US1] Apply the shared authored-box transform to nested paramecium artwork while preserving layer registration and eye counter-rotation in `src/view/paramecium-view.ts`.
- [X] T018 [P] [US1] Apply the shared authored-box transform only to amoeba art layers in the existing dirty-cell board composite, leaving tile, selection and refresh geometry unchanged in `src/view/amoeba-view.ts`.
- [X] T019 [US1] Wire current-chain rank selection, scaled glyphs, late artwork attachment and existing fallback paths through `src/view/board-view.ts` without scaling cell containers or changing pointer coordinates.
- [X] T020 [US1] Run T006-T008 and relevant rank/geometry tests on desktop and mobile; document exact visual measurement and any failures in `specs/010-creature-sizing/quickstart.md`.

**Checkpoint**: The current mixed board shows all rank sizes correctly while its key and cell layout remain intact.

## Phase 4: User Story 3 - Play Normally with Resized Creatures (Priority: P1)

**Goal**: Preserve full-cell interaction, existing gameplay, movement, effects, accessibility and reduced-motion behavior at the new sizes.

**Independent Test**: Exercise cell-edge mouse/touch selection, drag/cancel, reactions, refill and reset on a deterministic mixed board; compare committed outcomes, counters and visual behavior with the baseline.

### Tests for User Story 3

- [X] T021 [P] [US3] Add desktop/mobile full-cell edge input, drag/cancel, seeded committed-board and counter parity tests in `tests/e2e/creature-sizing-input.spec.ts`.
- [X] T022 [P] [US3] Add tests for rank sizes and identity through selection, inverse hints/reactions, convergence, refill, reset and rollback in `tests/e2e/creature-sizing-effects.spec.ts`.
- [X] T023 [P] [US3] Add tests for startup/live reduced-motion freeze/resume, both art-failure fallbacks, font resolution, and playable cells in `tests/e2e/creature-sizing-accessibility.spec.ts`.
- [X] T024 [P] [US3] Add oversized-transparent-surface envelope tests for all amoeba frames and paramecium cilia/rotation/gaze/blink/detail extrema, normal/inverse variants and edge cells in `tests/e2e/creature-sizing-amoeba-containment.spec.ts`, `tests/e2e/creature-sizing-paramecium-containment.spec.ts`, and `tests/e2e/creature-sizing-edge-animation.spec.ts`; use a conservative bound or documented sampling error for continuous motion.

### Implementation and Validation for User Story 3

- [X] T025 [US3] Repair any sizing-related selection, input, redraw, async loading, font invalidation, reset or rollback issues exposed by T021-T023 in `src/view/board-view.ts`, preserving full-cell geometry and game state.
- [X] T026 [US3] Preserve moving/overlapping amoeba dirty-cell redraws and effect placement exposed by T022 and T024 in `src/view/amoeba-view.ts` without changing the existing board-wide composite strategy.
- [X] T027 [US3] Preserve paramecium motion, inverse layers and eye counter-rotation exposed by T022-T024 in `src/view/paramecium-view.ts` without altering its approved motion.
- [X] T028 [US3] Run T021-T024 on desktop and mobile and record outcomes in `specs/010-creature-sizing/quickstart.md`; if neutral target and full stationary motion containment conflict, stop and request a product decision instead of clipping, shrinking or changing approved motion.

**Checkpoint**: All required effects and input work with unchanged gameplay; containment is proven without clipping or is explicitly blocked.

## Phase 5: User Story 2 - Keep the Clue When the Food Chain Shifts (Priority: P2)

**Goal**: Reuse the five rank sizes for future consecutive chains without implementing progression.

**Independent Test**: Evaluate 1-5 and another nonnegative five-level chain using the pure rank function and verify the mappings and invalid-input handling.

### Tests for User Story 2

- [X] T029 [P] [US2] Add tests for a 1-5 chain, another shifted chain, retained levels changing rank, sparse inputs and invalid chain boundaries in `tests/unit/creature-sizing-shift.test.ts`.

### Implementation for User Story 2

- [X] T030 [US2] Generalize or confirm the pure lowest-level parameter in `src/view/creature-sizing.ts` so shifted chains produce the specified sizes without extending `src/game/creature.ts` or introducing stage progression.
- [X] T031 [US2] Run the shifted-chain and foundational unit tests and record exact results in `specs/010-creature-sizing/quickstart.md`.

**Checkpoint**: Future chain mapping is verified independently; the playable prototype remains levels 0-4.

## Phase 6: Polish and Cross-Cutting Concerns

- [ ] T032 Run `npm run typecheck`, `npm run test:unit`, `npm run build`, and `npm run test:e2e -- --workers=2`; investigate feature-related regressions and record exact results and unresolved failures in `specs/010-creature-sizing/quickstart.md`.
- [X] T033 Repeat the isolated 30-second desktop/mobile amoeba and paramecium benchmarks and add a representative mixed-board timing run using `tests/e2e/amoeba-performance.spec.ts`, `tests/e2e/paramecium-performance.spec.ts`, and `tests/e2e/creature-sizing-mixed-performance.spec.ts`; compare all intervals and input responsiveness against T002 in `specs/010-creature-sizing/quickstart.md` (paramecium thresholds failed).
- [X] T034 Perform desktop/mobile visual and physical-device input review, or explicitly record unavailable hardware and unverified outcomes, in `specs/010-creature-sizing/quickstart.md`.
- [X] T035 Conduct the five-person hierarchy/key usability check for SC-005, or explicitly record the missing participants and unverified result, in `specs/010-creature-sizing/quickstart.md`.
- [X] T036 Reconcile exporter commands, authored-box guidance, validation results, containment decisions and remaining risks in `specs/010-creature-sizing/quickstart.md` and `specs/010-creature-sizing/research.md`.

## Dependencies and Execution Order

- Phase 1 precedes Phase 2. T003 and T004 may run in parallel; T005 follows both.
- Phase 3 follows T005. T006-T008 are independent test files; T009 and T010 touch different designs. T011 follows T009; T012 follows T010. T013 follows T011-T012. T014 and T015 follow T013; T016 can run independently. T017 requires T005 and T014; T018 requires T005 and T015; T019 integrates T014-T018 and precedes T020.
- Phase 4 follows the Phase 3 integration. T021-T024 are independent test files. T025-T027 touch different implementation files but must follow the test results and coordinate shared behavior; T028 follows all three. A containment conflict is a blocking decision, not a passed task.
- Phase 5's pure tests can be prepared after T005, but final validation follows the P1 stories; T030 follows T029 and T031 follows T030. It does not depend on implementing a new playable stage.
- Phase 6 follows the completed stories. T032-T036 all update the same validation guide and must be serialized. Performance runs must not run concurrently with other benchmarks or heavy tests.

## Parallel Examples

- **US1**: T006, T007 and T008 can be written concurrently; T009 and T010 can author separate designs; T014, T015 and T016 can proceed on separate files once their prerequisites are satisfied.
- **US3**: T021, T022, T023 and T024 can be written concurrently; T025, T026 and T027 can proceed on different implementation files after the tests expose their requirements.
- **US2**: T029 can be prepared alongside Phase 3 test work after T005; T030 must follow T029 and cannot run in parallel with another task editing `src/view/creature-sizing.ts`.

## Implementation Strategy

1. Complete baseline and shared pure logic, then deliver US1 as the visual MVP with authored design bounds and independently verified 0-4 rendering.
2. Complete US3 before calling the visual MVP playable: verify fixed input areas, gameplay parity, lifecycle, effects and stationary animation containment.
3. Validate US2's shifted-chain mapping without expanding current gameplay, then run cross-cutting regressions, performance, physical-device and participant checks. Record unavailable checks as unverified.