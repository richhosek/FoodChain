# Data Model: Predator Move Reaction Discovery

## Existing Domain Types

No persistent entities or new runtime state are required. The feature extends candidate selection for an existing accepted move.

### Creature

- `id`: identity used by reaction-wave candidate and removal deduplication.
- `level`: one of the supported levels 0 through 4.

### Position and Board

- `Position`: integer row and column within the 8-by-8 board.
- `Board`: rows of creatures or empty cells.
- `postMoveBoard`: the board after a successful adjacent swap, before any reaction wave is applied.

## Completed Move

- `first`, `second`: the two adjacent positions participating in a legal swap.
- `movedCreatures`: the creatures occupying those positions in `postMoveBoard`; each is a candidate prey under the existing rules.
- A rejected or invalid swap has no post-move candidate set and produces no reaction.

## Reaction Candidate Set

- Begin with both `first` and `second` positions, preserving current moved-prey behavior.
- For each moved creature at either position, examine its in-bounds neighboring positions on `postMoveBoard`.
- Add a neighboring position as a stationary-prey candidate when the neighbor contains a creature exactly one level below that moved creature.
- The resolver verifies the prey has at least three eligible adjacent predators, including diagonals; candidate inclusion alone does not trigger a reaction.
- A stationary prey is eligible for this move only when at least one moved creature is one of its qualifying adjacent predators.
- Candidate positions or creature identities are deduplicated so a prey adjacent to both moved creatures is evaluated once.
- Unrelated stationary prey are not added by this move, even if they already have a qualifying group.

## Reaction Wave and Subsequent Cascades

- The initial post-swap reaction wave evaluates the candidate set against one shared post-move snapshot.
- Existing `resolveWave` semantics determine simultaneous reactions, overlapping removals, replacement, apex precedence, and board result.
- Subsequent refill waves retain their existing candidate source: creatures that fell or spawned during refill. Do not globally rescan stationary prey after refill.

## State Transition

1. Validate and apply the adjacent swap.
2. Discover moved-cell candidates and neighboring prey affected by moved predators.
3. Evaluate all candidates simultaneously against the post-swap snapshot.
4. If no reaction exists, preserve existing free-move handling; otherwise resolve effects and cascades as before.
