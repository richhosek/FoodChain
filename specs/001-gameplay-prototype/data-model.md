noA# Data Model: Single-Level Gameplay Prototype

## Creature

- `id`: unique within a level session and stable while moving or falling.
- `level`: integer from 0 to 4. Color and displayed number are view mappings, not rules data.
- Each occupied cell contains one creature. Evolution creates a new identity; removed creatures no longer occupy cells.

## Board

- An 8-by-8 matrix of cells with zero-based row and column coordinates, row 0 at the top.
- Stable, playable boards contain 64 creatures. Intermediate removal and refill snapshots may contain empty cells.
- A swap is permitted only between distinct occupied cells with Manhattan distance 1. Predator neighbors are the eight surrounding in-bounds cells, including diagonals.
- Initial and reset generation uses weighted levels 0-4, conditioned on all five being present and at least one adjacent swap triggering a reaction. Refill uses independent weighted draws from the top; weights and random input are defined in [research.md](research.md).
- Gravity compacts each column downward, preserving survivor order; new creatures occupy vacancies at the top. Render movement from recorded source and destination positions, not by guessing from the final board.

## Level Session

| Field | Initial value | Invariant |
| --- | --- | --- |
| `board` | newly generated board | 8-by-8; full whenever ready |
| `target` | 10 | constant for this prototype |
| `removed` | 0 | nonnegative; counts every removed level-0 creature once, including collateral and apex removals |
| `turns` | 0 | increments once per accepted swap |
| `freeMoves` | 3 | integer from 0 to 3; decremented once for an accepted non-reacting swap |
| `status` | ready | ready, resolving, won, or lost |
| `epoch` | new session identifier | changes on reset; obsolete effects cannot commit |

## Move and Reaction Transaction

1. Validate adjacency and `ready` status. Construct a post-swap snapshot without mutating the committed state.
2. Examine both swapped creatures in that snapshot. For each, count neighbors exactly one level higher; fewer than three causes no consumption. Passive arrangements elsewhere do not react.
3. If neither creature qualifies, reject the swap unchanged when `freeMoves` is zero; otherwise accept, increment turns, and decrement one free move. A reacting swap increments turns but consumes no free move.
4. For each qualifying prey, record its original identity, position, level, predator identities and count. Three predators are removed and produce one creature at prey level + 2. Four or five produce the same evolved level and clear respectively the in-bounds radius-1 or radius-2 square around the center; six through eight clear the rest of the board. All radii include diagonals.
5. If any qualifying reaction uses level-4 predators, an apex event overrides other outcomes, clears all 64 cells, and produces no evolved creatures. Otherwise combine prey, participating predators and explosion areas; remove each existing creature at most once and preserve all newly evolved creatures in their distinct prey cells through simultaneous effects. The explosion area excludes all preserved evolved cells. Count each distinct removed level-0 creature once, whether direct prey, predator, collateral or apex removal.
6. Emit effects for this wave from its snapshot. For explosion-affected cells show inversion for 125 ms, normal for 125 ms, inversion for 125 ms, and normal for 125 ms before removal. Three-predator-only reactions do not produce an explosion. Apply gravity and refill after all simultaneous effects in the wave resolve.
7. On the fully refilled board, evaluate all creatures that fell into a different cell or were newly generated, using the same settled snapshot. Stationary creatures are not evaluated solely because their neighbors changed. Resolve all qualifying creatures simultaneously using steps 4-6, then repeat this check after each subsequent refill. Each wave uses a new snapshot; preserve creations only within their own wave.
8. Continue all waves even if `removed >= 10`. Once a refill produces no eligible reaction, set `won` if `removed >= 10`; otherwise, if `freeMoves == 0` and no adjacent swap yields a reaction, set `lost`; otherwise set `ready`. Goal completion takes priority over loss. Cascades add no turns and spend no free moves.

## Session Transitions and Reset

- `ready -> resolving` on an accepted swap; rejected inputs do not change state, counters or random input.
- `resolving -> ready`, `won`, or `lost` only after all waves and refills settle. Board input is disabled during resolution and after terminal states.
- Reset is accepted from every state. It invalidates the previous epoch, cancels visual timers and tweens, discards pending callbacks and outcomes, and creates a new ready session with default counters.
- Process waves incrementally and yield to the UI; there is no specified cascade limit. Reset must remain available during an arbitrarily long chain.
- No persistent state, extra levels, mating, or hexagonal mode is part of this model.