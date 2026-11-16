# Quickstart: Reaction Conflicts and Win Dialog

## Prerequisites

Use Node.js 24.16.x and install the locked dependencies from the repository root. Install Playwright's Chromium browser for browser validation.

```powershell
npm ci
npx playwright install chromium
```

## Automated Validation

Run the focused conflict-selection and win-dialog tests, then run the full checks:

```powershell
node --test tests/unit/activation-selection.test.ts tests/unit/reaction-conflicts.test.ts tests/unit/nine-creature-meld.test.ts
npx playwright test tests/e2e/reaction-convergence.spec.ts tests/e2e/win-dialog.spec.ts --workers=2
```

```powershell
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
```

The focused checks should exercise five-versus-four and five-versus-three conflicts, reduced predator counts and changing priority, equal-count tie order independent of candidate order, prey/predator cross-role conflicts, disjoint groups, collateral, cascades, and both Apex/meld selection passes. Verify predictions, accepted moves, lost state, hints, scoring, refill, and cancellation agree with [the contract](contracts/reaction-and-win.md).

Desktop and mobile browser checks should verify the modal appears after the final winning cascade, is accessible and dismissible with its close control and Escape, preserves the completed state, closes on reset, can reappear for a later win, and never appears from cancelled or stale work. Use touch interaction in the mobile project where supported.

Legacy goal-10 assumptions, shared-predator expectations and uniform fixtures were updated for the current rules. See [validation.md](validation.md) for results. Avoid constant-value refill streams in fixtures that can cascade indefinitely; do not introduce a production cascade cap to make tests pass.

## Manual Validation

1. Run `npm run dev` and open its reported local URL on desktop and mobile.
2. Exercise conflicting predator groups and observe that a creature converges toward only one prey in a wave; verify remaining predators can form another eligible reaction.
3. Reach the existing 100-creature goal and wait for all effects to settle. Confirm "You Won" appears once, dismiss it, inspect the unchanged board, then reset and play a fresh level.
4. Verify the dialog fits and can be dismissed using the available input method at both viewport sizes. Use physical touch devices when available.

See [the data model](data-model.md) for identity and lifecycle details.