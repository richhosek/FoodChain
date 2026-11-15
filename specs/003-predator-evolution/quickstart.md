# Quickstart: Predator Evolution and Apex Formation

Run commands from the repository root with Node.js 24.16.x and the dependencies in the existing lockfile.

## Automated Validation

```powershell
npm ci
npx playwright install chromium
npm run typecheck
node --test tests/unit/domain.test.ts tests/unit/effects.test.ts
npm run test:e2e -- tests/e2e/explosions.spec.ts tests/e2e/gameplay.spec.ts
npm run build
```

Expected coverage after implementation:

- Three predators replace prey at predator level.
- Four or more non-apex predators replace prey at predator level plus one, capped at level 4.
- Apex requires at least four level-4 predators and all four cardinal or all four diagonal positions; other configurations use non-apex rules.
- Apex clears all cells and leaves no replacement. Existing non-apex blast behavior remains unchanged.
- The reaction effect awaits the 1000 ms convergence animation before the existing blast effect and board update; reset/cancellation stops pending motion and temporary copies.
- Cascades, level-zero scoring, turn/free-move counts, and win/loss outcomes remain consistent.

The default browser projects include desktop and mobile viewport configurations. Emulated mobile coverage does not replace physical iOS/Android validation.

## Manual Validation

1. Run `npm run dev` and open its local URL.
2. Trigger a three-predator reaction and verify the replacement matches predator level.
3. Trigger a four-predator non-apex reaction and verify the replacement is capped at level 4; confirm existing blast collateral still occurs.
4. At an interior prey position, test maximum-level predators occupying all four cardinal positions, then all four diagonal positions. Each should apex-clear with no replacement.
5. Test maximum-level groups of four or more with neither complete formation. Confirm ordinary reaction behavior, not apex.
6. Observe that predators visibly converge before the existing reaction flash and board update; the convergence should take 1000 milliseconds.
7. Reset during an animation and verify no stale wave or temporary visual copy appears on the reset board.
8. Repeat on desktop and a mobile viewport; validate physical touch devices when available.

See [the reaction contract](contracts/reaction-and-animation.md) for precise rules and ordering and [the data model](data-model.md) for wave and apex predicates.
