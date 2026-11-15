# Quickstart: Replenishment and Drag Validation

This guide describes validation after the feature has been implemented. Commands run from the repository root with Node 24.16+ and the existing dependencies.

## Setup and Baseline

```powershell
npm ci
npx playwright install chromium
```

Before changing the feature, run the existing unit and browser suites and record failures. The previous run had four unit failures because the user's goal is now 100 while older fixtures expect 10; do not revert the goal. Compare actual current results with that baseline.

## Automated Checks

```powershell
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
```

Add focused tests for every refill boundary and exactly one draw per spawn, unchanged initial generation, and deterministic cascades using the new refill weights. Browser checks must cover visible movement and neighbor slide before release, return to origin, switching direction, edge confinement, out-of-bounds release, invalid swap, pointer cancellation, reset during drag, stale release, tap selection, and matching mouse/touch outcomes. Test methods should follow `specs/002-refill-drag-interaction/contracts/interaction.md` without exposing production fixture controls.

Vite's build does not replace the type-check. Report pre-existing failures separately from new regressions; do not mark a failing test or an unavailable device check as passed.

## Manual Validation

1. Run `npm run dev`, open the printed URL, and verify the current game target and board appear normally.
2. Drag a creature toward an adjacent cell without releasing. Confirm it follows the pointer and the neighbor slides into the origin; return to the origin and confirm the preview reverses with unchanged counters.
3. Drag toward different neighbors, then beyond the board or legal range, and release. Confirm only the final constrained neighbor can swap, and only one move is counted when accepted.
4. Reset during a drag and release afterward; confirm the new board and counters remain unchanged. Test a rejected non-reacting drag when no free moves remain, and confirm tap selection still works.
5. Repeat on desktop and a mobile viewport; validate actual touch tap/drag and release outside the board on iOS and Android devices when available. Run the five-participant preview/reversal task for SC-005 if participants are available; otherwise report it as unverified.

High-level Playwright touchscreen input emulates taps, not native drag. Simulated touch events or Chromium CDP checks are useful but do not substitute for physical device validation.