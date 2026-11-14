# Implementation Plan: Single-Level Gameplay Prototype

**Branch**: `development` (current Git branch; Spec Kit resolved feature identifier `001-gameplay-prototype`) | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-gameplay-prototype/spec.md`.

## Summary

Build an 8-by-8, single-level Food Chain browser prototype with colored numbers, adjacent swaps, simultaneous predator reactions, explosions and falling refill. Falling and newly generated creatures can trigger further simultaneous reaction waves. A Phaser view handles interaction and effects while renderer-independent TypeScript rules calculate reproducible outcomes. A scoreboard and reset remain available across desktop and mobile layouts.

## Technical Context

**Language/Version**: TypeScript ES modules compiled to JavaScript for browsers; Node.js 24.16.0 or a later compatible Node 24 release for development and tests.

**Primary Dependencies**: Phaser 4.1.0; TypeScript, Vite, `@types/node`, and Playwright for development, type-checking, build, and browser tests. Pin exact resolved versions and commit the npm lockfile during implementation; verify Phaser declarations against the selected compiler.

**Storage**: In-memory level state only; no account, server, or persistence.

**Testing**: `tsc --noEmit` for application and test types; Node `node:test` and `node:assert` with explicit TypeScript test globs for deterministic rule and timing fixtures; Playwright for desktop and mobile-viewport interaction and presentation; physical-device mobile checks.

**TypeScript Configuration**: Enable `strict`, `isolatedModules`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, and `noEmit`; use ES modules and `moduleResolution: bundler` for Vite. Include browser and test files in type-checking, with appropriate DOM and Node types. Use explicit `.ts` relative imports and `import type` for native Node type stripping. Do not use constructs requiring runtime TypeScript transformation. Vite emits browser JavaScript; run a separate `tsc --noEmit` because Vite does not type-check.

**Target Platform**: Current desktop browsers with mouse and mobile browsers with touch; responsive portrait and landscape layouts.

**Project Type**: Client-side browser game.

**Performance Goals**: Target responsive 60 fps on representative devices; two 250 ms inversion cycles precede clearance while the tab is active. Verify instead of assuming timing under load.

**Constraints**: 64 cells, levels 0-4, three free moves, one target of 10, top-entry random refill, exactly one active resolution, and reset must cancel stale effects. Production art, hex mode and progression are out of scope.

**Scale/Scope**: One player, one board, one level, no backend or online services.

## Constitution Check

**Constitution v2.0.0 recheck: PASS by design, subject to implementation verification.** The plan specifies TypeScript source and browser JavaScript output, both input methods, placeholder creatures, engine comparison, isolated rule tests, and reproducible random sources. Hex gameplay remains future work, not an unreviewed assumption.

**After design: PASS, subject to implementation verification.**

- **Explicit, testable rules**: Independent mechanics tests cover all predator thresholds, board edges, apex, simultaneous landing waves, overlapping removals, collateral scoring, starting-board guarantees, refill, free moves, and reset.
- **Cross-input play**: A shared pointer adapter and responsive layout are checked with desktop mouse and mobile touch; physical device checks supplement emulation.
- **Engine evaluation**: [research.md](research.md) compares Phaser, PixiJS, Excalibur, and DOM/CSS for TypeScript compatibility and the required grid, animation, input and transition capabilities. Phaser is selected; hex rules remain unimplemented.
- **Prototype first**: Colored numbers are used throughout; domain logic imports no Phaser or visual assets.
- **Reproducible behavior**: Random generation is injected, fixtures use scripted or seeded inputs, and animation/reset events have deterministic tests.

No constitution violations or exceptions are required. Passing design review does not claim that future tests or device checks have already passed.

## Project Structure

### Documentation (this feature)

```text
specs/001-gameplay-prototype/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/ui-and-rules.md
  tasks.md                 # generated later by /speckit-tasks
```

### Source Code (repository root, proposed)

```text
index.html                 # page title, scoreboard, reset, game mount
package.json               # npm scripts and pinned dependencies
package-lock.json
tsconfig.json              # strict application and test type-checking
src/
  main.ts                  # initialize view and game controller
  styles.css               # responsive shell and scoreboard
  game/
    creature.ts            # creature identity and level representation
    board.ts               # coordinates, neighbors, gravity and refill
    mechanics.ts           # swaps, reaction snapshots and effect calculation
    random.ts              # weighted random sampling
    level.ts               # turn counters, completion, loss and reset
  view/
    game-scene.ts          # Phaser board, pointer input and visual effects
    scoreboard.ts          # accessible DOM status and reset binding
tests/
  unit/                    # pure rules, random and timing fixtures
  e2e/                     # Playwright desktop and mobile browser scenarios
```

**Structure Decision**: One static client application with separately owned mechanics, state, and presentation modules; no feature source files exist yet. Use a DOM scoreboard and reset for accessible text/control semantics and a Phaser scene for the board. The tree is a proposed implementation layout, not a claim that files already exist.

## Design and Validation Sequence

1. Establish strict TypeScript configuration, deterministic 8-by-8 fixtures, injectable randomness, and independent rule modules before connecting Phaser. Define all state transitions and conflict handling in [data-model.md](data-model.md).
2. Generate starting and reset boards containing all five levels and at least one reacting adjacent swap. Resolve both swapped creatures from one post-swap snapshot; after each refill, resolve eligible falling and newly generated creatures simultaneously against one settled snapshot. Union removals and count every removed level-0 creature once per identity, apply apex precedence, and repeat waves until settled. Check goals and no-move loss after all waves finish; goal completion takes precedence over loss.
3. Implement a Phaser board that renders numbered creatures, accepts mouse/touch swaps, renders inversion and falling effects wave by wave, and ignores stale callbacks after reset. Process long cascades incrementally without an invented wave limit; keep reset available and controls and counters in accessible DOM.
4. Type-check application and test files, then verify rule fixtures, reset races, mobile and desktop input equivalence, timing, layout, and complete/restart flows using [quickstart.md](quickstart.md) and [the contract](contracts/ui-and-rules.md). Record physical-device and participant-test results separately.

## Complexity Tracking

No constitution exceptions or additional architectural layers are needed.
