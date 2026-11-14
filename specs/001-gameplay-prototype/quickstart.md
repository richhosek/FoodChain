# Quickstart: Prototype Validation

This guide describes the planned commands and checks **after implementation**. The project and its npm scripts do not exist yet; this planning step does not install dependencies or build the game.

## Prerequisites and Setup

- Node.js 24.16.0 or a later compatible Node 24 release and npm; Node 24.16.0 was available when this plan was written.
- A current desktop browser. For the mobile release check, use an iOS and an Android device with touch browsers where available.
- From the repository root, after the implementation has created the lockfile:

```powershell
npm ci
npx playwright install chromium webkit
```

The implementation must define `dev`, `typecheck`, `build`, `test:unit`, and `test:e2e` npm scripts. `typecheck` runs `tsc --noEmit` over application and test files; `test:unit` runs `node --test "tests/unit/**/*.test.ts"` with Node's native type stripping; `test:e2e` invokes Playwright. Tests must use erasable TypeScript syntax and explicit relative `.ts` imports. The browser test configuration starts its own local server.

## Automated Checks

```powershell
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
```

Expect type-checking and all tests to pass, a nonzero unit-test count, and the production build to complete. Vite's build transpiles but does not replace type-checking. Unit fixtures must cover each predator threshold, boundaries, shared predators and overlapping effects, apex precedence, direct and collateral level-0 removal counted once, multiple landing waves, stationary exclusions, win only after settling, gravity order, free-move exhaustion, animation phase scheduling, and reset during a long cascade. Starting and reset generation tests must verify five levels and a reacting swap across reproducible seeds, and check the accepted-board rarity ordering separately from refill weights. Browser tests must exercise the interface contract in `specs/001-gameplay-prototype/contracts/ui-and-rules.md` at desktop and mobile viewport sizes, including tap selection and scoreboard/reset behavior. Deterministic fixtures must be test-only and not expose a production board-mutating interface.

## Manual Checks

1. Run `npm run dev`, then open the local URL printed by Vite. Verify `Food Chain`, 64 numbered creatures, all five levels, goal 10, progress 0, turns 0, free moves 3 and Reset. Verify a reacting adjacent swap exists on fresh and reset boards using the test fixtures.
2. Use a mouse to swap adjacent creatures and verify the corresponding counters. Repeat using touch on a mobile device; test both tap-to-select and drag. Check portrait and landscape layouts for legibility and overlap.
3. Use a known test fixture from the automated suite to observe four- and five-predator explosions: two 250 ms inversion cycles occur before clearance, then columns fall and new creatures enter from the top. Confirm unaffected cells stay intact unless gravity moves them.
4. Reset during a flash and during falling; verify the new board and initial counters remain unchanged after the old animation would have finished.
5. With known fixtures, remove the tenth level-0 creature through direct consumption or an explosion and verify the win appears only after every subsequent reaction and refill settles; check that each removed creature counts once. Separately exhaust free moves with no reacting swap and observe the loss. Reset from both states.
6. In a short usability session, ask five participants to locate the goal, progress, turn and free-move counts and reset without assistance; at least four must succeed for SC-004.

Playwright's touchscreen API emulates taps, not native drag. Browser emulation and Playwright WebKit do not replace checks on actual mobile browsers and devices. Record unavailable checks as unverified, not passed.