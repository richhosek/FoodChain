# Data Model: Gameplay Helpers

## Existing Level State

The feature adds no persistent game data. It observes the current level and presents temporary feedback.

- `board`: current 8x8 creature arrangement.
- `freeMoves`: remaining nonreacting swaps.
- `status`: `ready`, `resolving`, `won`, or `lost`.
- `epoch`: invalidates async callbacks and timers after reset.
- `turns`, `removed`, and `target`: remain authoritative and are never changed by hints.

## Reaction-Producing Move

- `first`, `second`: adjacent in-bounds positions swapped by the candidate move.
- `postMoveBoard`: isolated board snapshot after swapping the two creatures.
- `candidates`: the two moved positions, plus neighboring stationary prey positions for which a moved creature is exactly one level higher.
- `isReactionProducing`: at least one candidate has three or more adjacent predators exactly one level above it, including diagonal neighbors.
- Each orthogonal adjacent pair is enumerated once. Candidate prey are deduplicated before evaluation.
- Enumeration is pure: it does not mutate live board state, counters, RNG state, or launch effects.

## Idle Hint Cycle

- `interval`: 10 seconds without a completed move while the level remains ready and settled.
- `hintChoice`: either one randomly selected reaction-producing move or the Free Moves counter when no such move exists and free moves remain.
- `hintRandom`: a random source separate from the gameplay generation/refill random source.
- `activeHint`: a cancellable inverse-flash effect; only one may run at a time.
- After a hint completes, another hint may start only after a further complete 10-second idle interval.
- Move start, reset, resolution, terminal state, or disposal cancels pending timer and active effect.

## Failure Dialog

- `visible`: true only when the level enters `lost` and the failure notice has not been dismissed for that lost state.
- `dismissal`: close control or Escape hides the dialog without changing level status, board, score, or counters.
- Reset closes the dialog and starts a fresh level; stale callbacks from the prior epoch cannot reopen it.

## State and Event Ordering

1. A settled `ready` state starts the idle interval.
2. At 10 seconds, re-check epoch/status and enumerate reaction-producing moves from a snapshot.
3. If any exist, choose one with the isolated hint random source and run the inverse flash on one participating creature.
4. Otherwise, if free moves remain, inverse-flash the Free Moves counter.
5. If none exist and free moves are zero, the level is `lost`; show the failure dialog and do not start a hint.
6. An accepted move cancels hints/timers immediately and starts a new idle interval only after its full reaction/refill cascade settles.
