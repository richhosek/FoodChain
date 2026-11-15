# Implementation Plan: Predator Evolution and Apex Formation

**Branch**: `003-predator-evolution` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-predator-evolution/spec.md`.

## Summary

Change reaction replacements to depend on predator count, cap replacements at level 4, and restrict the existing apex clear to maximum-level predators in a complete cardinal or diagonal formation. Add a pre-reaction predator convergence cue lasting 1000 milliseconds. Keep reaction decisions in renderer-independent game rules and run the visual cue in the existing awaited Phaser reaction-effect path.

## Technical Context

**Language/Version**: TypeScript 6.0.2; Node.js 24.16.x for tests and tooling.

**Primary Dependencies**: Phaser 4.1.0; Vite 8.3.8; Playwright 1.65.1.

**Storage**: In-memory game state; no persistence or backend.

**Testing**: `npm run typecheck`; Node `node:test` focused rule/effect tests; Playwright desktop and mobile projects through `npm run test:e2e`; `npm run build`.

**Target Platform**: Desktop and mobile web browsers; Chromium-based automated coverage plus available physical-device checks.

**Project Type**: Client-side browser game.

**Performance Goals**: Preserve responsive board and cascade processing. Configure the convergence cue for 1000 ms and await it before reaction effects. Browser rendering remains frame-scheduled, but the duration spans many display frames at typical refresh rates.

**Constraints**: 8x8 board; creature levels 0 through 4; at least three adjacent one-level-higher predators trigger a reaction; simultaneous reactions use a shared snapshot; reset/cancellation must prevent stale visual updates. Apex keeps its existing full-board clear without replacement and additionally requires at least four level-4 predators plus a full four-cardinal or four-diagonal formation.

**Scale/Scope**: One player and one board. Change reaction level results, apex eligibility, and reaction presentation only; keep refill distribution, target, move rules, and non-apex blast thresholds unchanged.

## Constitution Check

**Before research: PASS.**

- **Explicit, testable gameplay rules**: The approved spec defines predator thresholds, cap, apex formation, existing apex outcome, and animation ordering; the design calls for boundary, interaction, and cascade tests.
- **Mobile-first cross-input play**: No input changes are planned. Existing mouse/touch behavior and responsive layouts remain covered by both Playwright projects; physical-device checks are a follow-up validation where devices are available.
- **Engine evaluation**: Phaser 4.1.0 was selected after comparing Phaser, PixiJS, Excalibur, and DOM/CSS in [the prototype research](../001-gameplay-prototype/research.md). This feature extends the existing Phaser view; no engine change is proposed.
- **Mechanics before art**: Preserve colored-number placeholder creatures. No production art is required for the rules or convergence cue.
- **Reproducibility**: Keep mechanics pure and test with deterministic boards; animation cancellation uses the existing `AbortSignal` effect lifecycle.

No constitution violations or exceptions are required. The exact 1000 ms request is retained and validated as a visible pre-reaction interval.

## Project Structure

### Documentation (this feature)

```text
specs/003-predator-evolution/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── reaction-and-animation.md
```

### Source Code (repository root)

```text
src/
├── game/
│   ├── creature.ts
│   ├── mechanics.ts
│   ├── level.ts
│   └── board.ts
├── view/
│   ├── board-view.ts
│   └── effects.ts
└── main.ts
tests/
├── unit/
│   ├── domain.test.ts
│   └── effects.test.ts
└── e2e/
    ├── explosions.spec.ts
    └── gameplay.spec.ts
```

**Structure Decision**: Keep the current single client application. Extend `src/game/mechanics.ts` for replacement and apex rules; extend `src/view/board-view.ts` and, if useful for deterministic cancellation tests, `src/view/effects.ts` for the convergence cue. Add focused assertions to existing unit and browser test files or narrowly scoped new files. Do not move game state into Phaser or add dependencies.

## Design Sequence

1. Update `resolveWave` to evaluate each eligible prey against the immutable pre-reaction snapshot. Compute apex per prey from predator count, level, and the complete cardinal/diagonal position sets. Apply an apex wave as the existing full-board clear with no creations; otherwise create each replacement at predator level for three predators or one level above for four or more, capped at level 4. Preserve current non-apex blast thresholds and removal deduplication.
2. Animate before committing the reaction outcome. `GameLevel.move` already awaits the reaction effect before setting current board to `wave.after`; use this boundary to render `wave.before`, converge involved predator visuals with a 1000 ms Phaser tween, await completion with the reaction `AbortSignal`, then continue the existing flash and render `wave.after`. Do not change score, random draws, move counters, or state during the cue.
3. Keep simultaneous rule evaluation unchanged. A logical predator can participate in more than one reaction. For presentation, animate its real view toward the first reaction target and use temporary visual copies for any additional reaction targets; copies must never enter game state or affect scoring.
4. Validate deterministic rules, cancellation and reset, and browser ordering. The cue duration is 1000 ms; verify that the animation is visibly in progress before it completes and that reset aborts both motion and temporary copies.

## Constitution Check After Design

**PASS, subject to implementation verification.** The domain remains testable without Phaser, random behavior is unchanged and deterministic in tests, presentation remains in the view layer, and both desktop/mobile browser suites are included. The 1000 ms convergence cue provides a perceptible motion interval while preserving the requested reaction ordering.

## Complexity Tracking

No constitution exceptions or additional architectural layers are needed.
