# Validation: Predator Moves Trigger Eating Reactions

## Baseline Before Implementation

Captured on 2026-11-14 before move-candidate discovery changes.

- Environment: Node.js 24.16.0; installed project dependencies match `package.json`.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite reports the existing large-chunk warning.
- `npm run test:unit`: 34 passed, 4 failed (38 total). Failures are the existing target-10 expectations in `tests/unit/domain.test.ts`: `zero free moves reject non-reacting swaps but permit reacting swaps and prioritize winning`, `goal is counted from collateral and only wins after the refill animation`, `a reached goal stays resolving through a subsequent reaction wave`, and `reset from both terminal states restores a fresh playable session`. The current game target remains 100.
- `npm run test:e2e -- --workers=4`: 81 passed, 5 skipped, 12 failed. The same six target-10/old-goal test cases fail in both desktop and mobile projects: `plays a move and resets the level`, `collateral level-zero removals count toward the goal`, `apex scores every level-zero creature once`, `winning through the board blocks further moves until reset`, `losing through the board blocks further moves until reset`, and `reset during falling cancels the old refill without stale updates`.

These pre-existing failures are retained as a comparison baseline; they are not fixed by changing the target.
