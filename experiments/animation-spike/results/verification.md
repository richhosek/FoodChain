# Animation Spike Verification

## Foundational Checks

- Fixture, metric and decision unit tests: `node --test tests/unit/animation-spike-fixtures.test.ts tests/unit/animation-spike-metrics.test.ts tests/unit/animation-spike-decision.test.ts` — 13 passed, 0 failed.
- TypeScript: `npm run typecheck` — passed after adding contracts and harness modules.
- Browser entry: `/experiments/animation-spike/index.html` served through Vite and displayed its no-candidate state.
- Browser harness smoke check: a fake Canvas candidate reached ready after the readiness barrier, cleaned up on destroy, and a second candidate was rejected on the same page. This is a harness lifecycle check, not candidate behavior or performance evidence.
- Performance gate: no performance tests have been run. Browser candidate functional/visual checks pass, but required physical-device verification and owner visual/complexity review remain pending, so all timed comparisons remain gated.
- Physical-device coverage: not verified. `adb` is unavailable; physical Android and iPhone access are not confirmed.
- Authored-character workflow: not verified. Owner/artist approval, authoring tool access, and licensing are not confirmed.

## Candidate Functional Checks

- Harness lifecycle: `npx playwright test tests/e2e/animation-spike-harness.spec.ts --project=desktop --workers=1` — 4 passed; readiness, renderer mismatch cleanup, same-page reuse rejection and initialization-error cleanup verified.
- Desktop candidate/workload matrix: `npx playwright test tests/e2e/animation-spike-parity.spec.ts --project=desktop --workers=1` — 13 passed, 4 skipped before expanded drag/reset/reduced-motion/visual checks were added.
- Mobile-emulated candidate/workload matrix: `npx playwright test tests/e2e/animation-spike-parity.spec.ts --project=mobile --workers=1` — 17 passed at that point, including touch selection for all three renderers and workloads.
- Deterministic game outcomes: Canvas, shared-frame and WebGL drag/refill/reset outcomes match an independent `GameLevel` simulation with the same fixture and seed — 3 passed.
- Reduced motion: Canvas and shared-frame stability checks passed. WebGL checks use screenshot capture because its default framebuffer is not readable through a 2D context.
- WebGL visual comparison: passes the current reduced-motion screenshot threshold against Canvas.
- Shared-frame visual comparison: passes the reduced-motion screenshot threshold on desktop and mobile after removing stale numbered fallback labels from paramecium containers; see `visual-review.md`.
- Platform classification: `npx playwright test tests/e2e/animation-spike-platform.spec.ts --project=desktop --workers=1` — 1 passed; an unannotated browser is emulated, and a physical label requires explicit supplied metadata.
- Authored candidate blocker: `npx playwright test tests/e2e/animation-spike-authored.spec.ts --project=desktop --workers=1` — 1 passed; the candidate reports the missing approval/tool/license/artwork prerequisites and does not initialize Phaser.
- Required-art failure: focused harness test passed; forced PNG decode failure reports the candidate failed instead of passing with numbered fallback.
- Latest cross-project animation-spike run: `npx playwright test tests/e2e/animation-spike-parity.spec.ts tests/e2e/animation-spike-harness.spec.ts tests/e2e/animation-spike-platform.spec.ts tests/e2e/animation-spike-authored.spec.ts --workers=1` — 60 passed, 0 failed, 4 skipped across desktop and mobile emulation.
- Desktop-only candidate matrix after isolating it from the long regression run: `npx playwright test tests/e2e/animation-spike-parity.spec.ts --project=desktop --workers=1` — 21 passed, 0 failed, 4 touch-only skips. All three candidates rendered all three workloads, deterministic move/reset and reduced-motion checks passed, and Canvas/shared-frame/WebGL reduced-motion screenshot comparisons passed.
- Shared-frame actual mouse drag: `npx playwright test tests/e2e/animation-spike-parity.spec.ts --project=desktop --workers=1 --grep "shared-frame overlay accepts a real mouse drag"` — 1 passed.
- Candidate reaction/refill parity: `npx playwright test tests/e2e/animation-spike-parity.spec.ts --project=desktop --workers=1 --grep "pointer-driven reaction"` — 3 passed; each renderer accepted a pointer-driven reacting move and matched the seeded `GameLevel` outcome after refill.
- Existing project mechanics/UI regression selection: 133 passed, 2 failed, 7 skipped across desktop and mobile projects. Both failures were `gameplay-helpers.spec.ts` test “starting a move cancels the pending idle hint timer”. Timestamp instrumentation showed the hint fired about 629 ms before pointer-down because the test advanced to 9 seconds before doing browser setup/input. The test now advances to 5 seconds, retaining a pending-timer cancellation check; focused desktop and mobile reruns both pass. No production gameplay code was changed for this test issue. The full selected regression set has not been rerun after this test-only adjustment.
- Complete gameplay-helper file after that test-only correction: `npx playwright test tests/e2e/gameplay-helpers.spec.ts --workers=1` — 14 passed across desktop and mobile projects.
- Project unit suite: `npm run test:unit` — 148 passed, 0 failed.
- Project type-check: `npm run typecheck` — passed with `experiments/` included.
- Production build: `npm run build` — passed.

## Outstanding Functional Verification

Candidate adapters and harness lifecycle are implemented for the production Canvas, shared-frame Canvas and forced WebGL paths. Desktop/mobile-emulated fixtures, visual checks, mouse/touch inputs, deterministic move/reset outcomes, fallback failure reporting and reduced motion pass. Physical devices, owner visual/complexity review and the authored study remain pending. No candidate is claimed to pass all feature requirements.

## Desktop Performance Trials

Desktop functional gate passed for all three candidates and workloads before timing. Each candidate group ran in its own command containing only the dedicated performance spec; candidate workloads ran serially in fresh browser contexts. No other test or performance run overlapped any capture.

- `npx playwright test tests/e2e/animation-spike-performance.spec.ts --project=desktop --workers=1 --grep "desktop trials for current-canvas"` — 3 valid 30-second trials.
- `npx playwright test tests/e2e/animation-spike-performance.spec.ts --project=desktop --workers=1 --grep "desktop trials for shared-frame"` — 3 valid 30-second trials.
- `npx playwright test tests/e2e/animation-spike-performance.spec.ts --project=desktop --workers=1 --grep "desktop trials for webgl"` — 3 valid 30-second trials.

All nine retained nonzero raw samples and accepted all four scripted actions. Results: current Canvas passed dense amoeba (95.92%) and mixed (95.23%), but failed dense paramecium (92.33%); shared-frame passed mixed (95.38%) but failed dense amoeba (91.98%) and dense paramecium (90.43%); forced WebGL failed all three (0%, 5.45%, 0%). Full statistics, environment fields and raw intervals are in `results/matrix.md` and `results/trials/`.

Environment: Windows/Win32, Playwright desktop Chromium, 1280x900, DPR 1. GPU acceleration and exact machine model were unavailable. Results characterize this local desktop test environment only. Decoded asset bytes were unavailable; heap figures are sampled JS heap, not total process/GPU memory. Cache policy was recorded as unspecified.

## Performance Gate

Gate status: desktop trials complete; mobile physical timing remains pending. Desktop applicable mechanics/UI prerequisites passed. No mobile physical claim is made. WebGL performance failure on all measured desktop workloads triggers the conditional Godot comparison under FR-010. Godot is not installed on PATH, no installation was attempted, and the Godot comparison remains blocked pending toolchain availability/authorization. No production migration decision is made.
