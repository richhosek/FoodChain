# Validation: Predator Evolution and Apex Formation

## Baseline Before Implementation

Captured on 2026-11-14 before changes to the reaction rules or convergence animation.

- `npm run typecheck`: passed.
- `npm run build`: passed; Vite reported the existing large-chunk warning for the bundled Phaser client.
- `npm run test:unit`: 25 passed, 4 failed. The failures are the known goal-10 assumptions in `tests/unit/domain.test.ts`: `zero free moves reject non-reacting swaps but permit reacting swaps and prioritize winning`, `goal is counted from collateral and only wins after the refill animation`, `a reached goal stays resolving through a subsequent reaction wave`, and `reset from both terminal states restores a fresh playable session`. The current target remains 100.
- `npm run test:e2e`: 77 passed, 5 skipped, 12 failed. The same six test cases fail in both desktop and mobile projects due to the prior target change or goal-10 completion expectations: `plays a move and resets the level`, `collateral level-zero removals count toward the goal`, `apex scores every level-zero creature once`, `winning through the board blocks further moves until reset`, `losing through the board blocks further moves until reset`, and `reset during falling cancels the old refill without stale updates`.

These baseline failures are not caused by this feature and must be compared against final results rather than “fixed” by reverting the target of 100.

## Final Validation

- `npm run typecheck`: passed.
- `npm run build`: passed; the existing Vite large-chunk warning remains.
- `npm run test:unit`: 34 passed, 4 failed (38 tests total). The four failures are exactly the baseline goal-10 assumptions listed above. All new replacement, apex-formation, cap, blast, simultaneous-apex, and non-reaction effect tests pass.
- `npm run test:e2e -- --workers=4`: 81 passed, 5 skipped, 12 failed. The 12 failures are exactly the same six goal-10 tests in both desktop and mobile projects as the baseline. No new browser failures remain.
- Focused reaction presentation run `npx playwright test tests/e2e/reaction-convergence.spec.ts tests/e2e/explosions.spec.ts --workers=4`: 14 passed across desktop and mobile, covering intermediate movement, 1000 ms ordering, shared predators, abort cleanup, and existing blast/flash outcomes.
- Physical iOS/Android testing: unavailable in this environment; not claimed as passed.
