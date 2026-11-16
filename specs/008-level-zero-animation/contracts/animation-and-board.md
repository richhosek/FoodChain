# Contract: Level 0 Animation and Board Behavior

## Appearance and Motion

- Each visible level-0 creature uses the approved one-eyed paramecium, not the number 0, on its existing colored cell. Levels 1-4 retain their numbers and colors. If required artwork cannot load, show the existing colored `0` placeholder and keep the board playable.
- Cilia ripple around the outline; the creature gently rotates clockwise and counterclockwise; upper and lower lids blink over a round eye; the pupil briefly glances in eight possible directions and returns to center; internal shapes drift slightly within their original areas. See [the data model](../data-model.md) for reference ranges.
- Each creature's motions have independent visual phases and schedules. Accidental simultaneous actions are allowed. Animation must not draw from, mutate, or reseed gameplay randomness.
- The artwork stays within its cell during resting rotation and does not overlap adjacent cells or clip at board edges. Only artwork rotates: tile background, selection border and pointer target remain fixed.

## Input, Effects and Identity

- Mouse and touch selection, dragging, cancellation, swaps and rejected moves retain current behavior. A surviving creature carries its own visual state across position changes, redraws, hint flashes and effects; a new identity starts independently.
- Preserve existing hint and explosion flash scope and four 125 ms phases; affected level-0 cells visibly invert while unaffected cells remain unchanged. Preserve opaque/transparent artwork edges and keep the tile's current inversion behavior.
- Existing predator convergence, meld, Apex, removal, falling, spawn and refill order/timing continue to match their game events. Removed creatures leave no stale visuals or active animations after commit.
- Failed or cancelled moves restore the original board and its surviving visual states. A successful reset discards the old generation even if IDs are reused; a failed reset restores previous visual states despite its new game epoch. Old callbacks cannot change the new board.
- With the same controlled board, moves and gameplay RNG stream, enabling animation changes no game state, draw count, score, turn, free move, target, refill or terminal outcome.

## Accessibility, Failure and Performance

- A reduced-motion preference suppresses resting motion, including when changed at runtime; existing gameplay feedback remains visible and the level-0 creature remains recognizable. The board remains operable with mouse and touch and has an accurate accessible description.
- Required artwork load/decoding failure yields a recognizable level-0 placeholder with no broken input or partially assembled creature. Dispose update handlers and preference listeners when the view shuts down.
- Evaluate a test-only 64-level-0 board for at least 30 foreground seconds on representative desktop and mobile configurations. At least 95% of observed frame intervals must be at or below 33.4 ms on each tested configuration. Record device/browser, viewport, DPR, renderer, sample count, p95/p99, long intervals and interaction responsiveness; do not filter stalls or treat mobile emulation as physical-device evidence.