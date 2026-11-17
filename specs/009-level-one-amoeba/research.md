# Research: Level 1 Amoeba Animation

## Rendering in the Existing Canvas Board

**Decision**: Retain Phaser 4.1.0 and its Canvas renderer. Render the amoeba art into one transparent board-sized Canvas texture. Use shared, pre-rendered body/detail frames and precomposed face poses; repaint only cells whose frame or piece position changed, then refresh the board texture once. Keep the existing outer per-cell containers as movement and input targets, and draw selected borders in the overlay above the art.

**Rationale**: The renderer experiments showed that per-creature Canvas uploads and multiple Phaser sprites per cell both miss the dense-board target. A board-wide overlay reduces the animated scene to one image object and avoids per-creature uploads. Dirty-cell redraws limit Canvas raster work to cells whose frame or position changed, while shared frame selection preserves the approved contour and independent per-creature timing.

**Renderer experiments**: On Chromium 159, Phaser Canvas, an isolated 64-contour fixture compared dynamic Graphics paths, unique per-creature texture refresh, and shared pre-rendered frame selection. Shared frames were fastest in that isolated fixture (100% within the budget on both tested viewports), but production integration tests later showed that multiple Phaser image objects per cell still missed the target. A one-sprite-per-cell Canvas compositor also fell short. The selected dirty-cell board overlay passed the integrated 64-creature acceptance test in both configurations:

| Integrated dirty-cell board overlay | Desktop (1280x720, DPR 1) | Mobile emulation (980x1669, DPR 3) |
| --- | ---: | ---: |
| Foreground duration | 30.015 s | 30.016 s |
| Samples | 1790 | 1801 |
| Intervals <= 33.4 ms | 99.78% | 100% |
| p95 / p99 | 16.8 / 16.8 ms | 16.7 / 16.8 ms |
| Longest interval | 49.9 ms | 16.8 ms |
| Input | Mouse drag accepted | Touch selection accepted |

All frame intervals, including stalls, were retained. The harness used a blank same-origin page with a single integrated BoardView to avoid measuring the production game scene underneath the fixture. The mobile result is Chromium emulation, not physical-device evidence. No physical desktop or mobile device was available in this environment; record that limitation and do not claim physical-device acceptance.

## Final Integrated Renderer Validation

- Final renderer: one board-sized Canvas texture with dirty-cell redraws for amoeba tile fill, combined body/detail frame, face pose, blink frame, and selected border. Per-cell containers remain drag, selection, movement, and convergence targets; amoeba containers do not allocate unused tile Graphics. Only cells with a new discrete frame, inversion, selection state, or changed piece position are redrawn before one texture refresh. Amoeba assets load lazily only when a board contains level-1 creatures.
- Final isolated desktop Playwright run (`tests/e2e/amoeba-performance.spec.ts --project=desktop --workers=1`): 30.015 seconds, 1,790 samples, **99.78% <= 33.4 ms**, p95/p99 16.8/16.8 ms, longest interval 49.9 ms, accepted mouse drag.
- Final isolated mobile Chromium emulation run (`--project=mobile --workers=1`): 30.016 seconds, 1,801 samples, **100% <= 33.4 ms**, p95/p99 16.7/16.8 ms, longest interval 16.8 ms, accepted touch selection.
- The repository-wide `npm run test:e2e -- --workers=2` exceeded its 10-minute command limit and reported 50 failures, 117 passes, and 5 skips before completion output. Failures included drag timing/preview under worker contention, some legacy level-pixel expectations, the pre-existing paramecium asset-manifest hash mismatch, and the known paramecium performance target. The level-aware gameplay expectation and tile-color sampler were subsequently updated; targeted amoeba desktop/mobile suites and relevant board/accessibility checks passed. The broad run is not a clean regression pass and remains to be rerun.
- Physical-device desktop/mobile measurements were unavailable. Emulator results do not satisfy the physical-device evidence requirement; that work remains outstanding.

**Alternatives considered**: Dynamic per-creature `Graphics` paths and individual sprites were rejected after the integrated dense-board runs missed the target. A full board redraw on every tick also missed the target; dirty-cell redraws passed. Animate SVG in an HTML overlay, rejected because it separates art from the game Canvas, effects, and board layering. Add a skeletal/vector runtime or change renderer, deferred because the dirty-cell Canvas composite met the emulation target without a new runtime dependency.

## Artwork and Asset Delivery

**Decision**: Keep `docs/art/amoeba-concept.svg` as the editable source of truth and `docs/art/amoeba-resting-preview.html` as the approved timing/behavior reference. The reproducible offline exporter emits 32 combined body/highlight/interior frames, 33 face poses with gaze and counter-tilting brow, and 11 eyelid states, each with aligned transparent normal and inverse variants under `src/assets/amoeba/`. Include source hashes and layer dimensions in the manifest; normal builds consume committed assets and do not launch the exporter.

**Rationale**: The project already uses Playwright Chromium to generate committed transparent PNG layers and Canvas-compatible inverse variants for the paramecium. The amoeba master provides the final body, eye, eyebrow, highlight, and interior geometry; the preview provides the motion decisions. Baking body/detail frames and face poses once avoids per-creature vector or Canvas uploads at runtime while preserving the editable master, alignment, alpha, and offline build behavior.

**Alternatives considered**: Use only the HTML study as the asset source, rejected because it duplicates the concept geometry and has already drifted from the final master. Require a local art application or network service at build time, rejected because normal builds need to remain reproducible and offline. Flatten the whole creature into one image, rejected because the eye, lids, brow, drifting details, and body contour need independent motion.

## Per-Creature Motion and Identity

**Decision**: Implement pure amoeba motion state in a dedicated view module with a seeded visual PRNG derived from view generation and creature ID. Store it in an amoeba-specific registry keyed by identity, with move and reset checkpoints matching the proven paramecium lifecycle behavior. Advance visible states from the existing Phaser scene update; never use the game random source or global `Math.random`.

**Rationale**: `BoardView.render()` destroys and recreates piece containers during redraws, hint flashes, and reaction/refill effects. Creature IDs survive movement, while `src/main.ts` exposes explicit move success/rollback and reset success/failure boundaries. A registry is necessary to preserve motion through those redraws and safely restore it after failed effects. Keeping it amoeba-specific avoids coupling game entities to art and avoids an unrelated generalization of the working paramecium state registry.

**Alternatives considered**: Put animation state on game creatures, rejected because presentation would change the gameplay model and random contract. Restart motion on redraw, rejected because selection, flash, and effect snapshots recreate display objects. Reuse the paramecium registry with amoeba state, rejected because the registry is currently intentionally typed to paramecium state; a shared generic registry would be a separate abstraction with no demonstrated second use.

## Motion, Effects, and Accessibility

**Decision**: Match the approved resting study: broad body ripple, localized upper-right lobe wave, paramecium-like eye blink and eight-way glance, opposite horizontal brow tilt around eye contact, and constrained interior drift. Keep cell backgrounds, selection, and input fixed. Provide normal/inverse art for existing cell flash phases, atomic complete-set fallback to the numbered `1`, reduced-motion startup and live-change support, and accessible board labeling that identifies level 0 as paramecium and level 1 as amoeba.

**Rationale**: The user-approved SVG and resting study define the visible behavior; `BoardView` owns cell containers and flash state; existing artwork loading already has an atomic fallback pattern; and the constitution requires mobile/desktop interaction while keeping art separate from mechanics. Interior clearance can be validated deterministically in motion tests and visually at board size.

**Alternatives considered**: Let the amoeba art rotate the outer piece container, rejected because selection and hit areas must stay fixed. Suppress gameplay flashes in reduced-motion mode, rejected because those effects communicate required game events. Show partially loaded layers, rejected because an incomplete face or silhouette is less recognizable than the existing numbered fallback.

## Validation and Performance

**Decision**: Use Node `node:test` for pure motion, state lifecycle, identity, RNG isolation, gaze, and interior safety. Use Playwright desktop and mobile projects for mixed-level rendering, asset fallback, reduced motion, fixed targets, effects, reset/rollback, and the 64-creature foreground benchmark. Run typecheck, unit suite, E2E suite, and production build. Record hardware and browser conditions; report unavailable physical-device coverage explicitly.

**Rationale**: These are the established project test tools and mirror the level-zero feature's checks. The spec sets at least 95% of observed frame intervals at or below 33.4 ms for a 30-second 64-creature foreground run. The existing emulated baseline is below target, so the benchmark must be run during the renderer spike, not deferred to final polish.

**Alternatives considered**: Fake timers for the performance gate, rejected because they do not measure rendering. One- or two-creature-only performance tests, rejected because they do not exercise board scale. Treat mobile emulation as physical-device evidence, rejected because it does not represent actual mobile hardware.

## References

- Feature [specification](spec.md), the approved [amoeba master](../../docs/art/amoeba-concept.svg), and [resting study](../../docs/art/amoeba-resting-preview.html).
- Existing [level-zero plan](../008-level-zero-animation/plan.md), [research](../008-level-zero-animation/research.md), [data model](../008-level-zero-animation/data-model.md), and [validation record](../008-level-zero-animation/validation.md).
- Existing [board renderer](../../src/view/board-view.ts), [paramecium renderer](../../src/view/paramecium-view.ts), [paramecium assets](../../src/view/paramecium-assets.ts), [motion registry](../../src/view/paramecium-state.ts), and [move/reset controller](../../src/main.ts).
- Phaser 4.1.0 `Graphics.fillPoints` and `Graphics.strokePoints` declarations in `node_modules/phaser/types/phaser.d.ts`.

## Pre-Implementation Baseline

- Environment: Windows, Node.js 24.16.x, Phaser 4.1.0, Vite 8.3.8, Playwright 1.65.1, TypeScript 6.0.2.
- `npm run typecheck`: passed.
- `npm run test:unit`: passed, 102/102 tests.
- `npm run build`: passed; Vite reported the existing JavaScript chunk-size advisory (>500 kB).
- Focused desktop browser baseline (`amoeba-concept`, `amoeba-resting`, `paramecium-assets`, `paramecium-resting`): 7 passed, 1 failed. The existing paramecium asset check reports that `manifest.masterSha256` does not match the current `docs/art/paramecium-concept.svg` hash. This predates amoeba runtime implementation and is not changed as part of this feature baseline.
- `.gitignore` exists. The repository has no Docker, ESLint, or Prettier configuration requiring additional ignore files; package metadata is private and not configured for publishing.

## Level-1 Renderer Spike and US1 Validation

- `npx playwright test tests/e2e/amoeba-renderer-spike.spec.ts --project=desktop --workers=1`: passed. A blank same-origin page compared 64 bodies over 30.015 seconds per candidate. Shared 32-frame body textures measured 100% of intervals at or below 33.4 ms, p95 16.7 ms, p99 16.8 ms, and 13.6 ms click latency. Dynamic Graphics paths measured 91.02% (p95 33.4 ms); per-creature texture refresh measured 97.72% (p95 33.3 ms).
- The equivalent mobile-emulation test passed for 30.015 seconds per candidate. Shared frames measured 100% at or below 33.4 ms, p95/p99 16.8 ms, and 17.9 ms click latency. Graphics paths measured 94.66%; per-creature refresh measured 98.35%. This is iPhone 13 Chromium emulation at 390x664 and DPR 3, not physical-device evidence.
- Selected shared 32-frame body textures based on both isolated measurements. The exporter now emits the approved 32 body frames and independent eye, eye outline, pupil, eyebrow, 11 eyelid states, and six internal-detail layers, each with normal and inverse variants.
- `node scripts/generate-amoeba-assets.mjs` followed by SHA-256 comparison of all 105 generated files: byte-for-byte reproducible before the eye-outline layer split; regenerated complete inventory afterward and confirmed via the asset contract test.
- `npx playwright test tests/e2e/amoeba-assets.spec.ts --project=desktop --workers=1`: passed 2/2, including complete Phaser Canvas texture registration (106 normal/inverse textures at 112x112) and source hash, dimensions, and alpha checks.
- `node --test tests/unit/amoeba-motion.test.ts`: passed 6/6 deterministic motion, contour-frame phase, blink, gaze/brow direction, interior clearance, pause/resume, and delta validation checks.
- `npx playwright test tests/e2e/amoeba-assets.spec.ts tests/e2e/amoeba-concept.spec.ts tests/e2e/amoeba-resting.spec.ts --project=desktop --workers=1`: passed 6/6. The suite verifies the approved eye scale, mixed level-0/level-1 board, golden body/eye/outline pixels, unchanged level assignments, independent resting motion, and the standalone study.
- The same focused amoeba E2E command on `--project=mobile --workers=1`: passed 6/6.
- `npx playwright test tests/e2e/paramecium-accessibility.spec.ts --project=desktop --workers=1 --grep "exposes its current mixed-level content"`: passed after updating its expected accessible label to announce amoebae at level one.
- `npm run typecheck`: passed after T007-T012 implementation.
