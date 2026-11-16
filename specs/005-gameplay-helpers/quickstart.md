# Quickstart: Gameplay Helpers

Run commands from the repository root with Node.js 24.16.x and the dependencies in the existing lockfile.

## Automated Validation

```powershell
npm ci
npx playwright install chromium
npm run typecheck
node --test tests/unit/gameplay-helpers.test.ts tests/unit/domain.test.ts tests/unit/effects.test.ts
npm run test:e2e -- tests/e2e/gameplay-helpers.spec.ts
npm run build
```

Expected outcomes:

- A lost board (no reaction-producing swap and no free moves) opens a dismissible failure dialog. Dismissing preserves the lost state; Reset starts a playable board.
- A ready board with reaction-producing swaps shows a random legal move hint after 10 idle seconds. The hint is inverse-flashed, does not execute, and consumes no gameplay random draws.
- A ready board with no reaction-producing swaps and free moves remaining flashes the Free Moves counter after 10 idle seconds.
- Move start, resolving cascades, reset, terminal state, and disposal cancel pending/stale hint work.
- Existing mouse/touch interaction and reaction/refill behavior remain unchanged.

Use injected timers and hint randomness in unit tests so the 10-second policy is tested without real-time delays. Playwright should cover visible behavior on both desktop and mobile projects.

## Manual Validation

1. Run `npm run dev` and open the printed URL.
2. Leave a ready board with reacting swaps untouched for 10 seconds; confirm one participating creature flashes without a move or counter change.
3. Make a move before a hint starts, or during a hint; confirm the timer/effect is cancelled and does not affect the resolving or reset board.
4. Use a board with no reacting swaps but remaining free moves; leave it idle for 10 seconds and confirm the Free Moves counter flashes.
5. Exhaust free moves on a board with no reacting swaps; confirm the failure dialog appears. Dismiss it and verify the lost board remains unchanged, then Reset.
6. Repeat visual/layout checks on desktop and a mobile viewport; validate physical devices when available.

See [the UI/gameplay contract](contracts/idle-hints-and-failure-dialog.md) and [the data model](data-model.md) for precise move and timer semantics.
