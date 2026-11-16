# Contract: Reaction Selection and Win Dialog

## Reaction Selection

1. Use one pre-wave snapshot and only the candidates allowed by the move or refill that triggered the wave. Discover each prey's eligible adjacent predators, including diagonals, under existing level rules.
2. Select the eligible prey with the largest count of currently available predators; at equal counts choose the topmost prey, then the leftmost. Assign the prey and all of its available predators to that reaction.
3. Reassess all unassigned prey using only unassigned predators. Continue until no eligible prey has at least three; a creature can be assigned only once in the pass.
4. The selected predator set determines the existing replacement, blast radius, Apex formation and convergence. Unselected candidates cause no effect or score by themselves. A creature may also be collateral, but each removal is scored at most once.
5. Reevaluate the next cascade from its own snapshot and candidates. Selection order must not depend on input candidate order; independent reactions may occur in the same wave.

## Meld and Apex Order

1. Select affected non-overlapping melds using existing row-major rules. A selected top-level meld clears the board with no creations.
2. Otherwise select predator reactions provisionally with no meld reservations. If a selected reaction is Apex, clear the board with no creations, including when it overlaps a meld.
3. Otherwise discard the provisional result, reserve every selected meld creature, and select predator reactions again. A selected Apex in this pass also clears the board.
4. Without Apex, resolve the selected melds and final predator reactions. Preserve meld centers, deduplicate removals, and emit effects only for the resolving activations; no provisional ordinary selection consumes IDs or RNG, animates, scores or affects the board.

## Moves and Hints

- Accepted reaction-producing moves, no-moves detection and hints must agree with the same activation selection, including melds and moved-predator reactions. A predicted hint must identify a legal swap that actually activates; hints do not change game state or gameplay RNG.
- Keep existing free-move accounting, initial board generation and refill distribution. Preserve turn count and cancellation semantics for all waves.

## Win Dialog

- When the removal goal of 100 is met or exceeded, finish the current cascade and refill, render the settled board, enter won state and present one modal titled "You Won" for that level epoch. Win takes precedence over loss.
- The dialog has an accessible title and visible close control, supports keyboard focus and Escape, and remains usable on desktop and mobile with mouse or touch.
- Dismissal leaves board, score, turns, free moves and won status unchanged, does not re-open the dialog for the same epoch, and does not permit further board moves. Reset closes any open dialog and starts a fresh playable epoch; a later win may show it again.
- Reset or cancellation during an unfinished cascade prevents stale effects or win dialogs from appearing on the replacement level. Terminal states do not start idle hints.