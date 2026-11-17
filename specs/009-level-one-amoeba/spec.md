# Feature Specification: Level 1 Amoeba Animation

**Feature Branch**: `[009-level-one-amoeba]`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Incorporate the animated Amoeba in place of the number one in the game prototype like we did for the number 0 paramecium."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See Living Level-1 Amoebae (Priority: P1)

As a player, I want level-1 cells to show the approved animated amoeba instead of the number 1, so that the creature feels alive and is recognizable while I play.

**Why this priority**: Replacing the level-1 placeholder is the central player-visible outcome of this feature.

**Independent Test**: Display a controlled board containing levels 0 through 4 at desktop and mobile sizes. Confirm level 1 uses the approved amoeba design and resting motion, level 0 retains its paramecium, levels 2 through 4 remain numbered, and all cell colors remain unchanged.

**Acceptance Scenarios**:

1. **Given** a ready board contains level-1 creatures, **When** the board is displayed, **Then** each level-1 cell shows the approved golden amoeba instead of the number 1 while retaining its existing colored cell background.
2. **Given** a level-1 amoeba is resting, **When** the player observes it, **Then** its body undulates, its small upper-right lobe waves, its eye blinks and glances around, its eyebrow counter-tilts with horizontal gaze, and its interior details drift without touching one another or the body edge.
3. **Given** multiple level-1 amoebae are visible, **When** their resting animation is observed, **Then** their phases and timing vary independently rather than moving as a synchronized group.
4. **Given** levels 0 and 2 through 4 are also visible, **When** the player views the board, **Then** level 0 remains the paramecium and levels 2 through 4 remain numbered placeholders with their existing colors.

---

### User Story 2 - Play Without Gameplay Changes (Priority: P1)

As a player, I want the amoeba artwork to follow the existing level-1 creature through play, so that animation does not change board rules or interfere with interaction and effects.

**Why this priority**: The visual replacement must preserve the tested prototype mechanics and remain dependable during ordinary play.

**Independent Test**: Use controlled boards containing level-1 creatures to perform selection, swaps, accepted and cancelled moves, reactions, hints, falling/refill, and reset. Compare board state and game outcomes with the existing rules while checking that the right creature and cell receive each visual effect.

**Acceptance Scenarios**:

1. **Given** a level-1 creature is selected or moved, **When** its artwork animates, **Then** the cell background, selection indicator, and interaction target remain fixed to the cell and mouse and touch input continue to work.
2. **Given** a level-1 creature survives a move, redraw, hint, or refill, **When** it appears in its updated cell, **Then** it retains its creature identity and resting-animation phase rather than restarting solely because it moved or the board redrew.
3. **Given** a level-1 creature is removed or the board is reset during animation or an effect, **When** the board settles, **Then** the removed creature leaves no stale artwork, effect, or update on the current board.
4. **Given** a controlled board, move sequence, and gameplay random sequence, **When** amoeba animation is enabled, **Then** gameplay state and outcomes match those produced without the visual animation.

---

### User Story 3 - Keep the Board Readable and Responsive (Priority: P2)

As a desktop or mobile player, I want the amoeba to remain recognizable and the board responsive when many level-1 creatures are present, so that the art remains practical during play.

**Why this priority**: Level 1 can occupy many cells at once, and character readability and responsiveness must hold beyond a single preview.

**Independent Test**: Observe and interact with a controlled board containing 64 level-1 creatures for at least 30 seconds on representative desktop and mobile configurations. Repeat with reduced motion enabled and with the amoeba artwork unavailable.

**Acceptance Scenarios**:

1. **Given** a board contains 64 level-1 creatures, **When** it is viewed and interacted with on representative desktop and mobile configurations, **Then** all occupied cells remain visible and selectable without artwork overlapping unrelated cells or blocking input.
2. **Given** the player has requested reduced motion, **When** the board is displayed, **Then** resting animation is suppressed while the amoeba remains recognizable and gameplay interaction and required effects remain usable.
3. **Given** the amoeba artwork is unavailable, **When** a level-1 cell is displayed, **Then** the cell shows a recognizable numbered level-1 fallback and remains playable.

### Edge Cases

- A level-1 creature may be partially occluded by an active hint or reaction effect; the established effect remains visible and applies only to its intended cells.
- The body may reach its maximum resting deformation while an interior detail is near its permitted travel limit; internal details must remain separated and within the amoeba silhouette throughout motion.
- The eyebrow tilts around its eye-contact position; left and right pupil glances produce opposite eyebrow tilts without breaking contact with the eye.
- The eye, eyelids, and pupil remain recognizable while the body contour and localized upper-right lobe move.
- A creature may move, fall, be selected, or be redrawn while blinking or glancing; its resting state follows its identity and does not become attached to the old cell.
- Empty boards, boards without level-1 creatures, dense level-1 boards, repeated resets, and reset during an in-progress effect remain valid.
- Reduced-motion settings suppress idle animation without suppressing necessary hint, reaction, or gameplay feedback.
- Missing or failed artwork leaves a visible level-1 fallback and usable interaction target.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every visible level-1 creature MUST display the approved amoeba character instead of the number 1, while retaining the existing cell background color.
- **FR-002**: Level 0 MUST continue to display the approved paramecium; levels 2 through 4 MUST retain their existing numbered placeholder appearance and cell colors.
- **FR-003**: The level-1 resting appearance MUST match the approved [amoeba character concept](../../docs/art/amoeba-concept.svg) and [amoeba resting study](../../docs/art/amoeba-resting-preview.html), including its golden three-lobed silhouette, inset eye, rounded counter-tilting eyebrow, and interior details.
- **FR-004**: Resting animation MUST visibly undulate the body and wave the small upper-right lobe while preserving the approved silhouette and keeping the eye, eyelids, and eyebrow recognizable.
- **FR-005**: The eye MUST blink and glance in eight directions before returning to center; horizontal pupil movement MUST tilt the eyebrow in the opposite direction around its eye-contact position.
- **FR-006**: Interior details MUST drift within their assigned areas, remain inside the body, and avoid collisions with one another throughout animation.
- **FR-007**: Each amoeba MUST have independently varied resting-animation timing and phase; different creatures MAY occasionally coincide but MUST NOT be driven by one synchronized animation cycle.
- **FR-008**: Each surviving level-1 creature MUST retain its identity-associated resting state across moves, falling/refill, selection changes, redraws, hint flashes, and other visual updates. New or replacement creature identities MUST receive their own state.
- **FR-009**: Only creature artwork MAY move or deform; cell backgrounds, selection indicators, and pointer targets MUST remain fixed and usable for mouse and touch input.
- **FR-010**: Existing swap, drag, cancellation, reaction, hint, removal, falling, refill, and reset behavior MUST remain correctly associated with the relevant creature and cell.
- **FR-011**: Animation MUST NOT alter game rules, creature identity, scoring, turns, free moves, win/loss behavior, refill results, or the gameplay random sequence.
- **FR-012**: The board MUST remain readable, selectable, and responsive on desktop and mobile with up to 64 animated level-1 creatures, and MUST be evaluated against the dense-board scenario in User Story 3.
- **FR-013**: With a reduced-motion preference, the game MUST suppress level-1 resting animation while preserving recognizable artwork, interaction, and required effect feedback.
- **FR-014**: If the amoeba artwork is unavailable, the game MUST display a recognizable level-1 numbered fallback and preserve board interaction.
- **FR-015**: The approved editable amoeba concept MUST be retained for later refinement; this feature MUST NOT introduce character artwork for levels 2 through 4 or change the level-0 paramecium.

### Key Entities *(include if data involved)*

- **Level-1 creature**: An existing game creature at level 1, presented as the approved amoeba while retaining its gameplay level, identity, and behavior.
- **Resting visual state**: Per-creature timing and phase for body undulation, localized lobe motion, blinking, gaze, eyebrow tilt, and interior drift; it does not determine game outcomes.
- **Board cell**: The fixed interaction and selection area containing a colored background and the current creature's presentation.
- **Creature lifecycle**: Creation, movement, survival across effects, removal, and reset; visual state follows the current creature identity until removal or reset.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all tested ready boards, every occupied level-1 cell shows the approved amoeba, every level-0 cell retains its paramecium, and every level 2 through 4 cell retains its number and existing color.
- **SC-002**: In controlled observations, body undulation, upper-right lobe motion, blinking, eight-way gaze, counter-tilting eyebrow motion, and interior drift are each observable; interior details remain separated and within the body throughout the tested motion.
- **SC-003**: In tested moves, redraws, hints, reactions, cascades, refills, and resets, surviving level-1 creatures retain identity-associated animation state and removed creatures leave no stale visuals or effects.
- **SC-004**: For identical controlled boards, moves, and gameplay random sequences, all tested board states, score, turns, free moves, refill results, and terminal outcomes match the existing rules with and without visual animation.
- **SC-005**: With 64 level-1 creatures, at least 95% of observed frame intervals are at or below 33.4 ms during a 30-second foreground observation on each tested representative desktop and mobile configuration; devices and conditions are recorded.
- **SC-006**: Desktop mouse and mobile touch tests complete selection, dragging, cancellation, and reset without artwork obscuring neighboring cells or shifting interaction targets.
- **SC-007**: Reduced-motion and missing-artwork tests preserve an identifiable, playable level-1 cell, and resetting during effects produces no stale updates.

## Assumptions

- The approved visual references are the existing [amoeba concept](../../docs/art/amoeba-concept.svg) and [amoeba resting study](../../docs/art/amoeba-resting-preview.html). The study demonstrates intended resting behavior and is not itself a production implementation requirement.
- The level-0 paramecium feature establishes the integration precedent for artwork, independent creature motion, interaction preservation, effects, accessibility, fallback, and dense-board validation.
- This feature changes only the presentation of level-1 creatures and their resting animation. Existing level progression, creature interactions, scoring, and all gameplay rules remain unchanged.
- Levels 2 through 4 remain numbered placeholders. Dedicated move, attack, fearful, dying, exploding, evolving, and spawning amoeba animations remain future work; existing gameplay effects continue unchanged.
- The existing 8 x 8 board can contain up to 64 level-1 creatures. The dense-board timing threshold is a representative-device validation target, not a guarantee for every device.
- If artwork cannot be presented, the existing numbered level-1 placeholder is an acceptable fallback.
