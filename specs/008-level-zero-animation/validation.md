# Validation Record: Level 0 Creature Animation

## Environment

- Windows, Node.js 24.16.0, npm 11.13.0.
- Phaser 4.1.0, Vite 8.3.8, Playwright 1.65.1, TypeScript 6.0.2.
- Chromium 159.0.8154.6; Phaser Canvas renderer; 800 x 800 logical canvas.
- The mobile Playwright project is iPhone 13 Chromium emulation, not a physical phone.

## Baseline Before Changes

- `npm run typecheck`: passed.
- `node --test --test-timeout=5000 "tests/unit/**/*.test.ts"`: 84 passed.
- `npx playwright test --workers=2 --global-timeout=180000`: bounded at three minutes; 104 passed, 5 skipped, 2 interrupted, 13 not run. The two interruptions were caused by the suite time limit, so this was not a complete baseline.

## Artwork

- Generate bundled assets offline with `node scripts/generate-paramecium-assets.mjs` after installing project dependencies and Playwright Chromium (`npx playwright install chromium`). No generation step is needed for normal development or production builds.
- The exporter derives 896 x 896 transparent layers and inverse-alpha variants from `docs/art/paramecium-resting-preview.html`, records the source SVG and preview hashes, and emits 32 cilia phases at a 30-degree swing. The approved SVG remains the editable source and includes the 1.5x eye plus 32 longer cilia spaced evenly around the closed body contour, including the wraparound across the top.
- Re-ran the exporter and compared SHA-256 hashes for all generated PNGs: byte-for-byte reproducible.
- `npx playwright test tests/e2e/paramecium-assets.spec.ts --project=desktop --workers=1`: passed; checks manifest/source hash, frame set, dimensions, transparency and alpha-preserving inverse assets.
- Refinement checks: `node --test tests/unit/paramecium-motion.test.ts` passed 9/9; desktop/mobile asset and resting tests passed 8/8, including a 32-line preview assertion, a generated-pixel assertion for the top cilium, and even base spacing including wraparound; mobile accessibility/effect tests passed 9/9; `npm run typecheck`, `npm run build`, and PNG hash reproducibility passed. Vite retains its existing >500 kB chunk advisory.
- The remaining visible gap was caused by the preview and exporter regexes rejecting negative SVG coordinates: the top stem ends at y=-11 and was omitted at runtime. Both parsers now accept signed coordinates, and the generated textures include that stem.

## Automated Checks

- `npm run typecheck`: passed after implementation.
- `npm run test:unit`: 102 passed.
- `npm run build`: passed. Vite reports the application bundle exceeds its 500 kB advisory threshold; generated artwork is bundled as static assets.
- Focused artwork/accessibility checks on desktop and mobile: 12 passed, including live/initial reduced motion, unavailable-art fallback and usable fallback input.
- Focused effects and hit-target checks on desktop and mobile: 4 passed.
- Focused lifecycle, motion and gameplay-RNG unit tests passed as part of the 102-test unit suite.
- Focused reset/scoreboard and idle-hint regression checks passed after making refill and clock fixtures deterministic.
- The final broad non-performance run completed 142 desktop/mobile cases: 136 passed, 1 failed and 5 were skipped. The only failure was the mouse/touch screenshot parity case taking its first capture before asynchronous artwork loaded. The test now waits for the loaded-art label and two rendered frames; the isolated mobile parity rerun passed. The entire broad suite was not rerun after this test-only synchronization fix.
- `git diff --check`: passed.
- The art, cilia count and body rotation range have since been revised. The dense-board metrics above predate the final 32-cilia, 12-24-degree implementation and were not remeasured for this visual update.
- Final rotation refinement: unit suite passed 102/102; focused asset, resting, effect, hit-target, preview-eye and runtime-eye tests passed 14/14 across desktop and mobile emulation; typecheck and production build passed. The browser check confirms the eye child counter-rotates against the body while its position remains attached to the rotating artwork.

## Dense-Board Performance

The test-only harness measures every foreground animation-frame interval for over 30 seconds; long intervals are retained. Results below are an actual isolated Playwright run after the renderer optimization. This run exited non-zero because the 95% acceptance threshold was not met.

| Configuration | Samples | Duration | <= 33.4 ms | p95 | p99 | Longest interval | Input response |
|---|---:|---:|---:|---:|---:|---:|---:|
| Desktop Chrome, 1280 x 720, DPR 1 | 579 | 30.07 s | 15.4% | 66.8 ms | 100 ms | 133.4 ms | Mouse drag 615 ms |
| iPhone 13 emulation, 390 x 664, DPR 3 | 616 | 30.03 s | 26.3% | 66.7 ms | 100 ms | 116.7 ms | Touch selection 297 ms |

Both configurations used Chromium 159 and Phaser CanvasRenderer with a visible page. These are emulation measurements on the current Windows environment, not physical-device evidence. **The 95% performance target is not met.** More profiling and optimization are required before dense-board performance can be accepted.

## Physical Devices and Remaining Work

- No representative physical desktop/mobile measurement was available in this environment. Do not treat Chromium emulation as a substitute; task T027 remains open.
- The full end-to-end regression suite did not complete within its configured eight-minute limit. Targeted rendering, effects, accessibility, lifecycle, interaction and gameplay checks passed, but a completed full-suite run remains outstanding.