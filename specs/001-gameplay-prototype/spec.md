# Feature Specification: Single-Level Gameplay Prototype

**Feature Branch**: Not created

**Created**: 2026-11-14

**Status**: Draft

**Input**: A single-level Food Chain browser prototype on an 8-by-8 square grid, with a goal of removing 10 lowest-level creatures, a scoreboard, reset, falling pieces, and brief explosion effects.

## Clarifications

### Session 2026-11-14

- Q: Can a creature that falls into a new cell be eaten as part of the same turn if it lands surrounded by enough predators? → A: Both falling and newly generated creatures can be eaten after landing.
- Q: If several creatures land surrounded by predators at the same time, how should their consumption be resolved? → A: Resolve all eligible creatures simultaneously using the same settled board.
- Q: Should the level goal count lowest-level creatures cleared by explosions, or only those directly eaten by predators? → A: Count every lowest-level creature removed, including those cleared by explosions or an apex event.
- Q: When the target of 10 is reached during a chain reaction, when should the level end? → A: Continue all reactions and refills until the board settles, then show the win.
- Q: Should every new starting board have at least one move that triggers a reaction? → A: Yes; generate each starting and reset board with at least one reacting move.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play the Food Chain (Priority: P1)

As a player, I move numbered creatures on a square board to trigger consumption and work toward the level goal using a mouse or touch.

**Why this priority**: The movement and food-chain interactions are the core experience being evaluated.

**Independent Test**: Start a level on desktop or mobile, perform a permitted move that triggers consumption, and verify the resulting board and goal progress against the agreed rules.

**Acceptance Scenarios**:

1. **Given** a fresh level, **When** it opens, **Then** it shows an 8-by-8 board of colored numbered creatures and the goal of removing 10 lowest-level creatures.
2. **Given** a permitted swap that places a creature next to at least three eligible predators, **When** the move is completed, **Then** consumption resolves using all eight surrounding cells for predator counting.
3. **Given** equivalent board states, **When** a player performs the same permitted move with a mouse and with touch, **Then** the game produces the same outcome.
4. **Given** the player has removed 9 lowest-level creatures, **When** another is removed, **Then** progress reaches the target and the level visibly indicates completion only after all reactions and refills settle.
5. **Given** both swapped creatures qualify for consumption, **When** the swap resolves, **Then** both reactions are determined from the same post-swap board and resolve simultaneously.
6. **Given** a falling or newly generated creature lands surrounded by at least three eligible predators, **When** the board settles, **Then** it is consumed in a further reaction during the same turn.
7. **Given** several falling or newly generated creatures qualify after landing, **When** the board settles, **Then** all qualifying reactions are determined from that same settled board and resolve simultaneously.
8. **Given** a newly started or reset level, **When** the starting board is generated, **Then** at least one valid adjacent swap can trigger a reaction.

### User Story 2 - Understand Explosions and Refill (Priority: P2)

As a player, I can see which cells an explosion affects and watch creatures fall into the gaps so that I can follow the changing board.

**Why this priority**: Visible cause and effect makes the mechanics easier to evaluate.

**Independent Test**: Set up a known explosion, observe the affected cells, and verify their clearance and the subsequent column refill.

**Acceptance Scenarios**:

1. **Given** an explosion affects occupied cells, **When** it resolves, **Then** the affected cells show two color-inversion cycles of 250 milliseconds each before the affected creatures are cleared.
2. **Given** cleared cells in a column, **When** the board refills, **Then** surviving creatures above the gaps visibly fall downward in their existing order and new creatures enter from the top to fill remaining spaces.
3. **Given** cells outside the explosion's effect, **When** it resolves, **Then** they are not cleared by that explosion, although creatures above gaps may fall.
4. **Given** four eligible predators, **When** consumption causes an explosion, **Then** the eight surrounding cells, including the predators, are cleared and the evolved creature remains in the center.
5. **Given** five eligible predators, **When** consumption causes an explosion, **Then** cells within two rows and two columns of the center, including diagonals and the predators, are cleared while the evolved creature remains in the center.
6. **Given** six, seven, or eight eligible predators, **When** consumption causes a non-apex reaction, **Then** the rest of the board is cleared and the evolved creature remains in the center.
7. **Given** an explosion or apex event removes lowest-level creatures, **When** progress is updated, **Then** each removed lowest-level creature counts once toward the goal.

### User Story 3 - Track and Restart the Level (Priority: P2)

As a player, I can see my goal, progress, turns, and remaining free moves, and reset the level to try again.

**Why this priority**: Clear feedback and a repeatable starting point are essential for testing.

**Independent Test**: Make a move, inspect the scoreboard, and reset; verify the counters and board return to a fresh level.

**Acceptance Scenarios**:

1. **Given** a fresh level, **When** the scoreboard is shown, **Then** it displays the target of 10, progress of 0, 0 turns, and 3 remaining free moves.
2. **Given** a completed permitted move, **When** its effects finish, **Then** the turn count increases once and progress and free moves reflect the agreed rules.
3. **Given** a level in progress or completed, **When** the player selects Reset, **Then** a new starting board appears and progress, turns, free moves, and completion state return to their initial values.
4. **Given** at least one free move remains, **When** the player makes a swap that causes no consumption, **Then** one free move is deducted and one turn is recorded.
5. **Given** no free moves remain, **When** a swap would cause no consumption, **Then** the swap is rejected without changing the board or counters.
6. **Given** no free moves remain and no adjacent swap can cause consumption, **When** the board is ready for another turn, **Then** the level visibly ends and can be reset.

### Edge Cases

- A creature already surrounded by predators is not consumed solely because another creature moved; the lower-level creature must move into the triggering position.
- Board edges and corners have fewer existing neighbors; off-board positions never count as creatures or affected cells.
- A swap outside horizontally or vertically adjacent cells leaves the board and counters unchanged.
- An action involving the highest-level predators that would otherwise evolve or explode causes an Apex Predator Event; the board is cleared and refilled.
- Lowest-level creatures cleared by explosions or an apex event count toward the goal, including collateral removals.
- After refill, evaluate creatures that fell or were newly generated after they land; stationary creatures are not consumed solely because their surroundings changed.
- Reset during an animation cancels the old outcome and restores a fresh level without stale counter updates.
- If simultaneous reactions share predators or affected cells, each existing creature is removed and counted at most once; newly evolved creatures survive all effects in that reaction unless an apex event occurs.
- On completion, further board moves are disabled until reset; all in-flight reactions and refills finish before completion is displayed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST present a single playable level on an 8-by-8 square grid, headed `Food Chain`, with one colored number representing each creature's level.
- **FR-002**: Every starting and reset board MUST contain creatures from five consecutive levels, starting at level 0, and MUST have at least one valid adjacent swap that triggers a reaction. Higher levels MUST be less likely than lower levels in both the starting board and random top-edge replenishment.
- **FR-003**: The game MUST support equivalent mouse and touch actions on desktop and mobile layouts.
- **FR-004**: A move MUST swap two creatures in horizontally or vertically adjacent cells. Both swapped creatures have moved for the purpose of checking whether consumption can be triggered.
- **FR-005**: A creature MUST be consumed only after it moves into a position surrounded by at least three eligible creatures exactly one level higher; two predators alone MUST NOT consume it in this prototype.
- **FR-006**: Predator counting MUST include the eight cells surrounding the moved creature, including diagonals, excluding positions outside the board.
- **FR-007**: When three eligible predators consume a lower-level creature, they MUST combine into one creature one level above the predators, placed in the consumed creature's cell, unless the apex rule applies.
- **FR-008**: Four eligible predators MUST produce an evolved creature and clear all eight surrounding cells; five MUST produce an evolved creature and clear all other cells within two rows and two columns of the creation cell, including diagonals. Participating predators are cleared. Six, seven, or eight eligible predators MUST produce an evolved creature and clear the rest of the board. The evolved creature remains in the creation cell, subject to the apex rule and simultaneous-reaction handling.
- **FR-009**: When the current highest-level creature would evolve or cause an explosion, the game MUST trigger an Apex Predator Event that clears the board rather than creating a higher-level creature.
- **FR-010**: For each explosion, the game MUST invert colors on affected cells for two complete 250-millisecond cycles before clearing affected creatures. A full cycle consists of an inverted phase and a normal phase of equal duration.
- **FR-011**: Following clearance, survivors above gaps MUST visibly fall down within their columns, retaining their relative order; randomly generated creatures MUST enter from the top until the board is full. After landing, falling and newly generated creatures MUST be checked for consumption and trigger further reactions in the same turn when eligible.
- **FR-012**: The game MUST display the target of 10 lowest-level creatures, the number removed so far, turns taken, and free moves remaining; the initial values MUST be 0 turns, 0 removed, and 3 free moves.
- **FR-013**: Each completed permitted player move MUST add exactly one turn. Invalid actions MUST NOT change turns, free moves, or goal progress.
- **FR-014**: A non-reacting adjacent swap MUST be permitted whenever at least one free move remains and MUST consume one free move. When none remain, non-reacting swaps MUST be rejected. If no reacting adjacent swap is available with zero free moves, the game MUST visibly end the level and allow reset.
- **FR-015**: Removing a level-0 creature MUST increase goal progress by one, whether directly eaten or cleared by an explosion or apex event, including during any reaction sequence. Each creature MUST be counted at most once when effects overlap.
- **FR-016**: When progress reaches at least 10, the game MUST continue all reactions and refills triggered by the turn until no further reaction is triggered. It MUST then show level completion and prevent further moves until reset.
- **FR-017**: Reset MUST be available during play and after completion, restoring a newly generated starting board, 0 turns, 0 progress, 3 free moves, and an incomplete level state; it MUST cancel pending effects from the previous game.
- **FR-018**: The game MUST prevent additional board moves while an existing move, explosion, or refill is resolving; reset remains available.
- **FR-019**: The game MUST evaluate both swapped creatures against the same board immediately after the swap and resolve qualifying reactions simultaneously. After each refill, it MUST evaluate all creatures that fell or were newly generated against the same settled board and resolve all qualifying reactions simultaneously. For each simultaneous reaction, it MUST combine removal and explosion areas, remove and count each existing creature at most once, and preserve each newly evolved creature through all effects in that reaction. An apex event overrides other outcomes and clears the entire board. Refill begins only after all simultaneous effects resolve.

### Key Entities *(include if feature involves data)*

- **Creature**: A colored number with a food-chain level and a cell position.
- **Board**: An 8-by-8 arrangement of cells and creatures, with column-based falling and top-edge replenishment.
- **Move and reaction**: A player action and its resulting consumption, evolution, explosion, clearance, and refill, as applicable.
- **Level state**: The target, removed count, turn count, remaining free moves, and completion status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all tested fresh and reset levels, players see 64 occupied cells, a target of 10, 0 progress, 0 turns, and 3 free moves, and at least one valid adjacent swap triggers a reaction.
- **SC-002**: In all tested explosion scenarios, affected cells display exactly two 250-millisecond inversion cycles before clearing, and each affected column visibly refills from above.
- **SC-003**: In all tested valid mouse and touch scenarios, the same starting board, equivalent move, and same replenishment outcomes produce the same result and scoreboard values.
- **SC-004**: In a usability session, at least 4 of 5 participants can identify the goal, progress, turn count, and free moves and reset the level without assistance.
- **SC-005**: In all tested completion scenarios, removing the tenth lowest-level creature leads to a visible completion state after effects resolve, and reset starts a new playable level.

## Assumptions

- This specification covers one level only. Hexagonal play, multi-round or stage progression, mating, production creature art, bonuses, and monetization are out of scope.
- Three predators are the minimum for consumption, reflecting the later revision of the earlier two-predator proposal.
- The initial five levels are 0 through 4. They remain the level range for this single-level prototype; the apex event prevents creating level 5.
- All removed level-0 creatures advance the goal, including direct prey and creatures cleared by explosions or board clearing.
- A two-cycle inversion consists of two 250-millisecond inverted-to-normal cycles, 500 milliseconds total.
- A freshly reset board may differ from the previous one because board generation is random. No saved progress is required.
- Simultaneous effects use the union of affected cells, preserve all newly evolved creatures, and defer to a board-clearing apex event. This overlap rule is a prototype assumption.
- Falling and newly generated creatures can trigger further consumption after landing; stationary creatures do not react solely because their surroundings changed.
- Engine evaluation belongs in the plan, after the gameplay decisions are understood; no engine is selected here.