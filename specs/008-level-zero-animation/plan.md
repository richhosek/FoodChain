# Implementation Plan: Level 0 Creature Animation

**Branch**: `Creatures` (actual Git branch); Spec Kit feature identifier `008-level-zero-animation` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-level-zero-animation/spec.md`.

## Summary

Replace level-0 labels with the approved animated paramecium, retaining colored cells and numbered levels 1-4. Use shared transparent artwork and cilia frames with independently animated features in Phaser's existing Canvas scene. Preserve visual state by creature identity through redraws, reactions, rollback and reset while keeping all gameplay and gameplay randomness unchanged.

## Technical Context

**Language/Version**: TypeScript 6.0.2; Node.js 24.16.x.

**Primary Dependencies**: Phaser 4.1.0, Vite 8.3.8, Playwright 1.65.1; no new runtime dependency planned.

**Storage**: In-memory per-creature view state and bundled static assets; no persistence or backend.

**Testing**: Node `node:test` for deterministic motion, identity, rollback and random-source isolation; Playwright desktop and mobile emulation for rendering, input, effects and fallback; physical desktop/mobile performance measurements; typecheck and production build.

**Target Platform**: Desktop and mobile browsers with mouse, touch and reduced-motion support.

**Project Type**: Single client-side browser game.

**Performance Goals**: On each representative desktop and mobile configuration, at least 95% of foreground frame intervals at or below 33.4 ms in a 30-second 64-creature test. Existing 60 fps target remains desirable. Measure actual conditions; no universal device guarantee.

**Constraints**: Existing 8x8 board, Canvas renderer, level-0 goal of 100, colored tiles, numbered levels 1-4, generation/refill distribution, interaction and effect timing. Visual randomness must never consume the gameplay source or global `Math.random`. State must survive redraws and rollback; successful reset must invalidate it.

**Scale/Scope**: Up to 64 animated level-0 creatures. Resting motion and existing game feedback only; dedicated attack, fearful, dying, exploding, evolving, spawning and move animations remain out of scope.

## Constitution Check

**Before research: PASS.**

- **Explicit, testable gameplay**: No rule changes; verify visual and gameplay outcomes, input, effects and random draws against the feature spec.
- **Mobile-first, cross-input**: Retain the TypeScript browser game and validate responsive mouse and touch behavior, including representative physical-device checks.
- **Engine evaluation**: Retain Phaser 4.1.0, selected in [prototype research](../001-gameplay-prototype/research.md); no new runtime or renderer change is assumed.
- **Mechanics before art**: Preserve independent game rules and numbered placeholders for levels 1-4; the first creature artwork is a separately specified follow-on to the tested prototype.
- **Reproducibility**: Isolate per-creature visual randomness from gameplay randomness and test motion/state lifecycles deterministically.

## Project Structure

### Documentation (this feature)

```text
specs/008-level-zero-animation/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
  └── animation-and-board.md
```

### Source Code (repository root)
```text
docs/art/                    # approved SVG master and resting preview
src/
├── game/                    # existing rules and creature identity
├── main.ts                  # move and reset commit/rollback boundaries
├── view/                    # Phaser board and animation presentation
└── assets/                  # proposed bundled, generated artwork

tests/
├── unit/                    # deterministic visual state and RNG isolation
└── e2e/                     # desktop/mobile visuals and interaction
```

**Structure Decision**: Keep mechanics in `src/game/` unchanged. Add animation state, asset handling, and rendering under `src/view/`, with bundled assets in `src/assets/` and an optional reproducible offline exporter. Use explicit controller callbacks in `src/main.ts` for move and reset commit/rollback boundaries rather than inferring them from redraws.

## Design Sequence

1. Retain the approved art master; produce and verify shared transparent normal/inverted layers and a padded cilia-frame sequence. Preserve individual eye, eyelid and internal-detail motion and provide an atomic load failure fallback to the colored `0` placeholder.
2. Implement a pure, testable per-ID visual state model matching the approved preview's cilia, rotation, blink, gaze and drift behavior. Give each creature independently seeded visual randomness that never calls gameplay RNG or global `Math.random`; use one scene update and honor reduced-motion changes.
3. Compose level-0 artwork in a nested container within the existing stationary colored cell; keep hit testing, drag behavior, selection borders and levels 1-4 unchanged. Preserve existing phases across redraws and flashes.
4. Add explicit view lifecycle methods for provisional move snapshots, commit/rollback, successful reset and failed reset. Retain checkpoint states during effects, prune only after commit, advance view generation only after successful reset, and cancel listeners/tweens on teardown. IDs reused in a new successful reset must not inherit old visual state.
5. Preserve hint and reaction flash phases, falling and convergence using the current timing and signal/epoch guards; test alpha-preserving inverse assets and unaffected cells. Update the mixed-character accessibility label.
6. Add focused rule-independent tests, then run full typecheck, unit, desktop/mobile browser and production build checks. Measure 64-creature performance for at least 30 foreground seconds without filtering stalls; record real desktop/mobile conditions and do not claim physical-device results from emulation.

## Constitution Check After Design

**PASS, subject to implementation and validation.** The rules remain isolated, all interaction and effects are retained, visual randomness is separate, and desktop/mobile verification is planned. The numeric performance target and representative hardware must be measured, not assumed; physical-device checks remain required for completion.

## Complexity Tracking

No constitution exceptions or new runtime dependencies are required. Per-identity view state and explicit transaction boundaries are needed because the current board recreates objects and reset can roll back after advancing its epoch.
