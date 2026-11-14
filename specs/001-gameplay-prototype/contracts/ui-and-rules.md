# Interaction Contract: Single-Level Gameplay Prototype

## Player-Facing Interface

- Display `Food Chain`, a square 8-by-8 board of colored numbers, target 10, removed-creature progress, turns, free moves, and an accessible Reset button.
- Support selecting one creature then an orthogonally adjacent creature by mouse clicks or touch taps; accept a pointer drag between adjacent cells as an equivalent gesture. Nonadjacent selections may change the selected cell but never count as a move.
- Highlight the selected cell without changing board geometry; show win or loss clearly and provide Reset in either state.
- Maintain a readable board and controls on desktop and narrow mobile screens; use labels and numbers so levels are not distinguished by color alone. Prevent browser scrolling from stealing an active board gesture without disabling scrolling elsewhere.
- During move resolution block additional board actions, but keep Reset usable; cancel selection and pending effects on reset.

## Rules / Presentation Boundary

- **Command**: proposed source and destination coordinates plus current session state. The rules layer checks input and produces either a rejection with unchanged state or an accepted result and ordered effects.
- **Reaction result**: for each wave, return all qualifying prey, predator identities/counts, combined removal cells, preserved creations, score delta, apex flag, and per-column fall/spawn positions. Evaluate swapped creatures on one post-swap snapshot; after each refill evaluate all fallen and newly generated creatures on one settled snapshot. Stationary creatures are not candidates solely because neighbors changed.
- **View effects**: each wave flashes exactly the affected cells, removes them, and animates falling/refill movement before the next wave. Inverted and normal phases are 125 ms each, repeated twice. Test both visual order and active-tab timing; timers may be delayed by browser scheduling.
- **Completion**: the view acknowledges each wave with the originating session epoch; only the matching active session may advance or commit its result. Repeat until no landed or newly generated creature qualifies, then publish the terminal or ready state. Reset invalidates all prior epochs and clears outstanding timers, tweens and callbacks.
- **Randomness**: generation and refill take an injected random source. Tests supply a reproducible seed or scripted samples. Predicted move checks must not consume randomness or mutate state.
- **State publication**: after an accepted swap, update turns and free moves once. Across all waves count each removed level-0 creature once by identity, including direct prey and collateral or apex removals; update progress and publish the final board and status when the chain settles. New creatures in later waves have distinct identities.

## Acceptance and Boundary Cases

- Reject nonadjacent or input-during-resolution swaps without spending turns, free moves, or randomness.
- Confirm counts 2, 3, 4, 5, 6, 7 and 8; corners and edges; simultaneous overlapping predators and explosions; one apex plus another reaction; and goal completion on the same move that would otherwise lose.
- Confirm falling and newly generated creatures can trigger simultaneous subsequent waves, but stationary creatures do not react solely because neighbors changed; a zero-free-move board with no reacting swap becomes lost after settling unless the goal was met.
- Confirm every new and reset board contains all five levels and at least one reacting adjacent swap. Test multi-wave scoring, overlapping removals and apex events without double-counting, win only after the final wave, and reset during a long cascade.
- Confirm reset during each effect phase prevents stale updates and restores all counters and a full board.
- No network API, authentication, saved game, or external service is exposed by this prototype.