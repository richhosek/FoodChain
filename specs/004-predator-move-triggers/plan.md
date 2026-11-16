# Implementation Plan: Predator Moves Trigger Eating Reactions

**Branch**: `004-predator-move-triggers` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-predator-move-triggers/spec.md`.

## Summary

Extend successful swap reaction discovery so it checks the moved creatures and stationary prey for which a moved creature is now one of the eligible predators. Deduplicate affected prey and resolve the expanded candidate set using the existing post-swap snapshot. Keep reaction thresholds, replacement/apex/blast outcomes, scoring, refill, cascades, and move accounting unchanged.

## Technical Context

**Language/Version**: TypeScript 6.0.2; Node.js 24.16.x for tests and tooling.

**Primary Dependencies**: Phaser 4.1.0; Vite 8.3.8; Playwright 1.65.1.

**Storage**: In-memory game state; no persistence or backend.

**Testing**: `npm run typecheck`; Node `node:test` for deterministic rule and move tests; Playwright for desktop/mobile regression; `npm run build`.

**Target Platform**: Desktop and mobile web browsers; the rule change is input-agnostic because it applies after a completed legal swap.

**Project Type**: Client-side browser game.

**Performance Goals**: Candidate discovery is bounded to the two moved cells and their immediate neighbors on an 8x8 board; preserve current per-move responsiveness and avoid scanning/triggering unrelated board groups.

**Constraints**: Reactions use at least three adjacent predators exactly one level above prey, including diagonals. Reactions from one move share the same post-swap snapshot and each prey is evaluated once. Only successful swaps initiate the check. Existing feature-003 replacement levels, apex formation, 1000 ms cue, blasts, scoring, cascades, target 100, and move accounting remain unchanged.

**Scale/Scope**: One player and one 8x8 board. Modify move-time candidate discovery and focused regression tests only; do not change refill candidate behavior or unrelated stationary reactions.

## Constitution Check

**Before research: PASS.**

- **Explicit, testable gameplay rules**: The spec identifies the qualifying predator relation, moved-prey compatibility, snapshot consistency, deduplication, and unrelated-prey exclusion.
- **Mobile-first cross-input play**: This change occurs after a committed swap and does not change mouse, touch, or drag input. Existing desktop and mobile suites remain part of validation.
- **Engine evaluation**: Phaser 4.1.0 was selected after comparison in [the prototype research](../001-gameplay-prototype/research.md). No engine-dependent work is required for this domain-rule change.
- **Mechanics before art**: Reaction selection remains renderer-independent and existing numbered placeholders are unchanged.
- **Reproducibility**: Controlled board fixtures and deterministic factories will verify moved-predator and multi-prey cases.

No constitution violations or exceptions are required.

## Project Structure

### Documentation (this feature)

```text
specs/004-predator-move-triggers/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── move-reaction-discovery.md
```

### Source Code (repository root)

```text
src/game/
├── level.ts
├── board.ts
└── mechanics.ts
tests/
├── fixtures/boards.ts
├── unit/domain.test.ts
├── unit/move-reaction-candidates.test.ts
└── e2e/gameplay.spec.ts
```

**Structure Decision**: Keep discovery at the game-state boundary in `src/game/level.ts`, which knows the two swapped positions and owns the accepted move. Reuse board neighbor helpers in `src/game/board.ts` as appropriate and pass a deduplicated candidate list to `resolveWave` in `src/game/mechanics.ts`. Keep the rule independent of Phaser. Extend `tests/fixtures/boards.ts` and add focused unit coverage; preserve existing browser interaction suites.

## Design Sequence

1. After `swapBoard` succeeds, begin the candidate list with both swapped positions. For each moved creature, inspect its post-swap neighbors and add a neighboring prey position when the moved creature is exactly one level above that prey. Pass the combined candidates to `resolveWave`; its snapshot evaluation and identity-based deduplication remain authoritative.
2. Do not trigger a stationary prey merely because it already has a qualifying group elsewhere. It is considered by this move only when one of the moved creatures participates as its adjacent predator. No candidate discovery runs for an invalid/rejected move.
3. Leave the refill loop unchanged: after gravity/refill, its existing falling/spawn candidates continue to control subsequent cascade reactions.
4. Add deterministic tests for moving a third predator into a stationary prey group, moving prey into a group, multiple affected prey, duplicate candidates, nonqualifying moves, and unrelated stationary groups. Verify old swap and cascade tests remain valid.
5. Run focused unit tests, full unit/browser suites, typecheck, and build. Compare failures with the existing target-100 baseline recorded under `specs/003-predator-evolution/validation.md`; do not change goal-100 behavior.

## Constitution Check After Design

**PASS, subject to implementation verification.** The rules remain in TypeScript domain code, use deterministic fixtures, preserve the current engine/view separation, and are validated across existing desktop and mobile browser projects. No new dependency or art is required.

## Complexity Tracking

No constitution exceptions or additional architectural layers are needed.
