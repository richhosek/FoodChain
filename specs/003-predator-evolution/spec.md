# Feature Specification: Predator Evolution and Apex Formation

**Feature Branch**: `003-predator-evolution`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: Update reaction replacement levels according to predator count, constrain apex to the specified maximum-level cardinal or diagonal formations, and animate predator convergence for 1000 milliseconds before the reaction.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Evolve Consumed Creatures (Priority: P1)

As a player, I want the eaten creature's replacement level to depend on how many predators ate it, so larger predator groups produce a stronger creature without exceeding the level cap.

**Why this priority**: The replacement level determines the result of every eating reaction and affects subsequent play.

**Independent Test**: Trigger reactions with three predators and with four or more predators, including predators at the maximum level, and verify the resulting creature level.

**Acceptance Scenarios**:

1. **Given** a creature is eaten by exactly three predators, **When** the reaction resolves, **Then** its replacement has the same level as those predators.
2. **Given** a creature is eaten by four or more predators in a non-apex reaction, **When** the reaction resolves, **Then** its replacement is one level above those predators unless that would exceed the level maximum.
3. **Given** a non-apex reaction has predators at the highest level available in the level, **When** the reaction resolves, **Then** the replacement remains at that highest level rather than exceeding the cap.

### User Story 2 - Require a Formation for an Apex Reaction (Priority: P1)

As a player, I want an apex reaction to require a recognizable predator formation, so a large but differently arranged group does not trigger the special apex outcome.

**Why this priority**: Apex is a distinct board-wide outcome, so its positional trigger must be predictable and fair.

**Independent Test**: Set up maximum-level predators around a prey in canonical and noncanonical arrangements and verify whether the apex outcome occurs.

**Acceptance Scenarios**:

1. **Given** at least four maximum-level predators surround a prey and all four orthogonal adjacent positions are occupied by predators, **When** the reaction resolves, **Then** the apex reaction occurs.
2. **Given** at least four maximum-level predators surround a prey and all four diagonal positions are occupied by predators, **When** the reaction resolves, **Then** the apex reaction occurs.
3. **Given** four or more predators are arranged around a prey but neither all four orthogonal positions nor all four diagonal positions are occupied, **When** the reaction resolves, **Then** the apex reaction does not occur and the ordinary reaction rules apply.
4. **Given** fewer than four predators are present, **When** the reaction resolves, **Then** the apex reaction does not occur.
5. **Given** at least four maximum-level predators satisfy one of the formations, **When** the reaction resolves, **Then** the apex reaction occurs.

### User Story 3 - See Predators Converge Before a Reaction (Priority: P1)

As a player, I want to see predators converge on their prey immediately before it is consumed, so the reaction is visually understandable.

**Why this priority**: A brief, consistent cue makes the cause of the reaction legible before the board changes.

**Independent Test**: Trigger a reaction and observe that the predators visibly move toward the prey during the specified 1000 millisecond interval before the reaction outcome begins.

**Acceptance Scenarios**:

1. **Given** a committed move causes an eating reaction, **When** that reaction begins, **Then** its predators visibly converge on the prey over 1000 milliseconds before any creatures are removed or replaced.
2. **Given** multiple reactions occur in the same wave, **When** the wave begins, **Then** each reaction's predators converge on its prey before that wave resolves.
3. **Given** a move causes no reaction, **When** the move completes, **Then** no convergence animation is shown.

### Edge Cases

- The predator level is one level above the prey level under the existing eating rule; replacement calculations use the predators' level and cap at the highest level available, currently level 4.
- A prey may have more than four predators. Apex formation requires the complete set of four orthogonal positions or the complete set of four diagonal positions; additional predators do not invalidate a completed formation.
- If a level has fewer than four diagonal board positions available at an edge or corner, the full diagonal formation cannot be present there; apex eligibility still requires all four diagonal positions.
- A group may fill the four orthogonal positions and four diagonal positions simultaneously; this still produces one apex reaction for that prey.
- If several prey react in one wave, removals and replacements continue to follow the existing simultaneous-wave behavior, and each eligible prey is evaluated against the same board snapshot.
- The requested convergence duration is exactly 1000 milliseconds; the reaction resolution must follow that cue rather than precede it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: An eating reaction MUST continue to require at least three neighboring predators exactly one level above the prey, including diagonal neighbors.
- **FR-002**: When exactly three predators eat a creature, its replacement MUST have the same level as the predators.
- **FR-003**: When four or more predators eat a creature in a non-apex reaction, its replacement MUST have a level one higher than the predators, capped at the highest creature level available in that level.
- **FR-004**: A replacement creature MUST NOT exceed the maximum creature level available in its level.
- **FR-005**: An apex reaction MUST require at least four maximum-level predators and either all four orthogonally adjacent positions or all four diagonally adjacent positions around the prey to be occupied by predators.
- **FR-006**: Four or more predators MUST NOT trigger an apex reaction when neither complete four-position formation is present; the ordinary reaction outcome MUST apply instead.
- **FR-007**: A qualifying apex reaction MUST retain the existing special outcome: clear the entire board and leave no replacement creature. Non-apex blast thresholds and outcomes MUST otherwise remain unchanged.
- **FR-008**: Before any reaction wave removes or replaces creatures, the predators involved in each reaction MUST visibly converge on the prey over 1000 milliseconds.
- **FR-009**: A move that does not cause a reaction MUST NOT show the predator convergence animation.
- **FR-010**: Convergence MUST occur before the associated reaction outcome and be applied consistently to every reaction in a simultaneous wave.
- **FR-011**: Existing turn, free-move, scoring, refill, cascade, and win/loss behavior MUST continue to apply after reactions, except where explicitly changed by these requirements.

### Key Entities *(include if data involved)*

- **Eating reaction**: A prey and its adjacent predators, evaluated from a board state, with a replacement level determined by predator count.
- **Predator formation**: The occupied orthogonal or diagonal positions around prey that determine whether the special apex outcome is eligible.
- **Reaction cue**: The brief convergence of predators on a prey immediately before the reaction's board effects.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every tested three-predator reaction replaces the prey with a creature at the predator level.
- **SC-002**: Every tested non-apex reaction with four or more predators replaces the prey one level above the predator level, except that no replacement exceeds the level maximum.
- **SC-003**: Apex occurs in every tested case with at least four maximum-level predators and a complete orthogonal or diagonal formation, and in no tested case lacking either requirement.
- **SC-004**: Existing non-apex blast outcomes remain unchanged for all tested predator counts and arrangements that do not qualify for apex.
- **SC-005**: In every tested reaction, predators visibly converge over 1000 milliseconds before removals or replacement begin; non-reacting moves show no convergence cue.
- **SC-006**: Existing cascade, scoring, and move-counter outcomes remain correct in tests that exercise the updated reaction results.

## Assumptions

- The game continues to use five creature levels, currently numbered 0 through 4, with level 4 as the maximum.
- A predator's level is exactly one higher than the prey's level, as in the current rules.
- Apex retains its existing maximum-predator-level condition, requires one of the specified four-position formations, and clears the whole board without a replacement creature.
- The existing ordinary blast behavior remains in effect for non-apex reactions with four or more predators, including a replacement creature protected at the prey position.
- The requested convergence animation duration is exactly 1000 milliseconds, with no additional pause specified.
- Board size, input behavior, creature-generation distribution, and level goal remain unchanged.