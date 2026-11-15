# Reaction and Animation Contract

This contract describes observable reaction behavior for players and rule-level outcomes for tests. The rules are independent of renderer timing.

## Eating and Replacement

- A prey is eaten by at least three neighboring creatures exactly one level higher, including diagonal neighbors.
- Three predators replace the prey with a creature at the predator level.
- Four or more predators in a non-apex reaction replace the prey with a creature one level above the predator level, capped at level 4.
- Existing non-apex blast thresholds and outcomes remain unchanged.

## Apex

- Apex requires at least four predators at level 4.
- Apex also requires either all four orthogonal adjacent positions or all four diagonal positions around the prey to be occupied by those predators.
- Both formations may be present; a reaction still counts as one apex reaction.
- Four or more predators in any other arrangement do not trigger apex.
- A qualifying apex reaction clears the entire board and creates no replacement creature.
- Apex is evaluated per prey from the shared wave snapshot; existing wave-level apex precedence remains in effect.

## Visual Ordering

1. When a committed move creates a reaction event, predators visibly converge toward the associated prey.
2. The convergence animation lasts 1000 milliseconds.
3. Convergence completes before the existing reaction flash, removal/replacement presentation, and commit of the resulting board.
4. All reactions in a simultaneous wave receive a convergence cue. A creature that participates in multiple reactions may have temporary visual-only copies for the additional targets; these copies never represent additional board creatures.
5. Reset or cancellation stops the cue, destroys temporary copies, and prevents stale wave presentation.
6. Non-reacting moves show no convergence cue.
