# Feature Specification: Reaction Conflicts and Win Dialog

**Feature Branch**: Not created

**Created**: 2026-11-14

**Status**: Draft

**Input**: Rule Change: When looking for chain reactions, a creature can be part of only one reaction at a time. Choose the one with the highest number of predators when there's a conflict. Add a dismissible "You Won" modal when the player achieves the level goal.

## Clarifications

### Session 2026-11-14

- Q: If a five-predator reaction shares one predator with a four-predator reaction, should the remaining three predators still be able to react in the same wave? → A: Yes. Re-evaluate the remaining three predators and allow their reaction in the same wave if the prey is still available.
- Q: If an Apex predator reaction shares creatures with a 3×3 meld, which should take precedence? → A: A selected Apex predator reaction takes precedence and clears the board.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resolve Competing Reactions (Priority: P1)

As a player, I want a creature to participate in only one reaction at a time and the larger predator group to win a conflict, so chain reactions have consistent, understandable outcomes.

**Why this priority**: Reaction selection changes the board, score, subsequent cascades, and possible Apex outcomes.

**Independent Test**: Arrange two eligible reactions sharing a predator, with different predator counts, and verify the larger group reacts first and the other reacts if it still has at least three unassigned predators. Repeat after a refill and with independent reactions.

**Acceptance Scenarios**:

1. **Given** two eligible reactions share one predator and one has five predators while the other has three, **When** the wave resolves, **Then** the five-predator reaction is selected first and the other cannot react with its remaining two predators.
2. **Given** eligible reactions have no creatures in common, **When** the wave resolves, **Then** each can occur in the same wave.
3. **Given** a creature is prey in one eligible reaction and a predator in another, **When** the reactions conflict, **Then** the same larger-group rule applies and the creature participates in at most one selected reaction.
4. **Given** conflicting reactions have equal predator counts, **When** the wave resolves, **Then** the reaction whose prey is highest on the board, and then leftmost, is selected first.
5. **Given** a selected reaction changes the board and a refill creates new eligible reactions, **When** the next wave is evaluated, **Then** participation is evaluated afresh for that new board state.
6. **Given** five- and four-predator reactions share one predator and have no other participants in common, **When** the five-predator reaction is selected first, **Then** the other reaction can resolve in the same wave with its three remaining predators.
7. **Given** a selected Apex predator reaction shares creatures with a meld, **When** the wave resolves, **Then** the Apex reaction takes precedence and clears the board without a replacement.

### User Story 2 - Recognize and Dismiss a Win (Priority: P1)

As a player, I want a dismissible "You Won" message after I achieve the level goal, so I can clearly recognize my success and inspect the completed board.

**Why this priority**: Reaching the goal is a terminal outcome that should be unmistakable without forcing an immediate restart.

**Independent Test**: Reach the goal, wait for the full chain to settle, verify the modal appears once, dismiss it with its close control and with Escape in separate runs, and verify the completed board remains unchanged.

**Acceptance Scenarios**:

1. **Given** a move reaches or exceeds the level goal, **When** all reactions, refill effects, and resulting cascades have completed, **Then** the game displays a modal titled "You Won".
2. **Given** the goal is reached during a cascade that has not settled, **When** further waves are still resolving, **Then** the modal does not appear yet.
3. **Given** the win modal is visible, **When** the player dismisses it using a close control or Escape, **Then** the modal closes and the won state, completed board, score, and counters remain unchanged.
4. **Given** the player dismissed the win modal, **When** the completed level is displayed again without a reset, **Then** the modal does not reopen and the board remains non-playable.
5. **Given** the level has been won, **When** the player resets, **Then** any win modal closes and the new level starts normally; a subsequent win can show the modal again.

### Edge Cases

- Find prey and their eligible neighboring predators from the same pre-wave board state. After each selection, remove assigned creatures from consideration, reassess each unassigned prey's remaining predators, and discard candidates with fewer than three.
- Repeatedly select the eligible reaction with the most currently unassigned predators; break equal counts by prey position, top to bottom then left to right. A prey already assigned to a reaction cannot react again in that wave.
- A reduced reaction uses only its remaining unassigned predators for its predator count, replacement level, blast, convergence, and Apex eligibility.
- A creature may be affected as blast collateral in addition to belonging to a selected reaction; collateral is not a second reaction participation, and removals and scoring are counted once.
- Apply the rule to the first reaction wave after a move and to every later cascade wave. A newly created or surviving creature may participate in a later wave.
- A selected top-level meld triggers Apex. Otherwise, first provisionally select predator reactions without reserving meld creatures; if any provisionally selected reaction qualifies for Apex, it clears the board even when it overlaps a meld. If none qualifies, discard the provisional selection, reserve the selected melds, then select predator reactions again from the same snapshot using only creatures not reserved by those melds. If a reaction selected in this second pass qualifies for Apex, it also clears the board. Otherwise, ordinary melds and the reactions selected in the second pass resolve together.
- An eligible predator Apex formation triggers its existing board-clear outcome only if its reaction is selected. A selected predator Apex or selected top-level meld clears the board with no replacement, even when other selected activations exist.
- If a single move reaches the goal and otherwise meets the loss condition, the win outcome takes precedence and only the win modal is shown.
- If a reset or cancellation occurs before the winning cascade completes, obsolete effects must not display a win modal for the new level.
- The modal and its dismissal control must be usable with keyboard, mouse, and touch at desktop and mobile sizes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST evaluate eligible predator reactions for each wave from the same pre-wave board state using the existing prey, predator, and candidate rules.
- **FR-002**: Within a single wave, each creature MUST participate as prey or predator in at most one selected predator reaction.
- **FR-003**: The game MUST select the reaction with the highest number of currently unassigned eligible predators, assign its prey and predators, and reassess the remaining candidates after each selection using the same pre-wave board state.
- **FR-004**: Equal-count reactions MUST be considered in ascending prey row, then ascending prey column, so the selected set is deterministic.
- **FR-005**: The game MUST continue selecting reactions while an unassigned prey has at least three unassigned eligible predators; a reaction MUST use all of that prey's currently unassigned eligible predators.
- **FR-006**: A reaction that is neither selected in the resolving pass nor responsible for an Apex clear MUST NOT create a replacement, cause its own blast, trigger predator Apex, or contribute its own reaction animation or score in that wave. It MAY be considered again on a later board state under existing candidate rules.
- **FR-007**: Selected reactions MUST use their actual assigned predator count and positions for existing replacement, blast, convergence, and Apex rules, with each removed creature counted at most once for scoring.
- **FR-008**: A selected Apex predator reaction MUST take precedence over overlapping melds and clear the board. Selected top-level melds MUST retain their Apex outcome. If neither occurs in the provisional predator selection, that selection MUST be discarded and selected melds MUST reserve their creatures before predator reactions are selected again; any resulting selected Apex reaction MUST also clear the board.
- **FR-009**: Move acceptance, available-move detection, and idle hints MUST agree with the updated reaction selection rules and existing meld behavior.
- **FR-010**: Once the score meets or exceeds the level goal and all reactions, effects, refills, and cascades finish, the game MUST enter the won state and display one modal titled "You Won".
- **FR-011**: The win modal MUST be dismissible using a visible close control and Escape, and MUST be accessible and operable with keyboard, mouse, and touch on desktop and mobile.
- **FR-012**: Dismissing the modal MUST NOT alter the won state, board, score, turns, or free moves; it MUST NOT resume play or automatically reopen for the same completed level.
- **FR-013**: Reset MUST close any win modal, start a fresh playable level, and allow a later win to show a new modal. Cancellation or reset MUST prevent stale winning effects from displaying a modal for a replacement level.
- **FR-014**: A completed win MUST take precedence over a simultaneous loss condition; the failure modal MUST NOT be displayed for the same outcome.
- **FR-015**: The existing goal of 100 removed level-0 creatures, refill distribution, turn accounting, and unrelated game rules MUST remain unchanged.

### Key Entities *(include if data involved)*

- **Eligible predator reaction**: A prey and its qualifying adjacent predators identified from a single board state under existing rules.
- **Selected reaction**: An unassigned prey and its currently unassigned eligible predators, chosen by remaining predator count and deterministic position order.
- **Reaction wave**: A group of selected compatible reactions and any compatible melds resolved from one board state, followed by existing refill and cascade behavior.
- **Win modal**: A dismissible "You Won" notification shown once for a completed level after the level goal and all associated effects have settled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In every tested conflicting group with unequal available predator counts, the highest-count eligible reaction is selected first, remaining eligible groups are reassessed, and no creature participates in more than one selected reaction in that wave.
- **SC-002**: Every tested equal-count conflict produces the same topmost, then leftmost, selection regardless of the order in which candidates are discovered.
- **SC-003**: Every tested set of independent eligible reactions resolves together, and later cascades evaluate participation independently for their new board state.
- **SC-004**: In all tested goal-reaching moves, including those with multiple cascades, exactly one "You Won" modal appears after the board settles, and no failure modal appears for that outcome.
- **SC-005**: In every tested close-control and Escape dismissal, the modal closes without changing the completed board, score, or counters; reset enables a fresh level and a subsequent win notification.
- **SC-006**: Desktop and mobile tests verify that players can read and dismiss the win modal using their available input method, without obscured controls or unintended state changes.
- **SC-007**: Tested moves, hints, scoring, melds, and Apex outcomes remain consistent with the new reaction selection and existing rules.

## Assumptions

- "Reaction" in the new conflict rule means a predator-and-prey eating reaction; existing nine-creature meld selection remains in effect, with selected predator Apex taking precedence over overlapping melds and ordinary melds reserving their creatures before non-Apex outcomes.
- When available predator counts tie, topmost then leftmost prey wins the tie. Counts are reassessed after each selection against the same pre-wave board state, using only unassigned creatures.
- The level is won when at least 100 level-0 creatures have been removed, but the notification waits until the current move and all cascades settle.
- Dismissal leaves the won level terminal, matching the existing failure-dialog behavior; Reset is the route to a new game.
- New levels, rewards, sound, persistence, changes to the goal, and redesigning the existing failure dialog are out of scope.