# Implementation Plan: Replenishment and Drag Interaction

**Branch**: `development` (current Git branch; Spec Kit feature identifier `002-refill-drag-interaction`) | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-refill-drag-interaction/spec.md`.

## Summary

Introduce a refill-only 5:4:3:2:1 probability distribution while preserving starting-board generation. Show a reversible drag preview using Phaser display objects and a single pointer gesture; submit one swap only on release to the existing game controller.

## Technical Context

**Language/Version**: Existing TypeScript ES modules; Node 24.16+ for development and tests.

**Primary Dependencies**: Existing Phaser 4.1.0, Vite, TypeScript, and Playwright; no new runtime dependency is planned.

**Storage**: Existing in-memory game session and ephemeral view gesture; no persistence.

**Testing**: `node:test` for distribution boundaries and state isolation; Playwright desktop and mobile-viewport interaction and visual checks; separate TypeScript type-check.

**Target Platform**: Desktop browsers with mouse and mobile browsers with touch.

**Project Type**: Existing browser game.

**Performance Goals**: Continuous pointer feedback without blocking animation or input; no new measured frame-rate guarantee. Correctness is checked before release, including while dragging.

**Constraints**: Refill probabilities are exact; starting generation, 8-by-8 geometry, legal moves, existing target, scoring, cascades, reset, and tap selection remain unchanged. Preserve current user edits and existing game state semantics.

**Scale/Scope**: Five levels and one active gesture; no new game modes, artwork, or backend.

## Constitution Check

**Before research: PASS.** The feature requirements identify observable rules and a desktop/mobile interaction; existing TypeScript and Phaser choices follow the constitution.

**After design: PASS, subject to verification.** The refill sampler and seeded tests isolate random behavior from rendering; the gesture is a reversible visual preview and uses the existing rules engine on release. Unit and browser tests cover probability boundaries, invalid/cancelled gestures, reset, and both input modes. Placeholder numbers remain in use. The prior engine comparison remains in `specs/001-gameplay-prototype/research.md`; hex mode is outside this feature.

The current 100 target conflicts with some legacy tests and earlier feature documentation. Preserve the user's target and report baseline failures separately; resolving that older contract is not required for this feature.

## Project Structure

### Documentation (this feature)

```text
specs/002-refill-drag-interaction/
  spec.md
  plan.md
  research.md
  data-model.md
  contracts/interaction.md
  quickstart.md
  tasks.md  # created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/game/random.ts          # existing starting sampler and new refill sampler
src/game/board.ts           # generateBoard and refillBoard choose appropriate samplers
src/game/level.ts           # existing authoritative swap, counters, reset and cascades
src/view/board-view.ts      # Phaser objects and reversible pointer gesture
src/main.ts                 # existing move and reset integration
tests/unit/                 # controlled boundary, distribution and state tests
tests/e2e/                  # desktop/touch gesture and rendering tests
```

**Structure Decision**: Extend existing modules instead of adding a new engine or replacing the rules core. A small view-only gesture helper may be introduced if it simplifies deterministic testing. Browser tests may use existing test-only fixtures, never a production board-mutating API.

## Design and Validation Sequence

1. Add deterministic tests for refill boundaries, random draw counts, and unchanged starting/reset board sampling. Implement a refill-specific sampler and retain the existing starting sampler.
2. Test gesture state and browser rendering for movement before release, neighbor slide, origin restoration, direction changes, outside release, cancellation, reset, invalid moves, and tap selection. Keep the authoritative state and random source unchanged during previews.
3. Implement a single-pointer, cancellable preview in the existing view. On release submit at most one original-to-neighbor move; let `GameLevel.move` accept or reject it and redraw the authoritative board. Reset or other input loss invalidates the gesture.
4. Run focused tests, `npm run typecheck`, `npm run test:unit`, `npm run test:e2e`, and `npm run build`. Compare with the recorded 100-target baseline; validate desktop and mobile layouts and document real-device and participant checks separately.

## Complexity Tracking

No constitution exceptions or additional architecture layers are required.
