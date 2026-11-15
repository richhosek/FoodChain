# Data Model: Replenishment and Drag Interaction

## Replenishment Distribution

The existing level type is 0 through 4. For one uniform random value `value` in `[0, 1)`, select the first interval containing it:

| Level | Weight | Interval |
| --- | --- | --- |
| 0 | 5 | `[0, 5/15)` |
| 1 | 4 | `[5/15, 9/15)` |
| 2 | 3 | `[9/15, 12/15)` |
| 3 | 2 | `[12/15, 14/15)` |
| 4 | 1 | `[14/15, 1)` |

Each refill spawn consumes exactly one injected draw; invalid random values remain errors. The starting/reset generator continues using its original sampler and board acceptance checks. Refill preserves existing per-column draw order and falls, and newly spawned creatures remain eligible for cascades.

## Gesture State

The gesture belongs to the view, not `GameLevel`:

- `pointerId`: the single owning native pointer; other pointers are ignored.
- `origin`: original occupied cell and dragged creature identity.
- `pressOffset` and last pointer coordinates: retain the grab point and map client coordinates through the current canvas bounds to board coordinates.
- `phase`: pressed, dragging, or inactive; a small movement threshold distinguishes taps from drags consistently for mouse and touch.
- `preview`: at most one in-bounds orthogonal neighbor and its creature identity, or none when the dragged creature is in the origin.
- `viewEpoch`: token tied to the currently rendered board; reset, cancellation, or a new render invalidates prior events.

During a gesture, the logical board, score, turns, free moves, random state, and resolution state are unchanged. Only display-object positions change. Existing animations and concurrent board input cannot be active for a new drag.

## Gesture Transitions

1. **Press**: When the level is ready, capture the initiating primary pointer and its origin; no move is submitted. A press/release below the drag threshold follows the existing tap-selection path.
2. **Move**: Constrain the dragged creature's center to the union of the origin cell and its in-bounds orthogonal neighbor cells. When it enters a neighbor, slide that neighbor into the origin as a preview. On returning to the origin, restore the neighbor and clear the preview. On changing neighbors, restore the previous neighbor before previewing the next. If a pointer travels diagonally or beyond the range, project it onto that union; prefer the current preview on equal-distance ties, otherwise use a fixed direction order. This deterministic tie rule is an implementation choice, not a game rule.
3. **Release**: If the gesture is a drag with an active neighbor, clear gesture state and capture before invoking the existing move callback exactly once. Outside release uses the current constrained neighbor; if the preview was cleared by returning to origin, it cancels. Release in origin, or without ever reaching a neighbor, restores the view without a turn. A rejected non-reacting swap with no free moves restores the authoritative board and leaves counters unchanged.
4. **Cancel**: Pointer cancellation, unexpected lost capture, blur, hidden document, loss of move permission, reset, or board replacement clears the gesture, restores the view if the board remains current, and ignores late events. Reset may replace the board; old preview objects must not be redrawn over it.
5. **Commit**: Only the existing rules layer decides move validity and produces reactions, free-move changes, scoring, and cascades. A completed reaction or refill continues to use the current game epoch and animation contract.