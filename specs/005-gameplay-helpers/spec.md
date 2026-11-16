# Feature Specification: Gameplay Helpers

**Feature Branch**: `005-gameplay-helpers`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: Show a dismissible failure message when a level has no reaction-producing legal moves and no free moves; after 10 seconds without a move, highlight a random reaction-producing move; if no reaction-producing moves exist but free moves remain, flash the Free Moves counter instead.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand Level Failure (Priority: P1)

As a player, I want a clear, dismissible message when the level is lost, so I understand why play has ended and can close the message without accidentally changing the completed board.

**Why this priority**: Losing is a terminal outcome; players need an explicit explanation and a clear way to dismiss it.

**Independent Test**: Reach the terminal state with no reaction-producing moves and no free moves, verify the failure dialog appears once, dismiss it, and verify the level remains lost until reset.

**Acceptance Scenarios**:

1. **Given** a settled board has no reaction-producing legal swap and zero free moves, **When** the level enters its lost state, **Then** a failure dialog informs the player that the level has failed.
2. **Given** the failure dialog is visible, **When** the player dismisses it using its close control or Escape, **Then** the dialog closes while the lost state and board remain unchanged.
3. **Given** a board still has a reaction-producing legal swap or has free moves remaining, **When** the board settles, **Then** the failure dialog is not shown.
4. **Given** the lost-state dialog has been dismissed, **When** the player resets the level, **Then** the new level is playable and the dismissed dialog does not remain visible.

### User Story 2 - Receive a Random Move Hint (Priority: P1)

As a player who has paused, I want a randomly selected reaction-producing move highlighted after 10 seconds, so I can see a possible next move without the game making it for me.

**Why this priority**: A timely hint helps players who are stuck while preserving their control over the move.

**Independent Test**: On a controlled board with at least one reaction-producing legal swap, leave the board idle for 10 seconds and verify one legal move's creature is highlighted without changing the board or counters.

**Acceptance Scenarios**:

1. **Given** the board is ready and at least one reaction-producing legal swap exists, **When** the player makes no move for 10 seconds, **Then** one randomly selected legal move is indicated by the existing inverse-flash visual treatment on a creature that participates in that move.
2. **Given** a move hint is displayed, **When** the hint animation completes, **Then** the board, score, turns, free moves, and random sequence remain unchanged.
3. **Given** the player makes a move or resets while a hint is pending or playing, **When** play resumes, **Then** the stale hint is cancelled and cannot affect the new or resolving board.
4. **Given** the player remains idle after a hint, **When** another full 10-second idle interval passes and the board is still ready, **Then** another legal move may be highlighted; no more than one hint runs at a time.
5. **Given** the game is resolving, won, lost, or showing the failure dialog, **When** 10 seconds elapse, **Then** no move hint is started.

### User Story 3 - Point Out Remaining Free Moves (Priority: P1)

As a player with no reaction-producing moves but with free moves remaining, I want the Free Moves counter to flash after 10 seconds, so I know I can continue by making a nonreacting swap.

**Why this priority**: The free-move rule is the recovery path when no reaction-producing swap is available; highlighting it makes that option visible.

**Independent Test**: On a ready board with no reaction-producing legal swap and at least one free move, wait 10 seconds and verify the Free Moves counter flashes without changing its value or game state.

**Acceptance Scenarios**:

1. **Given** the board is ready, no reaction-producing legal swap exists, and free moves remain, **When** the player makes no move for 10 seconds, **Then** the Free Moves counter receives the existing inverse-flash visual treatment.
2. **Given** the Free Moves counter is flashing, **When** the animation completes, **Then** its value and all board and score state remain unchanged.
3. **Given** a free-move hint is pending or playing, **When** the player moves or resets, **Then** the flash is cancelled or completed without affecting the resulting board or counter.
4. **Given** no reaction-producing legal swap exists and no free moves remain, **When** the board settles, **Then** the failure dialog takes precedence over the free-move hint.

### Edge Cases

- A reaction-producing legal swap includes moves where either moved creature reacts or a moved predator causes a stationary prey to react under the existing predator-move rule.
- Free moves allow nonreacting swaps but do not count as reaction-producing legal moves for choosing between a creature hint and a Free Moves hint.
- The 10-second idle interval starts when a playable board becomes ready and restarts after each accepted move has fully settled.
- Invalid/rejected input does not count as a completed move and does not change board state; a pending visual hint must not overlap a new input gesture.
- Reset, move resolution, terminal state, modal dismissal, and page teardown cancel pending timers and prevent stale hint updates.
- If a move is pending at the 10-second boundary, no hint starts until the board has settled and a fresh idle interval has elapsed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A settled level MUST enter its existing lost state when there are no reaction-producing legal swaps and no free moves remain.
- **FR-002**: On entering the lost state, the game MUST display a dismissible dialog informing the player that the level has failed.
- **FR-003**: Dismissing the failure dialog MUST NOT change the lost state, board, score, or counters; reset MUST begin a fresh playable level and remove the dialog.
- **FR-004**: A reaction-producing legal move MUST include any accepted swap that triggers a reaction through moved prey or moved predators under the existing reaction rules.
- **FR-005**: When a ready board has at least one reaction-producing legal move and remains without a completed move for 10 seconds, the game MUST randomly select one such move and highlight a participating creature with the existing inverse-flash treatment.
- **FR-006**: The move hint MUST be advisory only and MUST NOT apply a swap, alter game state or counters, or consume gameplay randomness.
- **FR-007**: When a ready board has no reaction-producing legal moves but has at least one free move and remains without a completed move for 10 seconds, the game MUST flash the Free Moves counter with the existing inverse-flash treatment.
- **FR-008**: The failure dialog MUST take precedence when both reaction-producing legal moves and free moves are absent; no free-move hint or move hint may run in a lost state.
- **FR-009**: The idle timer MUST start when the board is ready and restart after an accepted move has settled.
- **FR-010**: Pending timers and hint animations MUST be cancelled or invalidated when a move starts, reset begins, the level becomes terminal, the dialog is dismissed where relevant, or the page/view is disposed.
- **FR-011**: At most one idle hint animation may run at a time. If the board remains ready and idle, another hint may occur after the next full 10-second interval.
- **FR-012**: Existing move legality, predator reactions, replacement/apex/blast behavior, scoring, refill, cascades, and move accounting MUST remain unchanged.

### Key Entities *(include if data involved)*

- **Reaction-producing legal move**: An accepted adjacent swap that triggers at least one reaction under the current moved-prey and moved-predator rules.
- **Idle interval**: A full 10-second period after the board becomes ready or a previous accepted move settles, with no completed move.
- **Move hint**: A temporary visual indication of one randomly chosen reaction-producing legal swap; it does not mutate gameplay state.
- **Free-move hint**: A temporary visual flash of the Free Moves counter when no reaction-producing move exists but nonreacting free moves remain.
- **Failure dialog**: A dismissible explanation shown for a lost level; dismissing it does not resume or mutate the terminal game.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In every tested terminal no-moves/no-free-moves state, the failure dialog appears and can be dismissed without changing the lost game state.
- **SC-002**: On a ready board with reaction-producing legal moves, a hint begins after 10 seconds of inactivity and always identifies a move that would react under the existing rules.
- **SC-003**: A move hint never changes board cells, score, turns, free moves, or gameplay randomness.
- **SC-004**: On a ready board with no reaction-producing legal moves and free moves remaining, the Free Moves counter flashes after 10 seconds, while its value and the game state remain unchanged.
- **SC-005**: Reset, move start, resolution, and terminal transitions prevent stale timers or hint animations from affecting subsequent state.
- **SC-006**: Existing desktop and mobile gameplay, reaction, refill, cascade, and move-count regressions remain unchanged.

## Assumptions

- “Legal move” for hint selection means a reaction-producing adjacent swap; nonreacting swaps are allowed only by the existing free-move rule and are communicated through the Free Moves hint.
- A random hint highlights one creature in the selected swap that participates in enabling the reaction; the player remains responsible for performing the swap.
- The existing inverse flash is reused, including its current duration and phase pattern; the idle threshold is exactly 10 seconds.
- Successful move activity resets the idle timer after the move and all of its reactions/refills have settled. Invalid input does not count as a move.
- A dismissed failure dialog leaves the board in its lost state; the existing Reset control remains the route to a new playable level.
- Sound, new scoring rules, additional tutorial content, and changes to free-move count or reaction rules are out of scope.