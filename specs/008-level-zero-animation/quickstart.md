# Quickstart: Level 0 Creature Animation

## Prerequisites

Use Node.js 24.16.x and the existing locked project dependencies. For a clean local setup and browser tests:

```powershell
npm ci
npx playwright install chromium
```

The editable [SVG master](../../docs/art/paramecium-concept.svg) and [resting preview](../../docs/art/paramecium-resting-preview.html) are the appearance reference. Generated runtime assets are bundled under `src/assets/paramecium/`; ordinary builds do not run the exporter.

To reproduce the generated transparent layers and inverse variants offline, install project dependencies and Playwright Chromium once, then run:

```powershell
npx playwright install chromium
node scripts/generate-paramecium-assets.mjs
```

The exporter uses the approved preview, retains the SVG master as editable source, emits 32 longer cilia stems and a 32-frame cilia sequence at 30 degrees, and scales the eye 1.5x with proportional pupil movement. It hashes both source references in the manifest, removes obsolete generated cilia frames, and has been verified byte-for-byte reproducible. Asset validation is covered by `tests/e2e/paramecium-assets.spec.ts`.

## Automated Validation

After implementation, run the focused visual-state and browser tests added for this feature, then run:

```powershell
npm run typecheck
npm run test:unit
npm run test:e2e -- --workers=2
npm run build
```

The focused checks must cover independent ripple, 12-24-degree body rotation with a level eye, blinking, gaze and internal drift; all eight gaze directions and eye bounds; frame/alpha correctness; reduced motion; and unavailable-art fallback. Exercise surviving IDs through selection, redraw, flashes, swaps, falling and refill; test new IDs, removal, successful and failed reset, cancelled/error rollback, and stale callbacks. Verify visual state does not consume gameplay random draws and that gameplay results match the existing rules. Compare desktop and mobile screenshots at real board-cell sizes, including rotation extrema and board edges.

## Performance Validation

Construct a **test-only** board of 64 level-0 creatures without changing production board generation. Warm up, then collect all foreground frame intervals for at least 30 seconds; exercise selection, dragging and effects in appropriate measured scenarios. Record the sample count, fraction at or below 33.4 ms, p95/p99, longest intervals, responsiveness, browser, viewport, DPR, device, renderer and power conditions. The acceptance criterion is at least 95% at or below 33.4 ms for each tested representative desktop and mobile configuration. Do not clamp intervals or remove long stalls from the result.

Repeat on representative physical desktop and mobile devices. The configured mobile browser project is Chromium emulation, not physical-device performance evidence. Record any unavailable physical-device coverage and do not claim the performance target is met until measured.

See [validation.md](validation.md) for the recorded baseline, exact results, measured frame intervals and current performance shortfall. The current 64-creature emulation results do not meet the 95% target; physical-device measurements remain outstanding.

## Manual Validation

1. Run `npm run dev`, open its reported URL and compare level-0 artwork with the approved preview while retaining colored cells and levels 1-4 numbers.
2. Watch multiple creatures for independent cilia ripples, rotation, blinking, eight-direction glances and small internal drift. Verify artwork remains legible and within cell boundaries at desktop and mobile board sizes.
3. Select, drag, cancel, swap, trigger a hint or reaction, and reset while an effect is running. Check flash visibility, stable input targets, refill motion, and the absence of stale artwork.
4. Enable reduced motion and verify idle motion stops while feedback and play remain usable; simulate unavailable assets and check the `0` fallback.
5. Record the measured performance and physical-device results described above. See [the contract](contracts/animation-and-board.md) and [data model](data-model.md) for precise behavior.