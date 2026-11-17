# Tasks: Side-by-Side Animation Spike

**Input**: `specs/011-animation-spike/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/spike-harness.md`, `quickstart.md`, and `.specify/memory/constitution.md` v3.1.0.

**Scope**: An isolated comparison, not a production migration. Keep production rules, art masters and existing test assets unchanged. No tool installation, purchase, license acceptance, dependency upgrade or artwork upload is authorized by this task list without separate owner approval.

**Performance gate**: Before any timed baseline or other performance test, successfully verify all applicable game mechanics and UI actions for the change, including the available candidates, supported input modes, workloads and target configurations. Record the evidence and any incomplete or failed prerequisite; leave performance testing pending until the prerequisites are complete. Run performance tests separately from all other tests and from one another. When a later conditional candidate is added, verify its applicable mechanics and UI actions before measuring it. Plan and quickstart sequencing that suggests otherwise must be reconciled in T002.

**Format**: `[P]` marks tasks that can proceed in parallel after their prerequisites, without shared-file edits or overlapping performance runs. Story labels refer to the specification's user stories. A blocked task is not complete unless it explicitly calls for recording a blocked outcome.

## Phase 1: Setup

**Purpose**: Establish a reproducible and isolated experiment without changing production behavior.

- [X] T001 Create the isolated experiment entry page and directory layout in `experiments/animation-spike/index.html` and `experiments/animation-spike/src/`, `experiments/animation-spike/assets/`, and `experiments/animation-spike/results/`; ensure the page starts no production scene automatically.
- [X] T002 Reconcile `specs/011-animation-spike/plan.md` and `specs/011-animation-spike/quickstart.md` with constitution v3.1.0: all applicable mechanics and UI actions must pass before any performance test, and timed tests must run in isolation; retain existing experiment scope and blocked-result rules.
- [X] T003 Record the current revision, existing dependency versions, available desktop/iPhone/Android environments, and any authoring-tool approval or access constraints in `experiments/animation-spike/results/environment.md` without installing or acquiring anything.

## Phase 2: Foundational Prerequisites

**Purpose**: Define shared fixtures, adapter contracts and reproducible evidence before story-specific comparisons.

- [X] T004 [P] Add deterministic workload tests in `tests/unit/animation-spike-fixtures.test.ts` for 64 paramecia, 64 amoebae, mixed 16/16/11/11/10, stable row-major IDs/positions, seeds and checksums.
- [X] T005 [P] Add trial metric and validity tests in `tests/unit/animation-spike-metrics.test.ts` for unfiltered intervals, documented percentile calculation, empty/short/hidden/context-lost trials and the 95% at 33.4 ms threshold.
- [X] T006 [P] Add decision-state tests in `tests/unit/animation-spike-decision.test.ts` covering verified WebGL failure, explicit complexity rejection, complete pass, missing evidence and conditional Godot completion.
- [X] T007 Define reproducible board fixtures, visual seeds, design bounds and common scripted action timelines in `experiments/animation-spike/src/fixtures.ts`; include full ordered cells and a stable checksum.
- [X] T008 Define candidate lifecycle and evidence types in `experiments/animation-spike/src/contracts.ts`: identity, actual renderer, capabilities, readiness, input acknowledgments, outcomes, errors, cleanup and trial statuses.
- [X] T009 Implement raw interval aggregation, percentile method, foreground/context validity and resource availability reporting in `experiments/animation-spike/src/metrics.ts` without dropping stalls or inventing unavailable metrics.
- [X] T010 Implement the decision rules in `experiments/animation-spike/src/decision.ts`, distinguishing verified failure and owner rejection from missing evidence and requiring completed Godot evidence when triggered.
- [X] T011 Implement a fresh-page, single-active-candidate lifecycle with readiness, warm-up, explicit teardown and error reporting in `experiments/animation-spike/src/harness.ts` and wire it to `experiments/animation-spike/index.html`.
- [X] T012 Run `tests/unit/animation-spike-fixtures.test.ts`, `tests/unit/animation-spike-metrics.test.ts` and `tests/unit/animation-spike-decision.test.ts`; record results and unresolved failures in `experiments/animation-spike/results/verification.md` before proceeding.

## Phase 3: User Story 1 - Compare Equivalent Animation Workloads (P1)

**Goal**: Compare the actual Canvas baseline, shared-frame Canvas and forced WebGL with equivalent boards and behaviors.

**Independent test**: For each available candidate and all three deterministic fixtures, verify the same visuals, effects, mouse/touch actions and outcomes. Once the global performance gate is satisfied, compare serial valid foreground trials with the same setup and raw measurements; report failures and unavailable configurations explicitly.

- [X] T013 [P] [US1] Add harness lifecycle tests in `tests/e2e/animation-spike-harness.spec.ts` for one active board, ready/teardown, renderer identity, fresh pages and initialization/context-loss errors.
- [X] T014 [P] [US1] Add deterministic candidate parity tests in `tests/e2e/animation-spike-parity.spec.ts` for all three fixtures, sizing, independent blink/gaze/body motion, selection, effects, drag/cancel, refill, reset, reduced motion and screenshot visual comparison using mouse and emulated touch.
- [X] T015 [P] [US1] Add measurement contract tests in `tests/unit/animation-spike-trials.test.ts` for recorded setup, readiness, cache policy, raw samples, action acknowledgment latency and explicit unsupported-resource reasons; do not run timed performance trials.
- [X] T016 [US1] Implement the unchanged production `BoardView` Canvas baseline adapter on a blank same-origin page in `experiments/animation-spike/src/candidates/current-canvas.ts`, proving it uses the real production view and only one scene.
- [X] T017 [US1] Correct the shared-frame paramecium Canvas adapter in `experiments/animation-spike/src/candidates/current-canvas.ts` and `experiments/animation-spike/src/shared-frame-renderer.ts` until it passes the reduced-motion screenshot parity check while preserving independent motion and approved bounds; do not weaken the visual threshold or modify production assets.
- [X] T018 [US1] Implement the forced `Phaser.WEBGL` adapter in `experiments/animation-spike/src/candidates/webgl.ts`, verify the actual renderer, and surface initialization failure or context loss without Canvas fallback.
- [X] T019 [US1] Connect the adapters to deterministic rules, fixture actions and gameplay-effect timelines in `experiments/animation-spike/src/candidate-actions.ts`, comparing actual serialized outcomes with the baseline.
- [X] T020 [US1] Implement guarded trial capture in `experiments/animation-spike/src/trial.ts`: require recorded functional verification, verify renderer identity, capture raw foreground intervals and input acknowledgments, validate/cache metrics and reject invalid trials. No timed capture was run because the gate is pending.
- [X] T021 [US1] Implement evidence export in `experiments/animation-spike/src/report.ts` for candidate versions, asset hashes, device/browser/GPU/viewport/DPR, frame samples, input outcomes, transferred and decoded bytes, load time and comparable peak memory or reasons unavailable.
- [X] T022 [US1] Run the functional tests in `tests/e2e/animation-spike-harness.spec.ts`, `tests/e2e/animation-spike-parity.spec.ts` and `tests/unit/animation-spike-trials.test.ts`; record each candidate/workload/input result and any failures in `experiments/animation-spike/results/verification.md` without running performance tests.
- [X] T023 [US1] Record evaluator visual checks against approved art for silhouette, sizing, independent animation, selection, movement and effects in `experiments/animation-spike/results/visual-review.md`, including failed, unsupported and pending cases.

## Phase 4: User Story 2 - Evaluate the Character Creation Workflow (P1)

**Goal**: Evaluate one representative authored rigged or deforming character, or document why it is blocked.

**Independent test**: With owner approval and tool access, display the character at board size with independent eyes, body motion, effect and interaction, then record visual review and creation/revision workflow; otherwise record the blocker without claiming success. Performance comparisons remain behind the global gate.

- [X] T024 [P] [US2] Add authored-study contract tests in `tests/e2e/animation-spike-authored.spec.ts` for explicit blocked status and no renderer initialization while approval, tool and license prerequisites are missing.
- [X] T025 [US2] Record the proposed tool, owner/artist approval, availability, versions, license, privacy/upload and export requirements in `experiments/animation-spike/results/character-study.md`; mark blocked with acquisition requirements when approval or access is unavailable.
- [X] T026 [US2] If approved and available, create one rigged/deforming study from a copy of an approved master under `experiments/animation-spike/assets/authored/`; if not approved or unavailable, document the blocker and keep artwork creation pending in `experiments/animation-spike/results/character-study.md`.
- [X] T027 [US2] If the study is available, integrate its reproducible export as a declared candidate or renderer combination in `experiments/animation-spike/src/candidates/authored.ts`, recording exactly which creature it replaces and incomplete workloads; otherwise expose an explicit blocked status.
- [X] T028 [US2] Run the applicable functional tests in `tests/e2e/animation-spike-authored.spec.ts` and the common parity tests in `tests/e2e/animation-spike-parity.spec.ts`; record visual, interaction and outcome evidence or the blocker in `experiments/animation-spike/results/verification.md`.
- [X] T029 [US2] Record owner/evaluator visual review, export/runtime versions, asset and workflow limitations, license conditions and revision evidence in `experiments/animation-spike/results/character-study.md`; leave unreviewed claims pending.

## Phase 5: User Story 3 - Make an Evidence-Based Platform Decision (P1)

**Goal**: Collect comparable device evidence and apply the documented decision rule without confusing missing evidence with success or failure.

**Independent test**: Inspect the physical iPhone, physical Android and desktop matrix, raw evidence and owner rubric; verify each result is a valid pass, verified failure or named pending/blocker and that the conditional Godot rule is correctly applied.

- [X] T030 [P] [US3] Add platform and gate tests in `tests/e2e/animation-spike-platform.spec.ts` and `tests/unit/animation-spike-trials.test.ts` to distinguish physical devices from emulation and prevent timing when mechanics/UI verification is incomplete or failed.
- [X] T031 [P] [US3] Create the pre-results owner/evaluator rubric in `experiments/animation-spike/results/review-rubric.md` covering approved visual and behavioral parity, 95% frame threshold, correct input outcomes and explicit complexity judgment with written reasons.
- [ ] T032 [US3] Complete applicable mechanics and UI verification for every available candidate/workload on desktop and mobile layouts with mouse and touch, rerun the selected full regressions after the idle-hint test-clock correction, and verify on required physical devices; record passing evidence, failures and unavailable prerequisites in `experiments/animation-spike/results/verification.md`.
- [X] T033 [US3] Run available project mechanics/UI regression checks plus typecheck, unit tests and build, excluding performance tests; record results and known failures in `experiments/animation-spike/results/verification.md`.
- [X] T034 [US3] Review `experiments/animation-spike/results/verification.md` and record performance-gate status per target configuration: desktop mechanics/UI verification passes for current Canvas, shared-frame and WebGL across all workloads; authorize only isolated desktop timing and keep mobile physical timing pending.
- [X] T035 [US3] After the desktop functional gate passed, run current Canvas, shared-frame Canvas and WebGL desktop trials serially for all three workloads; retain >=30 seconds of unfiltered foreground intervals, input outcomes and resource evidence in unique JSON files under `experiments/animation-spike/results/trials/`. Mobile physical trials remain pending.
- [X] T036 [US3] Once T034 passes and the authored candidate is available, run its same-workload trials serially under `experiments/animation-spike/results/trials/`; the candidate is blocked, and the reason is recorded in `experiments/animation-spike/results/character-study.md`.
- [X] T037 [US3] Classify every candidate/workload/device result or explicitly pending trial in `experiments/animation-spike/results/matrix.md` by physical desktop, physical iPhone, physical Android or emulation; include conditions, available input evidence and explicit invalid, failed, blocked or missing evidence.
- [ ] T038 [US3] Obtain the owner's written visual and complexity judgments against the rubric in `experiments/animation-spike/results/decision.md`; record the interim Canvas recommendation and incorporate the triggered Godot comparison before any production migration decision.
- [X] T039 [US3] Record the triggered Godot comparison, missing `godot`/`godot4` executable, unattempted installation, and toolchain authorization blocker in `experiments/animation-spike/godot/README.md`.
- [ ] T040 [US3] Once the Godot toolchain is authorized and available, implement the equivalent isolated three-workload scene and deterministic input/effects in `experiments/animation-spike/godot/project.godot` and `experiments/animation-spike/godot/scenes/benchmark.tscn`.
- [ ] T041 [US3] After implementing the Godot comparison, add and run equivalent-state, input, random-sequence and outcome checks in `experiments/animation-spike/godot/tests/parity.gd`, plus applicable mouse/touch, visual and UI verification; record evidence in `experiments/animation-spike/results/verification.md` before Godot timing.
- [ ] T042 [US3] Only after T041 and all other applicable mechanics/UI prerequisites pass, run Godot workload trials separately and serially using the same definitions; save raw evidence under `experiments/animation-spike/results/trials/` and add it to `experiments/animation-spike/results/matrix.md`.
- [X] T043 [US3] Complete `experiments/animation-spike/results/decision.md` with evidence links, verified failures, missing devices/tools, known regressions, platform and maintenance costs, and the supported direction or explicitly pending decision; do not implement a migration.

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T044 Update `specs/011-animation-spike/quickstart.md` with actual experiment commands, functional gates, serial trial procedures, device setup and safe output paths, including explicit blocked and unavailable cases.
- [X] T045 Verify `experiments/animation-spike/results/` contains reproducible fixture identifiers, available evidence and pending reasons, metric definitions and an explicit lack of owner review without claiming emulation as physical-device evidence.
- [X] T046 Review `experiments/animation-spike/` and `specs/011-animation-spike/quickstart.md` for production isolation, unchanged design masters, dependency/license/privacy constraints and documented remaining regressions; record the pending status in `experiments/animation-spike/results/decision.md`.

## Dependencies & Execution Order

- Setup T001-T003 precedes foundational work. T002 resolves the plan's prior timing sequence before execution.
- Foundation T004-T012 precedes all story phases. Tests T004-T006 may be authored independently; T007-T011 implement their contracts; T012 validates them.
- US1 implements the common baseline and comparison infrastructure. US2 can prepare tests and tool review independently after the foundation, but integration and common parity verification require the US1 harness/adapters. US3's rubric and gate tests can be prepared independently after the foundation; its full functional gate depends on all applicable US1 and US2 verification.
- T034 gates T035 and T036. No timed trial may run alongside any other test or performance trial. Missing or failed applicable verification means pending, not a waiver.
- T038 can evaluate verified behavioral failures or complexity rejection as soon as available, even when T034 blocks T035-T037; otherwise it follows available trial evidence. If Godot is triggered, T039-T042 are required before a migration decision; if not triggered or requested they are not applicable. T041 is a separate functional gate before T042. Missing WebGL evidence alone neither triggers nor waives Godot.
- T043-T046 close the evidence and documentation after applicable branches complete or their blockers are recorded; a pending decision is not a pass.

## Parallel Opportunities

- Foundation: T004, T005 and T006 touch separate unit-test files.
- US1: T013, T014 and T015 create separate test files before their corresponding implementation.
- US2: T024 can run alongside US1 test authoring; T025 follows independently, while integration waits for the harness.
- US3: T030 and T031 can be prepared in parallel after the foundation; actual device actions and all timing must respect their prerequisites and isolation.

## Implementation Strategy

1. MVP: Complete the foundation and US1 functional comparison for the actual Canvas, shared-frame and WebGL candidates, with reproducible fixtures and explicit failure reporting. Its timed comparison remains pending until the global mechanics/UI gate is satisfied.
2. Add the independently reviewed authored study or record its blocker, then finish applicable desktop/mobile and mouse/touch verification across the change.
3. Only after the gate passes, collect serial comparable performance evidence and evaluate the owner rubric; execute the conditional Godot branch if triggered or requested.
4. Publish the evidence and decision or precise pending status, preserving the production game and requiring separate approval for any migration.