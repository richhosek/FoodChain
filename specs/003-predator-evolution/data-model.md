# Data Model: Predator Evolution and Apex Formation

## Existing Domain Types

The feature extends the current board and reaction model. It does not add persisted data or change board ownership.

### Creature

- `id`: unique identity used to deduplicate removals and preserve replacement identity.
- `level`: one of the supported levels 0 through 4.
- The fixed maximum level is 4.

### Position and Board

- `Position`: integer row and column within the 8-by-8 board.
- `Board`: rows of creature instances or empty cells.
- All reaction predicates use a stable snapshot; diagonals count as neighbors under the existing eating rule.

## Reaction

- `prey`: consumed creature and its position in the snapshot.
- `predators`: all neighboring creatures exactly one level above the prey, with their snapshot positions.
- `predatorCount`: count of the predators participating in this reaction.
- `predatorLevel`: shared level of the predators; it equals `prey.level + 1`.
- A reaction is eligible when predator count is at least three.

### Replacement Validation

- Exactly three predators: replacement level equals `predatorLevel`.
- Four or more predators in a non-apex reaction: replacement level is `min(predatorLevel + 1, 4)`.
- Apex reactions have no replacement and clear the whole board.
- Replacement is created at the prey position after all removals for the wave are applied.

## Predator Formation and Apex Eligibility

- `orthogonalPositions`: the in-bounds north, east, south, and west cells adjacent to the prey.
- `diagonalPositions`: the four diagonal cells adjacent to the prey.
- `hasOrthogonalFormation`: all four orthogonal positions are occupied by predators participating in this prey's reaction.
- `hasDiagonalFormation`: all four diagonal positions are occupied by predators participating in this prey's reaction.
- `isApex`: predator count is at least four, predator level is the maximum level 4, and either formation is complete.
- Apex eligibility is evaluated independently per reaction from the wave snapshot. The existing wave-level apex precedence remains: when any reaction in a wave is apex, the apex wave clears the entire board and creates no replacement.

## Reaction Wave

- `before`: immutable logical snapshot used to find all reactions.
- `reactions`: all eligible prey evaluated against that same snapshot.
- `removed`: union of prey, predators, and blast collateral, deduplicated by creature identity.
- `creations`: replacement creatures for non-apex reactions only.
- `explosionCells`: positions covered by the existing explosion behavior.
- `after`: resulting board after removals and replacements.
- `apex`: true if a reaction in the wave satisfies the apex predicate; preserves existing whole-board precedence.

## Reaction Cue (Presentation State Only)

- `reaction`: reference to the immutable reaction data for the current effect event.
- `target`: prey cell toward which the predator representation converges.
- `duration`: 1000 ms tween duration as specified.
- `signal`: cancellation signal shared by the move/reset lifecycle.
- Temporary visual copies may represent a predator participating in more than one simultaneous reaction. They have no creature identity in the domain, are excluded from board state/scoring, and are destroyed when the cue completes or is aborted.

## State and Event Ordering

1. A legal move produces a post-swap board and the first reaction snapshot.
2. The rules evaluate all candidate prey simultaneously and calculate removals, creations, and `after`.
3. For each reaction event, the view renders `before`, awaits predator convergence for 1000 ms, then runs the existing blast cue and renders `after`.
4. Only after the effect resolves does the level commit the wave board, refill, and search for the next cascade wave.
5. Abort/reset prevents stale animation completion from applying or rendering an obsolete wave.
