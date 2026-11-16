# Data Model: Reaction Conflicts and Win Dialog

## Creature and Snapshot

- A creature has a unique identity and level 0 through 4 at one board position. The board is 8x8; empty cells are permitted during resolution.
- The pre-wave snapshot is immutable throughout discovery, provisional selection, final selection, and outcome calculation. Identity, not appearance or level alone, controls assignments and deduplicated removals.
- Move candidates use the existing moved-prey and moved-predator rules; refill candidates use existing fallen and spawned positions. Neither path activates unrelated prey.

## Predator Candidate and Selection

- A candidate has one prey and all snapshot neighbors exactly one level higher, including diagonals. A candidate is eligible with at least three currently unassigned predators and unassigned prey.
- For a selection pass, start with the supplied reserved identities and no selected reactions. Repeatedly recompute the available predator set for each eligible prey, select the largest set, and break ties by prey row then column. Assign the selected prey and all its currently available predators. Stop when no candidate has three available predators.
- An identity may be prey or predator in only one selected reaction per pass. Reassess from scratch in each new wave and in each provisional/final pass. A reduced group uses its actual selected predators for replacement, explosion, convergence, and Apex formation checks.
- Selection is observational: it neither mutates the snapshot nor creates creatures, draws random values, changes counters, or sends effects.

## Melds, Apex and Wave

- Existing affected 3x3 matching windows are selected row-major, reserving nine identities per non-overlapping meld. A selected level-4 meld causes Apex.
- Otherwise run a provisional predator selection without meld reservations. If it contains Apex, its selected Apex clears the board. If not, discard the selection, reserve selected meld identities, and run a fresh predator selection from the same snapshot. A final selected Apex also clears the board.
- With no Apex, apply final selected reactions and melds together. Deduplicate all removals by creature identity and protect all creation cells against collateral. Collateral removal is not a second reaction participation.
- An Apex wave removes every occupied creature once and creates no replacement. Only the selection responsible for the outcome is eligible to drive reaction presentation; provisional non-Apex selections never animate or score.

## Level and Modal Lifecycle

- `LevelState` retains board, target, removed level-0 count, turns, free moves, status and epoch. The target remains 100.
- A move enters `resolving`, applies each reaction and refill with awaited effects, then continues cascades until stable. Once settled, `removed >= target` sets `won` before checking loss.
- The controller displays the win modal once per won epoch after rendering the completed board. Close or Escape hides it without mutating level state. Reset closes open terminal dialogs, aborts/invalidate old work, starts a new epoch, and allows a later win modal.
- Stale move, reset, modal, hint or effect work must not alter or display on a replacement epoch. A won level remains non-playable until reset; no idle hint runs while terminal.