# Quickstart: Creature Sizing Validation

## Prerequisites

- Node.js >=24.16 and <25, installed project dependencies, and Playwright's Chromium browser.
- Run from the repository root. See [board contract](contracts/board-sizing.md) and [data model](data-model.md) for precise target and measurement rules.

## Establish Baseline

```powershell
npm run typecheck
npm run test:unit
npm run build
npx playwright test tests/e2e/amoeba-resting.spec.ts tests/e2e/amoeba-effects.spec.ts tests/e2e/amoeba-accessibility.spec.ts tests/e2e/paramecium-resting.spec.ts tests/e2e/paramecium-effects.spec.ts tests/e2e/paramecium-accessibility.spec.ts tests/e2e/gameplay.spec.ts --project=desktop --workers=1
npx playwright test tests/e2e/amoeba-resting.spec.ts tests/e2e/amoeba-effects.spec.ts tests/e2e/amoeba-accessibility.spec.ts tests/e2e/paramecium-resting.spec.ts tests/e2e/paramecium-effects.spec.ts tests/e2e/paramecium-accessibility.spec.ts tests/e2e/gameplay.spec.ts --project=mobile --workers=1
```

Record exact results and environment before modifications. The earlier full E2E run reported 50 failures, 117 passes and 5 skips, and the paramecium manifest hash mismatch and its dense-board performance shortfall were previously observed. Do not assume all failures are pre-existing or fixed without reproducing them.

### Baseline Results (2026-11-16)

- Windows, Node 24.16.0, Chromium 159.0.8154.6, Phaser Canvas. Typecheck passed; unit tests passed 117/117; production build passed with the existing chunk-size warning.
- Focused desktop suite: 18 passed, 1 touch-only skip. Focused mobile emulation: 19 passed. Fallback tests intentionally logged simulated image-decode warnings.
- 64 amoebae, desktop 1280x720 DPR 1: 30.016 s, 1,788 intervals, 99.89% at or below 33.4 ms, p95/p99 16.8/16.8 ms, maximum 33.4 ms, accepted mouse drag; passed.
- 64 amoebae, mobile emulation 980x1669 DPR 3: 30.016 s, 1,792 intervals, 99.83% at or below 33.4 ms, p95/p99 16.8/16.8 ms, maximum 50 ms, accepted touch selection; passed.
- 64 paramecia, desktop 1280x720 DPR 1: 30.082 s, 246 intervals, 0.41% at or below 33.4 ms, p95/p99 199.9/249.9 ms, maximum 250 ms, accepted mouse drag; failed the 95% threshold.
- 64 paramecia, mobile emulation 390x664 DPR 3: 30.032 s, 229 intervals, 0.44% at or below 33.4 ms, p95/p99 233.3/250.1 ms, maximum 316.7 ms, accepted touch selection; failed the 95% threshold. These are emulated results, not physical-device measurements.

### Implementation Results

- Design-authored bounds and manifests were validated in isolated exports. Candidate PNGs were byte-identical to all 98 existing paramecium and 152 existing amoeba PNGs, so only manifest metadata was updated; existing artwork was not overwritten.
- Typecheck passed; the final full unit suite passed 128 tests. The focused rank/geometry/shift suite passed 11 tests. Production build passed with the existing chunk-size warning.
- Desktop and mobile asset contracts passed 14 tests each. The board sizing suite passed 8 tests across both projects; the amoeba neutral measurement uses alpha >=128 against transparent artwork, while other board pixels use an RGB difference threshold. A separate exact authored undeformed paramecium composite measured 59x76 logical pixels at eight edge and corner positions, within tolerance.
- Focused input, effects, accessibility, overlap and envelope checks passed 26 tests with 2 desktop touch-only skips. A separate readiness/drag/sizing suite passed 20 tests across desktop and mobile after fixing a redraw that cancelled active drags. Amoeba frames fit the cell in the sampled test; the conservative paramecium motion envelope was within x [-39.50, 37.67], y [-42.52, 43.58] of the 100-unit cell center. Sampled actual edge animations passed for both artwork sets; this is not an exhaustive continuous-motion proof or physical-device evidence.
- Post-change isolated 64-amoeba tests passed: desktop 99.07% (1,720 samples, p95/p99 16.8/33.4 ms, maximum 50.1 ms), mobile emulation 99.55% (1,777 samples, p95/p99 16.8/33.3 ms, maximum 33.4 ms); mouse drag and touch selection accepted.
- Post-change 64-paramecium tests failed both configurations: desktop 0% (181 samples, p95/p99 266.7/383.3 ms, maximum 483.4 ms); mobile emulation 0% (201 samples, p95/p99 233.3/283.3 ms, maximum 350 ms). The earlier baseline also failed severely; these single runs do not establish the cause of the slower result.
- A separate isolated mixed-board run with counts 16/16/11/11/10 for levels 0-4 measured desktop 30.016 s, 1,792 intervals, 99.83% within 33.4 ms, p95/p99 16.7/16.8 ms, maximum 50 ms, accepted mouse drag; mobile emulation 30.032 s, 1,786 intervals, 99.83%, p95/p99 16.8/16.8 ms, maximum 33.4 ms, accepted touch selection. No mixed-board performance threshold was imposed.
- The full E2E run before the readiness fix reported 190 passed, 37 failed, 7 skipped. Failures included drag readiness, explosion/hint timing, legacy pixel sampling, and both paramecium performance tests. The readiness fix subsequently passed focused tests, but the complete suite has not been rerun and remains unverified.
- Desktop live board inspected. Representative physical-device input and the five-person usability check were unavailable and remain unverified.

### Asset Export

Both artwork generators accept `--output-dir <path>` to produce candidate bundles without overwriting existing assets. Use a new empty directory and compare generated PNGs and metadata with the existing bundle before replacing files. Paramecium design validation also supports `node scripts/generate-paramecium-assets.mjs --check`. Authored neutral boxes remain the scaling authority; transparent canvas margins are only for layer alignment and animation.

## Validate Implementation

1. Run newly added rank and geometry unit tests and the full unit suite. Confirm current 0-4, illustrative 1-5 and another shifted chain, invalid ranks, and absent-board-level cases. The future examples do not require new playable levels.
2. Verify each creature design has an authored, tight, padding-free neutral box, that its exporter carries the same box and coordinates into metadata, and that actual exported art agrees with it independently, including the paramecium preview/master relationship. Run sizing browser tests in both Playwright projects. On controlled neutral compositions independently measure visible alpha bounds for art and glyph ink, excluding storage margins and tile decorations. Verify 75/80/85/90/95% within one cell percentage point, centering and aspect ratio, with no added box padding. Repeat with failed artwork and both available and failed fonts.
3. Verify full-cell mouse and touch targets, including cell edges; compare seeded committed board state and counters. Check selection, drag/cancel, reaction inversion, convergence, refill, reset, sparse/empty boards, and async asset attachment. Check startup and live reduced-motion freeze/resume without forcing a new pose.
4. Check every artwork's stationary motion envelope on an oversized transparent surface and verify no visible overflow at edges; cover inverse variants and renderer redraws during movement. If exact neutral size and existing animation containment conflict, stop and document the conflict rather than silently crop or change motion.
5. Re-run the baseline commands, relevant new tests, and `npm run test:e2e -- --workers=2`. Report exact results and investigate new failures; do not call the suite clean if it fails.

## Dense-Board Timing

Run the existing 30-second harnesses individually on each project, without concurrent performance tests:

```powershell
npx playwright test tests/e2e/amoeba-performance.spec.ts --project=desktop --workers=1
npx playwright test tests/e2e/amoeba-performance.spec.ts --project=mobile --workers=1
npx playwright test tests/e2e/paramecium-performance.spec.ts --project=desktop --workers=1
npx playwright test tests/e2e/paramecium-performance.spec.ts --project=mobile --workers=1
npx playwright test tests/e2e/creature-sizing-mixed-performance.spec.ts --project=desktop --workers=1
npx playwright test tests/e2e/creature-sizing-mixed-performance.spec.ts --project=mobile --workers=1
```

Record duration, sample count, unfiltered interval fraction <=33.4 ms, p95/p99, longest stall, input result, browser, viewport, DPR and device conditions. Compare with baseline and add a representative mixed-board timing run. The amoeba prior gate is >=95%; prior paramecium measurements missed their target. Browser mobile emulation is not a physical-device measurement.

## Manual Review

Run `npm run dev`, then review the actual board on desktop and mobile: ordering, readability, cell edges, key, animations, flash, fallback and interaction. Test available physical desktop/mobile devices and document device/browser conditions separately. Ask five participants to order ranks by size and compare them to the key; at least four must succeed for SC-005. If hardware or participants are unavailable, record those criteria as unverified, not passed.