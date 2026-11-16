# Quickstart: Predator Moves Trigger Eating Reactions

Run commands from the repository root with Node.js 24.16.x and the dependencies in the existing lockfile.

## Automated Validation

```powershell
npm ci
npx playwright install chromium
npm run typecheck
node --test tests/unit/domain.test.ts tests/unit/move-reaction-candidates.test.ts
npm run test:e2e -- tests/e2e/game.spec.ts tests/e2e/gameplay.spec.ts
npm run build
```

Expected results:

- Moving a third eligible predator next to stationary prey triggers the existing reaction once.
- Moving prey into an existing qualifying predator group continues to trigger a reaction.
- Multiple stationary prey affected by the moved predators are evaluated once each from the same post-move snapshot.
- A nonqualifying move, rejected move, or unrelated stationary predator group produces no added reaction.
- Existing refill candidates, replacement/apex/blast behavior, scoring, cascades, and move counters remain unchanged.

## Manual Validation

1. Run `npm run dev` and open the printed local URL.
2. Use a controlled board with stationary prey and two adjacent predators; move a third eligible predator into another adjacent square and confirm the prey reacts.
3. Compare with moving prey into a group of three eligible predators and confirm both cases resolve identically.
4. Arrange one moved predator to become adjacent to two prey groups. Confirm every qualifying prey is resolved once, while an unrelated stationary reaction group elsewhere remains unchanged.
5. Make a predator move that leaves the group below the threshold and a swap that is rejected by existing move rules; confirm neither triggers an eating reaction.
6. Confirm refill cascades and desktop/mobile controls continue to follow existing behavior.

See [the candidate contract](contracts/move-reaction-discovery.md) for precise scope and [the data model](data-model.md) for candidate selection.
