# Candidate Evidence Matrix

## Desktop Performance

Each row is one valid 30-second foreground trial at 1280x900, DPR 1, seed 17, in a fresh desktop Chromium context. The 95% threshold is met only at >=95.00% of unfiltered intervals <=33.4 ms. Raw intervals and full environment/resource records are in the linked JSON reports. Browser-reported graphics acceleration is unavailable for all trials.

| Candidate | Workload | Samples | <=33.4 ms | p95 (ms) | p99 (ms) | Max stall (ms) | Pass |
|---|---|---:|---:|---:|---:|---:|---|
| Current Canvas | Dense paramecium | 1,304 | 92.33% | 33.4 | 66.8 | 250.0 | No |
| Current Canvas | Dense amoeba | 1,422 | 95.92% | 33.4 | 33.4 | 50.0 | Yes |
| Current Canvas | Mixed | 1,488 | 95.23% | 33.4 | 50.0 | 100.1 | Yes |
| Shared-frame Canvas | Dense paramecium | 1,348 | 90.43% | 50.0 | 66.8 | 166.6 | No |
| Shared-frame Canvas | Dense amoeba | 1,459 | 91.98% | 49.9 | 50.1 | 66.8 | No |
| Shared-frame Canvas | Mixed | 1,516 | 95.38% | 33.4 | 50.0 | 66.7 | Yes |
| Forced WebGL | Dense paramecium | 384 | 0.00% | 133.3 | 200.0 | 433.4 | No |
| Forced WebGL | Dense amoeba | 404 | 5.45% | 100.0 | 116.7 | 250.0 | No |
| Forced WebGL | Mixed | 335 | 0.00% | 150.0 | 216.5 | 266.8 | No |

| Candidate | Dense paramecium load (ms) | Dense amoeba load (ms) | Mixed load (ms) | Dense paramecium PNG bytes | Peak sampled JS heap range (MB) |
|---|---:|---:|---:|---:|---:|
| Current Canvas | 1,526 | 2,878 | 2,951 | 166,670 | 50.4-53.5 |
| Shared-frame Canvas | 1,484 | 2,883 | 2,863 | 167,462 | 44.7-53.5 |
| Forced WebGL | 3,129 | 5,068 | 5,057 | 167,462 | 56.8-60.3 |

Decoded asset bytes are unavailable through the browser API. Heap values are sampled JavaScript heap high-water marks, not total process/GPU memory. Candidate setup uses a fresh browser context with `cachePolicy=unspecified`; PNG transfer totals can vary with browser cache behavior. Four scripted actions were accepted for each trial.

## Functional and Platform Evidence

| Candidate | Workload coverage | Desktop functional/visual | Mobile emulation | Physical iPhone | Physical Android |
|---|---|---|---|---|---|
| Current Canvas | All three | Pass | Pass | Not available | Not available |
| Shared-frame Canvas | All three | Pass; screenshot parity passes | Pass; screenshot parity passes | Not available | Not available |
| Forced WebGL | All three | Pass; actual renderer verified | Pass | Not available | Not available |
| Authored study | Blocked | No approved tool/artwork | Blocked | Not available | Not available |

## Raw Reports

- [Current Canvas, dense paramecium](trials/current-canvas-dense-paramecium-desktop-seed17-2026-11-17T10-41-07-978Z.json)
- [Current Canvas, dense amoeba](trials/current-canvas-dense-amoeba-desktop-seed17-2026-11-17T10-41-41-964Z.json)
- [Current Canvas, mixed](trials/current-canvas-mixed-desktop-seed17-2026-11-17T10-42-16-468Z.json)
- [Shared-frame, dense paramecium](trials/shared-frame-dense-paramecium-desktop-seed17-2026-11-17T10-43-08-065Z.json)
- [Shared-frame, dense amoeba](trials/shared-frame-dense-amoeba-desktop-seed17-2026-11-17T10-43-42-477Z.json)
- [Shared-frame, mixed](trials/shared-frame-mixed-desktop-seed17-2026-11-17T10-44-16-972Z.json)
- [Forced WebGL, dense paramecium](trials/webgl-dense-paramecium-desktop-seed17-2026-11-17T10-45-09-214Z.json)
- [Forced WebGL, dense amoeba](trials/webgl-dense-amoeba-desktop-seed17-2026-11-17T10-45-46-022Z.json)
- [Forced WebGL, mixed](trials/webgl-mixed-desktop-seed17-2026-11-17T10-46-22-894Z.json)

## Evidence Conditions

- Three isolated invocations ran only `tests/e2e/animation-spike-performance.spec.ts`, one candidate per invocation, `--project=desktop --workers=1`; each workload trial ran serially in a fresh context. No functional tests or other performance trials ran concurrently.
- The nine trials are valid local desktop Playwright browser measurements. The OS is Windows/Win32, but the GPU/acceleration and physical desktop model were not reported; do not generalize to other desktop hardware.
- Browser functional suite: 60 passed, 0 failed, 4 skipped across desktop and mobile emulation. The desktop parity-only run additionally reports 21 passed, 4 touch-only skipped.
- Full project E2E suite and required physical iPhone/Android tests have not been completed.
- WebGL's valid performance failures trigger the conditional Godot comparison under FR-010; Godot is not installed on PATH, and no installation was attempted.
