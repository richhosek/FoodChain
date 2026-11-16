# Research: Predator Moves Trigger Eating Reactions

## Move-Time Reaction Candidate Discovery

**Decision**: Keep move-time candidate discovery in `GameLevel.move`, after a legal adjacent swap has produced the post-swap board and before the first call to `resolveWave`. Start with both moved positions. For each moved creature, inspect its post-swap neighbors and add neighboring prey positions when that moved creature is exactly one level higher. Pass this bounded candidate set to `resolveWave`, which evaluates every prey against one snapshot and deduplicates by creature identity.

**Rationale**: `GameLevel.move` owns move legality, the accepted swap, counters, effect sequencing, and the first reaction evaluation. The existing resolver already applies the shared-snapshot rule and suppresses duplicate candidate creatures. Expanding only the initial move candidates fixes the missed predator-triggered case without scanning unrelated pre-existing groups or changing the refill cascade policy.

**Alternatives considered**: Scanning every board cell after every swap was rejected because it could activate unrelated stationary groups, contrary to the approved spec, and makes a local move affect remote creatures. Changing `resolveWave` to infer move causality was rejected because the resolver currently receives explicit candidates and is also used for refill cascades, where candidate semantics differ.

## Refill and Cascade Boundary

**Decision**: Leave post-refill calls to `resolveWave(refill.board, refill.candidates, ...)` unchanged. The new stationary-prey candidate expansion applies only to the initial post-swap wave.

**Rationale**: Refill candidates intentionally include creatures that fell or spawned; stationary creatures should not react merely because the board changed. The new spec asks for reaction when a moved predator enters a prey's group, not for a global rescan after each cascade refill.

**Alternatives considered**: Recomputing all possible prey after refill was rejected because it would alter established cascade rules and might activate unrelated stationary prey.

## Testing and Existing Project Choices

**Decision**: Use deterministic Node unit tests with controlled 8x8 boards, the current injected creature factory, and existing domain test coverage. Run the existing Playwright projects for move/input regressions; no new UI control or animation is required.

**Rationale**: This is a domain reaction-discovery change after a legal move, not an input change. The project already has `boardWith`, position helpers, pure `resolveWave` tests, move/cascade tests, and desktop/mobile Playwright suites.

**Alternatives considered**: No new test framework, engine, dependency, or production fixture API is needed.

## Sources

- Approved behavior and boundaries: [spec.md](spec.md).
- Current move and first-wave ownership: [src/game/level.ts](../../src/game/level.ts).
- Current snapshot and candidate deduplication: [src/game/mechanics.ts](../../src/game/mechanics.ts).
- Neighbor and predator relationship helpers: [src/game/board.ts](../../src/game/board.ts).
- Existing move, overlap, and cascade tests: [tests/unit/domain.test.ts](../../tests/unit/domain.test.ts).
- Existing project engine and test decisions: [specs/001-gameplay-prototype/research.md](../001-gameplay-prototype/research.md).
