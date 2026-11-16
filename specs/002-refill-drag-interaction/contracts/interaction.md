# Interaction Contract: Replenishment and Drag

## Replenishment

- After any clearance, newly generated creatures enter from the top of their columns with equal independent probability for levels 0-4. Refill does not change initial or reset board generation.
- Scripted values at and immediately around 1/5, 2/5, 3/5 and 4/5 must map consistently to the corresponding half-open intervals in `specs/002-refill-drag-interaction/data-model.md`.

## Pointer and Board

- A ready board accepts one primary mouse or touch pointer. The dragged creature follows it visibly inside the cross-shaped legal range; entering a neighbor previews that neighbor sliding to the origin.
- Returning to origin restores both positions without a move. A different neighbor replaces the previous preview; the previous neighbor must be restored first.
- The view holds no committed swap before release. During the preview the game board, score, turns, free moves, random source, and reactions remain unchanged.
- Release on a previewed neighbor, including release beyond the legal range, submits precisely one origin-to-neighbor swap. A rejected swap redraws the authoritative board; a release in origin or a cancelled gesture submits none.
- Capture must not disable taps: a press/release below the drag threshold preserves the existing click-or-tap selection and adjacent swap behavior.
- Pointer cancellation, capture loss, blur, document hiding, reset, board replacement, or loss of move permission cancels the gesture and blocks stale releases. Secondary pointers cannot commit or cancel the owner's gesture.
- Previewed objects must not be recreated in a way that leaves stale references after reset or conflicts with explosion and falling animations. No board input is accepted while a committed move resolves.
- Board scaling must use the current canvas geometry. Equivalent mouse and touch input on the same board produces the same preview destination, move, and counters.

## Verification Boundaries

- Verify a deterministic visual change during pointer movement before release and restoration before release when the pointer returns to origin.
- Verify legal and rejected release, all board edges, direction switching, beyond-board release, pointer cancellation, reset during drag, and release after reset.
- Validate touch taps and an emulated touch drag in browser tests; separately record real iOS/Android drag results or unavailability. Keep fixture controls out of production.