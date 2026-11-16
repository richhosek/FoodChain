# Idle Hints and Failure Dialog Contract

## Failure State

- Show the failure dialog when a settled level is lost because no reaction-producing legal swap and no free moves remain.
- The dialog states that the player has failed the level.
- Provide a visible dismiss control and Escape dismissal.
- Dismissal hides only the dialog; the board remains lost and unchanged. Reset starts a fresh playable level and closes the dialog.

## Move Hint

- Begin an idle interval only while the board is settled and ready.
- At 10 seconds of inactivity, enumerate legal reaction-producing adjacent swaps using current moved-prey and moved-predator rules.
- If one or more exist, select one randomly and inverse-flash a participating creature. Do not execute the move.
- Hint selection and animation do not change the board, score, turns, free moves, or gameplay random sequence.
- If the player remains idle, a later hint may run only after the next full 10-second interval; overlapping hints are prohibited.

## Free-Move Hint

- If no reaction-producing swap exists but at least one free move remains at the idle deadline, inverse-flash the Free Moves counter.
- Preserve the counter value and all game state.
- If no reaction-producing swap and no free moves remain, show the failure dialog instead; do not flash the counter.

## Cancellation and Priority

- Cancel or invalidate pending timers and active hints when a move starts, reset begins, the level enters resolving/won/lost, or the controller/view is disposed.
- A hint cannot overlap a new input gesture or reaction/refill animation.
- A late callback from an earlier reset epoch cannot animate or modify the new level.
- Terminal failure takes priority over both kinds of hint.
