# Contract: Level 1 Amoeba and Board Behavior

## Appearance and Motion

- Each visible level-1 creature displays the approved golden amoeba on its existing colored cell. Level 0 remains the paramecium; levels 2-4 remain numbered and retain their colors. If the required amoeba art cannot load, the level-1 cell displays the existing `1` placeholder.
- The resting amoeba retains the approved three-lobed silhouette, inset eye, rounded eyebrow, highlight, and interior detail layout. Its broad body contour undulates and the small upper-right lobe waves without making the character unrecognizable.
- The eye blinks and briefly glances in eight directions, returning to center. Horizontal pupil travel tilts the eyebrow in the opposite direction around its eye-contact position.
- Interior details drift within their assigned areas, remain inside the deformed body, and do not collide with each other.
- Each creature has independent visual phase and timing. Visual updates do not draw from, mutate, or reseed gameplay randomness.

## Input, Effects, and Identity

- Mouse and touch selection, dragging, cancellation, swaps, rejected moves, hints, reactions, falling/refill, and reset retain current behavior. Artwork does not move the outer cell, selection indicator, or pointer target.
- A surviving creature carries its own resting state across redraws, movement, hint flashes, and effects. New identities start with independent state; removed identities leave no stale artwork or callbacks.
- Existing hint and reaction flash scope and four 125 ms phases remain unchanged. The amoeba's dynamic contour and shared art layers invert with the affected cell while preserving transparent pixels and leaving unaffected cells unchanged.
- Failed/cancelled moves restore the prior board and visual-state membership. Successful reset clears the prior view generation, including when IDs are reused; failed reset restores prior state. Stale effects cannot alter the current board.
- Enabling animation changes no game state, score, turns, free moves, refill result, terminal outcome, or gameplay random draw count for an otherwise identical controlled play sequence.

## Accessibility, Failure, and Performance

- Reduced motion suppresses resting animation at startup and when preference changes at runtime. Recognizable neutral artwork, interaction, and required game feedback remain available.
- An incomplete or failed artwork set produces a complete numbered level-1 fallback, never a partial creature, and leaves the board playable.
- Validate a test-only 64-level-1 board for at least 30 foreground seconds on representative desktop and mobile configurations. At least 95% of frame intervals must be at or below 33.4 ms per tested configuration. Record browser/device, viewport, DPR, renderer, sample count, p95/p99, long intervals, and input responsiveness; do not filter stalls or treat mobile emulation as physical-device evidence.
- Validate actual physical-device performance separately when hardware is available; state plainly when it is not.
