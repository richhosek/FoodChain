# Validation: Reaction Conflicts and Win Dialog

## Baseline (2026-11-15)

- Node v24.16.0 and npm 11.13.0; dependencies already installed. `npm run typecheck` passed.
- `node --test --test-timeout=5000 "tests/unit/**/*.test.ts"` failed on existing domain, hint, move-candidate and refill cases; two domain cases hit the five-second per-test timeout. Several fixtures use uniform boards or the former target of 10.
- `npx playwright test --global-timeout=60000` timed out after 60 seconds with failures in existing explosion, game, gameplay-helper, move and terminal cases; remaining tests did not all complete. The run used 16 workers and included desktop and mobile projects.
- Existing ignore rules cover Node, build, browser-test and editor outputs. No dependency installation was needed.

## Implementation Validation

- `npm run test:unit`: 84 passed, 0 failed.
- `npx playwright test --workers=2 --global-timeout=360000`: 119 passed, 5 skipped across desktop and mobile projects. This run preceded the final removal of the unused convergence-copy path.
- `npx playwright test tests/e2e/reaction-convergence.spec.ts --workers=2` after that removal: 4 passed across desktop and mobile, including 1000 ms convergence and abort restoration.
- `npx playwright test tests/e2e/win-dialog.spec.ts --workers=2`: 10 passed across desktop and mobile, covering dismissal, final render, reset and cancellation.
- `npm run typecheck` and `npm run build`: passed after the final convergence change; the build retains Vite's existing large-chunk warning.
- Existing target-10, shared-predator and uniform-board fixture assumptions were updated. The running app was inspected at its current desktop viewport; automated mobile emulation covers touch. Manual goal-reaching and physical-device testing remain outstanding.
- An Apex predator reaction cannot physically share participants with an ordinary 3x3 meld under the current adjacency and level rules; tests verify the geometry, legal co-occurrence and both selection passes.