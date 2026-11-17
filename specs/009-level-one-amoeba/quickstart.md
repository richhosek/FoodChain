# Quickstart: Level 1 Amoeba Animation

## Prerequisites

Use Node.js 24.16.x and the existing locked project dependencies. Install dependencies and the Playwright browser if needed:

```powershell
npm ci
npx playwright install chromium
```

The editable [amoeba SVG master](../../docs/art/amoeba-concept.svg) defines character geometry. The [resting study](../../docs/art/amoeba-resting-preview.html) is the behavioral reference. Generated shared assets are committed under `src/assets/amoeba/`; normal build and test commands do not run the exporter.

To regenerate the static asset layers offline after installing dependencies and Playwright Chromium:

```powershell
node scripts/generate-amoeba-assets.mjs
```

## Automated Validation

Run focused motion/lifecycle tests and desktop/mobile rendering checks, then the project-wide checks:

```powershell
node --test tests/unit/amoeba-motion.test.ts tests/unit/amoeba-lifecycle.test.ts tests/unit/amoeba-gameplay-rng.test.ts
npx playwright test tests/e2e/amoeba-resting.spec.ts tests/e2e/amoeba-accessibility.spec.ts tests/e2e/amoeba-effects.spec.ts --project=desktop --workers=1
npx playwright test tests/e2e/amoeba-resting.spec.ts tests/e2e/amoeba-accessibility.spec.ts tests/e2e/amoeba-effects.spec.ts --project=mobile --workers=1
npm run typecheck
npm run test:unit
npm run test:e2e -- --workers=2
npm run build
```

Focused coverage must verify the approved geometry, broad and lobe motion, blink/gaze/brow behavior, interior clearance, independent creature state, gameplay RNG isolation, cell colors, fallback, reduced motion, effects, move rollback, successful/failed reset, and fixed mouse/touch targets. Compare rendering at real board-cell dimensions.

### Completed US1 Checks

The initial implementation currently passes:

```powershell
node --test tests/unit/amoeba-motion.test.ts
npx playwright test tests/e2e/amoeba-assets.spec.ts tests/e2e/amoeba-concept.spec.ts tests/e2e/amoeba-resting.spec.ts --project=desktop --workers=1
npx playwright test tests/e2e/amoeba-assets.spec.ts tests/e2e/amoeba-concept.spec.ts tests/e2e/amoeba-resting.spec.ts --project=mobile --workers=1
npx playwright test tests/e2e/amoeba-renderer-spike.spec.ts --project=desktop --workers=1
npx playwright test tests/e2e/amoeba-renderer-spike.spec.ts --project=mobile --workers=1
npm run typecheck
```

The renderer spike compares 64 bodies for 30 seconds per candidate on an isolated page. The production renderer is the dirty-cell board-sized Canvas overlay; shared body/detail/face frames are its inputs. These are emulation results; physical desktop/mobile validation is still required by the specification.

## Renderer and Dense-Board Validation

The isolated renderer spike compared Phaser Canvas `Graphics` paths, per-creature texture refresh, and shared frames. Final integration uses a dirty-cell board-sized Canvas overlay over per-cell interaction containers. It repaints only changed cells and refreshes one texture. Final isolated 64-creature runs passed: desktop 99.78% within 33.4 ms (p95/p99 16.8/16.8 ms), mobile emulation 100% (p95/p99 16.7/16.8 ms). Keep both performance harnesses and rerun them if composition, update cadence, or asset frame rates change.

The level-zero validation record documents that its prior 64-creature run missed the target. The amoeba integrated emulation runs pass, but no physical desktop or mobile device was available in this environment. The Playwright mobile project is Chromium emulation, not physical-device evidence. Record this limitation and do not claim universal or physical-device performance from these results.

Latest recorded repository-wide run completed with exit code 1: **172 tests, 117 passed, 50 failed, 5 skipped**. It ran for approximately 23 minutes and exceeded the terminal's 10-minute foreground wait before its completion notification. Failure groups included gesture/preview timing under worker contention, the old all-numeric/label pixel assumptions (updated afterward), the pre-existing paramecium `masterSha256` mismatch, and the known failing paramecium 64-creature performance gate. This is not a clean full-suite pass; the amoeba-focused desktop/mobile suites and the updated gameplay-label checks are the relevant passing validation.

Other latest checks: `npm run typecheck` passed; `npm run test:unit` passed 117/117; `npm run build` passed with Vite's existing >500 kB chunk advisory. The amoeba dense-board performance tests pass in desktop and mobile emulation. Physical devices were unavailable.

The focused asset, resting, effect, accessibility, and gameplay slice passed on desktop (11 passed, 1 touch-only skip) and mobile emulation (12 passed). The mobile mouse/touch parity check also passed three repeated runs using committed board state. A mixed-level live board was visually inspected at desktop and 390-pixel mobile viewport widths; dense-board and effect visual review remains open.

## Manual Validation

1. Run `npm run dev` and open its reported URL. Compare a mixed-level board with the approved amoeba concept and resting study; confirm level 0 remains paramecium and levels 2-4 remain numbered.
2. Observe multiple amoebae for independent body/lobe motion, blinking, eight-way gaze, counter-tilting brow, and collision-free interior drift.
3. On desktop and mobile, select, drag, cancel, swap, trigger hint/reaction/refill, and reset during an effect. Confirm cell backgrounds and input targets remain fixed and surviving identities retain their animation state.
4. Enable reduced motion and verify resting motion freezes while effects and play remain usable. Simulate unavailable amoeba art and confirm the numbered `1` fallback remains playable.
5. Record the dense-board measurements and physical-device limitations described above.

See the [data model](data-model.md) and [board contract](contracts/animation-and-board.md) for precise lifecycle and behavior requirements.
