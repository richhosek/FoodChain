# Implementation Plan: Reaction Conflicts and Win Dialog

**Branch**: `007-reaction-conflicts-win` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-reaction-conflicts-win/spec.md`.

## Summary

Select predator reactions from the immutable wave snapshot by highest currently available predator count, reassessing remaining groups and breaking ties by prey position. Preserve selected Apex precedence over melds using the specified provisional and final selection passes. Share pure activation decisions with move prediction and hints. Show an accessible, dismissible "You Won" dialog once per level after the winning cascade settles, without changing the existing target of 100.

## Technical Context

**Language/Version**: TypeScript 6.0.2; Node.js 24.16.x.

**Primary Dependencies**: Phaser 4.1.0, Vite 8.3.8, Playwright 1.65.1; no new dependencies planned.

**Storage**: In-memory level and view state; no backend or persistence.

**Testing**: Node built-in test runner for deterministic rules and lifecycle; Playwright desktop and mobile projects for presentation; `npm run typecheck`, `npm run test:unit`, `npm run test:e2e`, and `npm run build`.

**Target Platform**: Browser on desktop and mobile; mouse, touch and keyboard for relevant controls.

**Project Type**: Single client-side browser game.

**Performance Goals**: Keep selection bounded by the 8x8 board and responsive during move and hint discovery; preserve the existing 1000 ms predator convergence and refill timing. No new numerical latency target is specified.

**Constraints**: Five creature levels; current target 100 level-0 removals; shared wave snapshots; existing refill distribution, free-move accounting, abort/epoch handling and row-major meld selection. Provisional selection must not consume RNG, create IDs, emit effects or mutate the board.

**Scale/Scope**: One player and one 8x8 board. Reaction conflict selection, consistent move discovery, and win dialog lifecycle only; no new level progression, storage, sound, or production cascade cap.

## Constitution Check

**Before research: PASS.**

- **Explicit, testable gameplay**: The specification and two clarifications define deterministic selection, reduced predator groups, Apex/meld precedence, win timing and dismissal. Plan focused automated boundary and interaction tests.
- **Mobile-first, cross-input**: Keep the TypeScript browser application and validate dialog interaction/layout on desktop and mobile, including mouse, touch and keyboard where supported.
- **Engine evaluation**: Retain the already selected Phaser engine and prior evaluation in [the prototype research](../001-gameplay-prototype/research.md); this feature does not introduce an engine.
- **Mechanics before art**: Preserve numbered placeholder creatures; keep the rules independent of view rendering.
- **Reproducibility**: Selection is pure and deterministic; controlled fixtures and seeded random sources exercise effects and cascades without drawing gameplay RNG during prediction.

## Project Structure

### Documentation (this feature)

```text
specs/007-reaction-conflicts-win/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── reaction-and-win.md
```

### Source Code (repository root)

```text
index.html
src/
├── game/board.ts, creature.ts, level.ts, mechanics.ts
├── main.ts
├── styles.css
└── view/board-view.ts
tests/
├── unit/
└── e2e/
```

**Structure Decision**: Extend existing domain, controller and UI boundaries. Place shared pure selection where board prediction and wave resolution can use it without circular imports; preserve separate candidate inputs for moves and refills. Reuse existing dialog styling and lifecycle patterns.

## Design Sequence

1. Implement and test a pure snapshot selector: recompute available groups after each assignment, choose by current count then row/column, reserve prey and predators, and use actual selected predators for all outcomes. Never mutate the input or consume random values.
2. Select melds using existing rules. Execute the exact top-level meld / provisional predator Apex / meld reservation / final predator selection / final Apex sequence documented in [the contract](contracts/reaction-and-win.md). Deduplicate removals and protect creation positions against collateral; do not emit provisional effects.
3. Use the same selection behavior for actual move acceptance, loss detection and hints, preserving moved-prey/moved-predator and refill candidate boundaries. Preserve the existing starting-board generation policy and isolate hint randomness from gameplay randomness. Update convergence so only selected predators animate, while preserving cancellation.
4. Add an accessible win dialog, shown once per epoch after the winning cascade and final render. Close and Escape preserve terminal state; reset closes the modal, invalidates stale effects, and permits a later win. Win remains higher priority than loss.
5. Add focused rule and browser coverage. Update existing tests that depended on shared predator participation, old goal-10 expectations, or uniform boards that now create meld cascades; use deterministic varied refill streams and bounded async waits. Compare with a fresh baseline and report unrelated failures rather than masking them.

## Constitution Check After Design

**PASS, subject to implementation and validation.** Pure rules and deterministic fixtures support reviewable behavior; desktop/mobile checks cover the dialog; current engine, placeholder visuals, target and refill rules remain intact. Physical-device touch validation remains recommended beyond automated emulation.

## Complexity Tracking

No constitution exceptions or additional dependencies are required. The two-pass selection is required by the clarified Apex and ordinary meld precedence rules.
