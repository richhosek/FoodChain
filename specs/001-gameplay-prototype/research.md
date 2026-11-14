# Research: Single-Level Gameplay Prototype

## Browser Game Engine

**Decision**: Use Phaser 4.1.0 for the prototype's board presentation, pointer input, and animations; keep game rules in independent TypeScript modules compiled to browser JavaScript. Install the exact version and commit the resulting lockfile during implementation.

**Rationale**: Phaser provides a unified mouse/touch input API, sprite frame animations, tweens, scenes and camera transitions. Its tilemap API supports orthogonal and hexagonal orientations, including coordinate conversion. The prototype can render its small square board without a tilemap; future hexagonal gameplay and its nonrandom replenishment rules still require a separate specification and implementation. Phaser adds a larger dependency than the present board strictly needs, but reduces later integration work for creature and screen animation.

**Alternatives considered**:

| Candidate | TypeScript support | Input and animation | Square and future hex grids | Tradeoff |
| --- | --- | --- | --- | --- |
| Phaser 4.1.0 | Published package includes type declarations | Unified mouse/touch input, sprite animations, tweens and scenes | Square and hex tilemap support; game rules remain custom | Full framework, more weight and API surface |
| PixiJS 8 | Version 8.0.0 package includes type declarations | Mouse/touch events and animated sprites; custom or additional tween and screen management | Custom square and hex layout | Lean renderer but more integration work |
| Excalibur | Written in TypeScript; version 0.32.0 package includes declarations | Mouse/touch pointers, sprite animations, actions and scene transitions | Square tilemaps; hex tilemaps not supported out of the box | Good 2D engine, more work for future hex rendering |
| Browser DOM and CSS only | TypeScript DOM library declarations; compile to JavaScript | Native input and CSS animation | Custom square and hex layout | Smallest initial build, but sprite animation and transitions would need more custom integration |

**Sources**: [Phaser 4.1.0 package metadata](https://registry.npmjs.org/phaser/4.1.0), [Phaser declarations](https://github.com/phaserjs/phaser/blob/v4.1.0/types/phaser.d.ts), [Phaser input](https://docs.phaser.io/phaser/concepts/input), [animations](https://docs.phaser.io/phaser/concepts/animations), [tweens](https://docs.phaser.io/phaser/concepts/tweens), [scenes](https://docs.phaser.io/phaser/concepts/scenes), [tilemap API](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap), [PixiJS 8.0.0 package](https://github.com/pixijs/pixijs/blob/v8.0.0/package.json), [PixiJS introduction](https://pixijs.com/8.x/guides/getting-started/intro), [Excalibur 0.32.0 package](https://github.com/excaliburjs/Excalibur/blob/v0.32.0/package.json), [Excalibur tilemaps](https://excaliburjs.com/docs/tilemap/), [Excalibur transitions](https://excaliburjs.com/docs/transitions). Phaser and PixiJS are MIT-licensed; Excalibur is BSD-2-Clause. Verify and preserve dependency notices when distributing. Declaration availability is not a consumer compiler compatibility guarantee; verify the selected Phaser and TypeScript versions together during implementation.

## Build and Verification

**Decision**: Use TypeScript ES modules, npm and Vite for development and production builds, `tsc --noEmit` for type-checking application and tests, Node's built-in `node:test` and `node:assert` for rules, and Playwright for browser-level checks. Use Node 24.16.0 or a later compatible Node 24 release and lock dependencies at implementation time. Run TypeScript unit tests with the explicit quoted pattern `node --test "tests/unit/**/*.test.ts"` and assert that tests are actually discovered.

**Rationale**: Vite transpiles TypeScript but does not type-check, so a separate compiler check is required. Native Node type stripping runs erasable TypeScript but does not type-check or honor tsconfig paths; use explicit `.ts` imports, `import type`, and `erasableSyntaxOnly`. Node 24.16.0 is present in the current environment. Unit tests can inject deterministic random values and controlled animation clocks; browser tests cover presentation, pointer input and reset behavior. Playwright touch emulation is limited to taps, so real mobile devices remain necessary for validating any drag gesture and mobile-browser behavior.

**Alternatives considered**: CDN scripts and opening the page directly avoid a build step but weaken dependency reproducibility and local module testing. Vitest supports TypeScript and Vite but adds a test dependency when Node's runner already suffices. Browser-only tests make rule edge cases slower and harder to reproduce.

**Sources**: [Node 24 TypeScript support](https://nodejs.org/download/release/v24.12.0/docs/api/typescript.html), [Node 24 test runner](https://nodejs.org/download/release/v24.12.0/docs/api/test.html#running-tests-from-the-command-line), [Vite TypeScript behavior](https://vite.dev/guide/features.html#typescript), [Playwright touchscreen limitations](https://playwright.dev/docs/api/class-touchscreen), [Vite getting started](https://vite.dev/guide/).

## Rules, Randomness and Animation

**Decision**: Evaluate each simultaneous reaction wave against one immutable snapshot and produce its removals, creations and effects incrementally. The first snapshot follows the swap; later snapshots follow a full refill and consider all fallen and newly generated creatures. Repeat until no candidate reacts, even after the goal is met. Count every removed level-0 creature once by identity, including collateral and apex removals. Inject random values into starting generation and top-edge refill. Use decreasing provisional weights 40:27:17:10:6 for levels 0 through 4, with starting samples conditioned on all five levels being present and at least one valid reacting adjacent swap; record that these are tuning values rather than design commitments. Refill draws independently from the unconditioned weighted distribution.

**Rationale**: Snapshot-based reactions avoid order-dependent overlaps, seeded or scripted inputs make tests repeatable, and separate wave effects let the view animate without changing rule outcomes. Generate candidate boards with weighted draws and accept only those satisfying both starting conditions; the move check must not consume randomness or mutate state. Conditioning changes the accepted boards' marginal distribution and removes cell independence, so verify that lower levels remain more likely on accepted boards instead of assuming the original weights still apply. Use fixed traversal and draw order for reproducible tests.

Rejection sampling has no fixed completion bound, and random cascades can be arbitrarily long; a finite board alone does not prove a cascade will terminate. Process both generation and waves in cancellable batches so the UI remains responsive and reset can invalidate pending work. Do not silently force a board, change refill weights, or cut off a cascade. Test long scripted sequences and cancellation; revisit termination or generation policy with the project owner if bounded completion is required.

**Alternatives considered**: Rendering-driven mutations couple rules to animation timing; unseeded randomness makes rare edge cases hard to replay; uniform distribution conflicts with the specified rarity ordering.

**Decision**: Animate each explosion as inverted/normal/inverted/normal phases of 125 ms each, then clear, then animate gravity and top-entry refill. Treat 500 ms as a target in the active foreground; browser scheduling and background throttling can delay rendering. An epoch token and cancelled scene timers/tweens prevent callbacks from a previous game updating reset state.

**Rationale**: The timing matches the spec's two 250 ms cycles, while delayed clearance preserves visible cause and effect. Reset must remain valid during any phase.

**Alternatives considered**: Clearing before the flash hides the affected creatures; relying on cancellation alone without invalidating old callbacks risks stale updates.