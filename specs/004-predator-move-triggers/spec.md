# Feature Specification: Predator Moves Trigger Eating Reactions

**Feature Branch**: `004-predator-move-triggers`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: A move that brings a predator into an eating situation must trigger that eating activity, just as moving the prey into the situation does.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trigger Reactions When Predators Move Into Position (Priority: P1)

As a player, I want moving a predator into position around prey to trigger the eating reaction, so creating the required predator group works whether I move the prey or a predator.

**Why this priority**: The current move behavior should respond consistently to either side of the same completed eating setup.

**Independent Test**: On a controlled board with two predators already adjacent to a stationary prey, move a third eligible predator into an adjacent position and verify that the reaction resolves. Compare with moving the prey into a position adjacent to three predators.

**Acceptance Scenarios**:

1. **Given** a stationary prey has two adjacent predators and a third eligible predator is outside its neighborhood, **When** the player moves that predator into a position adjacent to the prey, **Then** the prey is checked and the eating reaction resolves.
2. **Given** a prey is moved into a position with at least three eligible adjacent predators, **When** the move completes, **Then** the existing eating reaction resolves as before.
3. **Given** a move places a predator adjacent to more than one eligible stationary prey, **When** the move completes, **Then** each affected prey is evaluated from the same post-move board snapshot and each qualifying reaction is included once.
4. **Given** an unrelated stationary prey already has a qualifying predator group, **When** a move does not involve one of those prey or add a predator to its group, **Then** the unrelated prey does not react solely because a different move occurred.
5. **Given** a moved predator does not complete a qualifying group, **When** the move completes, **Then** no reaction is triggered for the nearby prey.

### Edge Cases

- The existing threshold remains at least three adjacent predators exactly one level above the prey; diagonal neighbors continue to count.
- A moved predator can contribute to multiple stationary prey groups; each qualifying prey is evaluated once from the same post-move snapshot.
- If both moved creatures and one or more stationary prey qualify in the same move, all resulting reactions follow the existing simultaneous-wave rules.
- A predator that moves away from a prey does not cause a reaction for that prey merely because it was formerly part of its group.
- Rejected moves do not trigger reactions or change the board.
- Existing replacement levels, apex formation, blasts, scoring, refill, cascades, and move accounting remain unchanged after the reaction is selected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After a legal move, the game MUST continue to evaluate the moved creatures for eating reactions under the existing rules.
- **FR-002**: After a legal move, the game MUST also evaluate a stationary prey when a moved creature is now an adjacent predator exactly one level above that prey.
- **FR-003**: A moved predator MUST trigger each stationary prey reaction for which it contributes to a qualifying group of at least three adjacent predators.
- **FR-004**: A prey MUST react only when at least three adjacent predators are exactly one level higher, with orthogonal and diagonal neighbors both included.
- **FR-005**: The moved creatures and affected stationary prey MUST be evaluated against one post-move snapshot; each prey MUST be included at most once in a reaction wave.
- **FR-006**: Stationary prey unrelated to the move MUST NOT react solely because another creature moved.
- **FR-007**: A rejected or invalid move MUST NOT initiate an eating reaction.
- **FR-008**: Once reactions are selected, the existing replacement, apex, explosion, scoring, refill, cascade, and turn rules MUST remain unchanged.

### Key Entities *(include if data involved)*

- **Completed move**: A legal swap and the resulting board snapshot used to decide which reactions were caused by that move.
- **Moved creature**: Either creature participating in the completed swap; it may be prey or a predator in an eating group.
- **Affected prey**: A moved prey or stationary prey adjacent to a moved qualifying predator and meeting the existing predator threshold.
- **Reaction wave**: The existing simultaneous set of qualifying prey, predators, removals, and replacements evaluated from one snapshot.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every tested legal move that brings a third eligible predator adjacent to stationary prey triggers exactly one reaction for that prey.
- **SC-002**: Moving prey into an existing qualifying predator group continues to trigger the same reaction outcomes as before.
- **SC-003**: Moves that do not create or move a creature into a qualifying predator relationship produce no additional stationary-prey reactions.
- **SC-004**: When multiple affected prey qualify from one move, each is resolved once from the same board snapshot with no duplicate removals or scoring.
- **SC-005**: Existing replacement, apex, blast, scoring, refill, cascade, and move-counter outcomes remain correct in regression tests.

## Assumptions

- A move means a successfully completed legal adjacent swap; drag preview alone does not trigger a reaction.
- Only prey whose qualifying predator group includes a creature moved by the current swap are added as stationary reaction candidates. This prevents unrelated pre-existing groups elsewhere on the board from activating.
- Each moved creature is evaluated as a possible prey under existing rules; stationary prey are evaluated only when a moved creature is one of their qualifying predators.
- The rules and outcomes defined by the active predator-evolution feature remain in force.