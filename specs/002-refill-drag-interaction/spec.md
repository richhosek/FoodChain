# Feature Specification: Replenishment and Drag Interaction

**Feature Branch**: Not created

**Created**: 2026-11-14

**Status**: Draft

**Input**: Generate replacement creatures at equal probability for all five levels, and show a dragged creature and a reversible neighboring swap before committing the move on release.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rebalanced Replenishment (Priority: P1)

As a player, I see all creature levels enter the board at equal probability when removed creatures are replaced.

**Why this priority**: Replenishment occurs throughout play and directly influences the balance of the food chain.

**Independent Test**: Refill known empty cells using controlled random values and verify that each of the five equal probability intervals maps to its corresponding creature level.

**Acceptance Scenarios**:

1. **Given** a cleared board cell, **When** a new creature is generated to refill it, **Then** each level from 0 through 4 has an equal one-in-five probability.
2. **Given** reproducible random values spanning the distribution, **When** replenishment creatures are generated, **Then** values in `[0, 1/5)`, `[1/5, 2/5)`, `[2/5, 3/5)`, `[3/5, 4/5)`, and `[4/5, 1)` produce levels 0, 1, 2, 3, and 4 respectively.
3. **Given** several vacancies, **When** they are refilled, **Then** each new creature is sampled independently and enters from the top of its column.
4. **Given** a fresh or reset game, **When** its starting board is generated, **Then** its existing generation rules remain unchanged by the replenishment adjustment.

### User Story 2 - See and Control a Dragged Swap (Priority: P1)

As a player, I see the creature follow my mouse or finger and the neighboring creature slide into its place, so I can understand and revise my move before releasing it.

**Why this priority**: Immediate, reversible feedback makes the game's central interaction easier to control.

**Independent Test**: On a known board, drag a creature into an adjacent cell, return it to its original cell, then drag and release it on an adjacent cell; observe the preview and verify only the completed swap registers.

**Acceptance Scenarios**:

1. **Given** a ready board, **When** the player drags a creature toward an in-bounds orthogonally adjacent cell, **Then** the creature visibly follows the drag and the adjacent creature slides into the starting cell as a preview.
2. **Given** a swap is previewed, **When** the dragged creature returns to its starting cell, **Then** both creatures visibly return to their original cells and no move is registered.
3. **Given** a swap is previewed, **When** the player releases over the adjacent cell, **Then** the swap is committed exactly once and the existing reaction, turn, and free-move rules apply.
4. **Given** a drag reaches the edge of its legal range, **When** the pointer continues farther or outside the board, **Then** the creature cannot be dragged beyond the original cell or an in-bounds orthogonally adjacent cell.
5. **Given** the player uses mouse or touch, **When** they perform equivalent drags on equivalent boards, **Then** the preview, committed swap, and counters are equivalent.
6. **Given** the player clicks or taps two adjacent cells without dragging, **When** the swap is permitted, **Then** the existing click-or-tap swap continues to work.

### Edge Cases

- Returning to the original cell and releasing cancels the drag without spending a turn or free move and without triggering reactions.
- At board edges and corners, only existing orthogonal neighbors are possible destinations; diagonal and off-board cells are never destinations.
- Releasing beyond the legal range commits the last in-bounds adjacent cell reached by the constrained drag; releasing without reaching a neighbor cancels.
- If a prospective swap would be rejected under the existing free-move rules, the drag returns to the original board on release without changing counters or triggering reactions.
- Changing the preview from one neighbor to another first restores the previous neighbor to its original cell; only the final previewed neighbor can be swapped on release.
- Cancellation of the pointer gesture, loss of input, or Reset during a drag restores or replaces the board without committing the preview or allowing stale effects.
- Board input remains disabled while a committed move, reaction, or refill is resolving; Reset remains available.
- Previewed swaps must not consume random values or alter the authoritative board, counters, score, or reaction state before release.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Replenishment MUST sample each of the five existing creature levels 0 through 4 with equal probability 1/5 per generated creature.
- **FR-002**: Each replenishment creature MUST be drawn independently using the new distribution and enter from the top of its column under the existing refill and cascade rules.
- **FR-003**: The new distribution MUST apply only to replenishment; starting and reset board generation MUST retain its existing distribution and validity guarantees.
- **FR-004**: A dragged creature MUST visibly follow mouse or touch movement within the legal range throughout the gesture, rather than appearing to move only on release.
- **FR-005**: On entering an in-bounds orthogonally adjacent cell, the neighboring creature MUST visibly slide into the dragged creature's original cell as a reversible preview.
- **FR-006**: Returning to the original cell MUST restore the previewed neighbor to its original cell. The player MAY change direction during a drag; any previous preview MUST be restored before a different neighbor is previewed.
- **FR-007**: A dragged creature MUST remain constrained to its original cell and its in-bounds orthogonal neighbors; it MUST NOT enter diagonal, nonadjacent, or off-board cells.
- **FR-008**: Releasing a drag after reaching a neighbor MUST submit exactly one swap between the original cell and the final previewed neighbor. A pointer released beyond the legal range MUST use the last valid previewed neighbor; releasing in the original cell MUST cancel without submitting a move.
- **FR-009**: Until release, the game MUST treat the swap as visual feedback only: the authoritative board, turn count, remaining free moves, goal progress, random sequence, and reaction state MUST remain unchanged.
- **FR-010**: On release, the game MUST enforce existing move legality, including free-move restrictions. A rejected swap MUST restore both creatures and MUST NOT change counters, goal progress, or reaction state.
- **FR-011**: Mouse and touch MUST provide equivalent drag behavior and outcomes. Existing click-or-tap selection and swaps MUST remain available.
- **FR-012**: Pointer cancellation or input loss MUST cancel the uncommitted preview. Reset during a drag MUST discard it and prevent the prior gesture from committing afterward.
- **FR-013**: Existing reaction, simultaneous-wave, scoring, win/loss, and refill rules MUST apply after a committed swap; previews MUST NOT initiate any reaction.

### Key Entities *(include if feature involves data)*

- **Replenishment distribution**: Relative weights for each of the five creature levels, used for independently generated replacement creatures.
- **Drag gesture**: The original cell, pointer position, optional previewed neighbor, and release or cancellation state.
- **Previewed swap**: A temporary visual exchange between the dragged creature and one neighbor, distinct from a committed board move.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all controlled boundary tests, each replenishment draw maps to the correct one of five equal probability intervals.
- **SC-002**: In all tested mouse and touch drags, the creature visibly moves before release, and a neighbor moves into the origin when previewed.
- **SC-003**: In all tested return-to-origin, cancellation, and Reset-during-drag scenarios, no preview is committed and no turn or free move is spent.
- **SC-004**: In all tested legal releases, exactly one swap and one turn are recorded; in all tested rejected releases, the board and counters remain unchanged.
- **SC-005**: In a usability session, at least 4 of 5 participants can preview, reverse, and complete an adjacent drag without assistance.

## Assumptions

- The existing square 8-by-8 board, five levels, move restrictions, starting-board distribution, and scoring/cascade rules remain in force.
- The fixed prototype level range is 0 through 4; all refill levels are equally likely.
- A pointer beyond the legal range is constrained to the last valid neighboring preview rather than enabling a nonadjacent move.
- A preview of an ultimately rejected non-reacting move is permissible while dragging; the existing free-move check occurs on release.
- Sound, new creature artwork, hexagonal boards, and changes to goals or level progression are out of scope.