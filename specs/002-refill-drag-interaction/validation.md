# Validation: Replenishment and Drag Interaction

## Baseline

- Unit suite before feature changes: 20 passed, 4 failed. The failures in `tests/unit/domain.test.ts` were `zero free moves reject non-reacting swaps but permit reacting swaps and prioritize winning`, `goal is counted from collateral and only wins after the refill animation`, `a reached goal stays resolving through a subsequent reaction wave`, and `reset from both terminal states restores a fresh playable session`. Their win expectations assume the former goal of 10; the current goal is 100.
- Browser suite before feature changes: 25 passed, 3 skipped, 12 failed. On both desktop and mobile, the same six tests failed: `plays a move and resets the level`, `collateral level-zero removals count toward the goal`, `apex scores every level-zero creature once`, `winning through the board blocks further moves until reset`, `losing through the board blocks further moves until reset`, and `reset during falling cancels the old refill without stale updates`. These assert the old target or expect a win at the old goal.

## Feature Checks

- Refill boundary regression failed against the original shared sampler, then passed with the refill-only sampler. Five focused refill tests pass, including invalid draws, spawn order, seeded starting/reset generation, and a subsequent reaction wave.
- Drag preview regression failed before implementation. The new drag browser suite passed 52 tests, with 2 desktop skips for touch-specific cases. It covers both configured viewport projects, previews, reversal, confinement, cancellation, reset, mouse/touch interaction, and state isolation.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite reported its existing large-chunk warning.
- `npm run test:unit`: 25 passed, 4 failed; the failures are the same four baseline tests above.
- `npm run test:e2e`: 77 passed, 5 skipped, 12 failed; the failing test names and projects match the baseline above.
- Live browser: desktop board and target 100 observed; mobile-sized viewport loaded without horizontal overflow. Automated mobile Chromium tests cover simulated touch; this is not physical-device verification.
- Physical iOS and Android touch and outside-release checks: unverified, devices unavailable.
- Five-participant preview/reversal task (SC-005): unverified, participants unavailable.