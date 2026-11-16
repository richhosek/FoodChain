# Implementation Plan: Gameplay Helpers

**Branch**: `005-gameplay-helpers` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-gameplay-helpers/spec.md`.

## Summary

Add a dismissible failure dialog for the existing lost state and an idle helper that waits 10 seconds after the board is ready. If reaction-producing swaps exist, choose and inverse-flash a random valid move without changing gameplay state or consuming its random source. If none exist but free moves remain, flash the Free Moves counter. Keep legal move discovery consistent with feature 004's moved-prey and moved-predator reaction rules.

## Technical Context

**Language/Version**: TypeScript 6.0.2; Node.js 24.16.x for tests and tooling.

**Primary Dependencies**: Phaser 4.1.0; Vite 8.3.8; Playwright 1.65.1.

**Storage**: In-memory game state only; no persistence or backend.

**Testing**: `npm run typecheck`; Node `node:test` for legal-swap enumeration, timer decisions, and state transitions; Playwright desktop/mobile tests for modal and flash behavior; `npm run build`.

**Target Platform**: Desktop and mobile web browsers.

**Project Type**: Client-side browser game.

**Performance Goals**: Inactivity timer fires at 10 seconds after a ready state is established. Legal reaction swaps are enumerated over the 8x8 board only at the hint deadline; no continuous board scan is needed.

**Constraints**: Hints are advisory and must not consume the gameplay random source or change game state. Timers and animations must be cancelled on move, reset, resolve, terminal state, and disposal. A failure dialog appears only for the existing lost condition (no reaction-producing swap and no free moves). Existing 1000 ms predator convergence and all reaction outcomes remain intact.

**Scale/Scope**: One player and one board. Add legal reaction-swap discovery, an inactivity timer, inverse-flash hints, and a dismissible lost-state dialog. Do not change move rules, free-move quantity, scoring, or level progression.

## Constitution Check

**Before research: PASS.**

- **Explicit, testable gameplay rules**: The spec defines lost-state trigger, 10-second timing, hint priority, random legal move, dismissal behavior, and cancellation cases.
- **Mobile-first cross-input play**: Hints and the dialog operate equally after mouse or touch gameplay; both browser projects will validate behavior and layout.
- **Engine evaluation**: Phaser 4.1.0 remains the previously selected renderer; no new engine choice is required. The dialog and counter remain accessible DOM UI.
- **Mechanics before art**: The existing numbered creatures are retained; hints use the established inverse visual state.
- **Reproducibility**: Legal swaps and hint decisions will be testable with controlled board and hint-random inputs; hint choice cannot consume gameplay randomness.

No constitution violations or exceptions are required.

## Project Structure

### Documentation (this feature)

```text
specs/005-gameplay-helpers/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── idle-hints-and-failure-dialog.md
```

### Source Code (repository root)

```text
index.html
src/
├── main.ts
├── styles.css
├── game/
│   ├── board.ts
│   ├── level.ts
│   └── mechanics.ts
└── view/
    ├── board-view.ts
    └── effects.ts
tests/
├── unit/
│   ├── domain.test.ts
│   ├── effects.test.ts
│   └── gameplay-helpers.test.ts
└── e2e/
    ├── game.spec.ts
    └── gameplay.spec.ts
```

**Structure Decision**: Keep reaction-swap enumeration pure in the game domain, sharing the moved-prey/moved-predator candidate rules with `GameLevel.move` and loss detection. Keep idle timing and modal lifecycle in `src/main.ts`; reuse the existing inverse-flash effect in `src/view/effects.ts`/`src/view/board-view.ts` and the Free Moves counter in the DOM. Add the dismissible dialog to `index.html` and responsive styling to `src/styles.css`. Do not add a dependency or production fixture hook.

## Design Sequence

1. Extract a pure candidate-discovery function for a proposed adjacent swap. It returns the two moved positions plus neighboring stationary prey for which a moved creature is exactly one level higher. Use it both for the accepted move's first reaction wave and for reaction-producing swap enumeration, so the hint and actual move agree with feature 004. Preserve existing refill candidates.
2. Add a pure enumerator for reaction-producing adjacent swaps. It checks each orthogonal pair once, applies the proposed swap to a cloned board, and confirms that at least one discovered candidate has three or more higher-level neighbors. Do not instantiate replacement creatures or mutate board/random state during enumeration.
3. For hint selection, use a separate injected hint-random source from `GameLevel.random`; choose uniformly from the enumerated swaps and deterministically choose one participating moved creature to flash. Never call the gameplay random source for hints.
4. In `src/main.ts`, own one cancellable idle timer. Start it only when the level is ready and view effects have settled; after 10 seconds, show a legal-move hint if available, otherwise flash Free Moves when free moves remain. After a hint, schedule at most one more hint per full idle interval. Cancel or invalidate the timer and current visual hint as soon as a move starts, reset begins, the level becomes terminal, or the view is disposed.
5. Add an accessible native dialog in `index.html` with a clear close control and Escape dismissal. Show it once when the level transitions to `lost`; dismissing leaves the level lost, and Reset closes it before generating a fresh board.
6. Verify timer policy, legal move enumeration including moved predators, and hint-random isolation in unit tests. Verify 10-second delay, repeated interval, hint cancellation, free-move flash, terminal modal/dismiss/reset, and desktop/mobile layout in Playwright. Keep timing testable with injected fake timers/wait functions rather than waiting 10 real seconds in unit tests.

## Constitution Check After Design

**PASS, subject to implementation verification.** The rules remain in TypeScript domain code, hint randomness is isolated from gameplay randomness, presentation reuses the established renderer/effect layers, and both desktop/mobile browser projects are included. No new dependencies or art are needed.

## Complexity Tracking

No constitution exceptions or additional architectural layers are needed.
