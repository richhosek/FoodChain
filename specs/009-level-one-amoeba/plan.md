# Implementation Plan: Level 1 Amoeba Animation

**Branch**: `009-level-one-amoeba` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-level-one-amoeba/spec.md`.

## Summary

Replace level-1 number labels with the approved animated amoeba while retaining its colored cell and all existing gameplay. Keep the approved SVG as the art source and use shared offline-generated body/detail frames and face poses in Phaser Canvas. A dirty-cell board overlay composites changed amoeba cells into one texture while per-cell containers continue to own interaction and movement. Add per-creature deterministic motion state with explicit move/reset lifecycle handling.

## Technical Context

**Language/Version**: TypeScript 6.0.2; Node.js 24.16.x.

**Primary Dependencies**: Phaser 4.1.0, Vite 8.3.8, Playwright 1.65.1; no new runtime dependency planned.

**Storage**: In-memory view-owned motion state and committed static assets under `src/assets/amoeba/`; no persistence or backend.

**Testing**: Node `node:test` for deterministic motion, lifecycle, collision bounds, and gameplay RNG isolation; Playwright desktop/mobile for rendering, input, effects, fallback, reduced motion, and performance; TypeScript check and production build.

**Target Platform**: Desktop and mobile web browsers, with mouse and touch input and reduced-motion support.

**Project Type**: Single client-side browser game.

**Performance Goals**: With 64 animated level-1 creatures, at least 95% of foreground frame intervals at or below 33.4 ms over 30 seconds on each representative tested configuration. Physical-device results must be separated from browser emulation.

**Constraints**: Existing Phaser Canvas renderer and 8 x 8 board; preserve cell colors, hit targets, selection, game effects, and levels 0 and 2-4. Visual state must follow creature identity across redraw, move rollback, and reset; visual randomness must not consume gameplay RNG. The final dirty-cell overlay measured 99.78% desktop and 100% mobile-emulation frame intervals within 33.4 ms; physical-device performance remains unmeasured.

**Scale/Scope**: Up to 64 level-1 amoebae. Resting motion and current gameplay feedback only; no gameplay rule changes or additional character states.

## Constitution Check

**Before research: PASS.**

- **Gameplay rules are explicit and testable**: The spec changes presentation only. Existing game rules and domain state remain unchanged and testable independently of the creature view.
- **Mobile-first, cross-input play**: Keep the TypeScript browser game and validate responsive mouse and touch behavior on desktop and mobile.
- **Engine evaluation**: Retain Phaser 4.1.0, selected and recorded by the prototype research. No engine or renderer change is proposed.
- **Mechanics before art**: Mechanics are already prototyped; this separately specified follow-on adds level-1 art while levels 2-4 remain numbered and gameplay mechanics stay independent.
- **Reproducible behavior**: Use deterministic per-creature visual randomness isolated from game RNG; include lifecycle and gameplay parity tests.

## Project Structure

### Documentation (this feature)

```text
specs/009-level-one-amoeba/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── animation-and-board.md
└── tasks.md                 # Created by /speckit-tasks, not by this command
```

### Source Code (repository root)

```text
docs/art/                    # Approved editable amoeba SVG and resting study
scripts/
└── generate-amoeba-assets.mjs
src/
├── game/                    # Existing gameplay rules and creature identity; unchanged
├── main.ts                  # Existing move/reset commit and rollback boundaries
├── view/
│   ├── board-view.ts         # Integrate level-1 view and lifecycle
│   ├── amoeba-motion.ts      # Pure deterministic resting state/update
│   ├── amoeba-state.ts       # Identity registry and checkpoints
│   ├── amoeba-view.ts        # Dirty-cell board composite and shared frame drawing
│   └── amoeba-assets.ts      # Atomic shared asset registration
└── assets/amoeba/            # Bundled normal/inverse layers and manifest

tests/
├── unit/
│   ├── amoeba-motion.test.ts
│   ├── amoeba-lifecycle.test.ts
│   └── amoeba-gameplay-rng.test.ts
└── e2e/
    ├── amoeba-assets.spec.ts
    ├── amoeba-resting.spec.ts
    ├── amoeba-effects.spec.ts
    ├── amoeba-accessibility.spec.ts
    └── amoeba-performance.spec.ts
```

**Structure Decision**: Keep mechanics in `src/game/` unchanged. Add amoeba-specific motion, registry, rendering, and loading alongside the existing paramecium view modules. Store generated assets separately from the editable master. Integrate with `BoardView` and the existing explicit controller transaction boundaries in `src/main.ts`. Start with a renderer spike before broad view integration.

## Design Sequence

1. Establish the current app baseline and benchmark 64-level-1 contours. Use shared frames in a dirty-cell board overlay; preserve the passing integrated desktop/mobile measurements while profiling any later visual or motion change.
2. Add test-first asset validation, then an offline exporter based on the approved SVG master. Generate 32 aligned contour frames, shared static layers, and normal/inverse flash variants. Verify source hashes, alpha, bounds, reproducibility, and that ordinary builds require no browser launch.
3. Implement a pure deterministic `AmoebaMotionState` and view-owned identity registry. Cover body/lobe waves, blink, eight-way gaze, counter-tilting brow, constrained interior drift, pause/resume, visual RNG isolation, and move/reset lifecycle semantics.
4. Implement the selected dirty-cell Canvas board composite from shared body/detail/face frames, then integrate level 1 in `BoardView`. Keep outer cell containers as hit/movement targets and keep selection borders visible above the overlay; retain level 0 and numbered levels 2-4. Update accessible board labeling and use a complete numbered fallback if artwork is unavailable.
5. Preserve existing hint/reaction inversion, movement, refill, commit/rollback, reset, and stale-callback guards. Add focused desktop/mobile tests for effects, fixed targets, creature identity, reduced motion, fallback, and gameplay parity.
6. Rerun the 64-creature benchmark with full frame intervals for at least 30 foreground seconds, then run typecheck, unit, desktop/mobile E2E, and build. Record emulation and physical-device results separately; leave unavailable device validation explicitly open.

## Constitution Check After Design

**PASS, subject to implementation and measured validation.** The design keeps gameplay rules and domain entities unchanged, retains the selected Phaser Canvas engine, and keeps animation state view-owned with isolated deterministic randomness. Desktop/mobile mouse and touch validation is included. The renderer must pass the measured dense-board gate or be revised; the historical level-zero emulation shortfall is not treated as an amoeba result or as evidence that the target is met. No constitution exception is required.

## Complexity Tracking

No constitution violations or new runtime dependencies are proposed. A dedicated amoeba view-state registry is justified by its distinct motion state and the requirement to preserve identity across existing transactional redraws; it follows the established paramecium lifecycle without refactoring that registry or the gameplay model.
