# Feature Specification: Level 0 Creature Animation

**Feature Branch**: Not created

**Created**: 2026-11-15

**Status**: Draft

**Input**: Replace the level-0 number on the existing board with the approved animated paramecium, preserving independent resting animation, creature identity, cell interaction, game effects, and gameplay. Keep levels 1-4 as numbered placeholders and retain the colored cell backgrounds. Evaluate performance with several dozen level-0 creatures on desktop and mobile.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See Living Level-0 Creatures (Priority: P1)

As a player, I want level-0 cells to show the approved animated paramecium instead of a number, so the first creatures feel alive while I can still recognize and play the board.

**Why this priority**: This is the visible replacement requested for the lowest creature level and the first opportunity to judge the art at board size.

**Independent Test**: Start a board containing all five levels, observe several level-0 creatures at desktop and mobile sizes, and compare their appearance and motion with the approved [resting preview](../../docs/art/paramecium-resting-preview.html).

**Acceptance Scenarios**:

1. **Given** a board contains level-0 creatures, **When** it is displayed, **Then** each occupied level-0 cell shows the approved one-eyed paramecium rather than the number 0, with its existing colored cell background retained.
2. **Given** the same board contains creatures at levels 1 through 4, **When** it is displayed, **Then** those levels remain numbered placeholders with their existing cell colors.
3. **Given** a paramecium is resting, **When** the player watches it, **Then** its cilia ripple around the body, it gently rotates back and forth, its eyelids blink over the eye, its pupil briefly looks in different directions and returns to center, and its internal shapes drift slightly within their general areas.
4. **Given** several level-0 creatures are visible, **When** their resting motions are observed, **Then** their ripple, rotation, blink, gaze, and internal drift use independent timing rather than a shared synchronized cycle; occasional coincidences are allowed.
5. **Given** a level-0 cell is selected or dragged, **When** its artwork rotates or animates, **Then** selection, the cell background, and the interactive target remain aligned with the cell and do not rotate with the artwork.

### User Story 2 - Preserve Play and Effects (Priority: P1)

As a player, I want animated creatures to behave correctly during moves, reactions, hints and resets, so the new art does not interrupt or change the game.

**Why this priority**: The art must work throughout normal play, not only on a motionless starting board.

**Independent Test**: Perform swaps, hint flashes, reactions, falling/refill, and resets on controlled boards containing level-0 creatures; compare outcomes and counters with the existing rules while observing the corresponding visual effects.

**Acceptance Scenarios**:

1. **Given** a level-0 creature is dragged or swapped, **When** the move is accepted or cancelled, **Then** the correct creature follows the existing movement or restoration behavior and its resting animation does not restart solely because the board is redrawn.
2. **Given** a surviving level-0 creature falls during refill, **When** it reaches its new cell, **Then** it remains the same creature and continues its own animation timing; a newly spawned level-0 creature receives its own timing.
3. **Given** a hint or reaction affects a level-0 cell, **When** the existing flash occurs, **Then** the affected cell visibly flashes with the established timing, and unaffected cells are not falsely highlighted.
4. **Given** a level-0 creature is removed by a reaction, meld, blast, or Apex event, **When** the effect completes, **Then** its artwork disappears with that creature and no obsolete animation remains on the board.
5. **Given** reset occurs while a creature is moving, flashing, or animating, **When** the new board is ready, **Then** effects and artwork from the previous board cannot alter or reappear on it.
6. **Given** the same starting board, moves, and gameplay random sequence, **When** visual animations are enabled, **Then** board outcomes, score, turns, free moves, win/loss, and refill results remain the same as without the visual animations.

### User Story 3 - Play Responsively With Many Creatures (Priority: P2)

As a player on desktop or mobile, I want the board to remain responsive when many paramecia are visible, so the visual upgrade does not make normal play difficult.

**Why this priority**: Many cells can contain the same level, so a visually correct single-character preview is not sufficient evidence for gameplay.

**Independent Test**: On a controlled board with 64 level-0 creatures, observe resting animation and exercise board interaction for at least 30 seconds on representative desktop and mobile configurations; record device, viewport, responsiveness and frame timing.

**Acceptance Scenarios**:

1. **Given** a board contains 64 level-0 creatures, **When** the player views and interacts with it on a representative desktop or mobile configuration, **Then** all occupied cells remain visible and selectable without overlapping unrelated cells or blocking input.
2. **Given** a dense board is animated, **When** frame timing is measured over at least 30 seconds in the foreground, **Then** at least 95% of observed frame intervals are at or below 33.4 ms on each tested representative configuration, with results and test conditions recorded.
3. **Given** the player has requested reduced motion, **When** the board is displayed, **Then** resting motion is suppressed while creatures remain recognizable and gameplay effects and interaction remain usable.

### Edge Cases

- The approved reference has one round white eye, a black pupil, a black outline, cilia, and internal details; pupil glances may approach but must not cross the inside of the eye outline. The upper and lower eyelids move over the eye instead of flattening the eyeball.
- Resting body rotation alternates between 12- and 24-degree targets around the creature center. The eye follows the body's position but remains upright, with horizontal eyelids.
- Pupil glances include all eight neighboring directions, return to center, and spend less time looking away than in the centered pause. Individual blink and gaze schedules are independent.
- A redraw, selection change, hint phase, cancelled gesture, or effect must not reset a surviving creature's resting phase. Identity follows the creature rather than the cell; replacement creatures begin with their own state.
- Animation is presentation only: it must not consume the random sequence that determines generation, refill, or other gameplay outcomes.
- Artwork must not obscure neighboring cells or be clipped during its gentle rotation, including at the edges of the board; selection and pointer targets remain fixed to their cells.
- No level-0 creatures, a board full of level-0 creatures, repeated resets, and a reset during an in-progress effect must all remain valid.
- Respect reduced-motion settings for idle animation without suppressing the visual communication required for existing hint, reaction, or flash effects.
- If artwork cannot be loaded, the player must retain a recognizable level-0 placeholder and a playable board rather than seeing a blank or blocked cell.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every visible level-0 creature MUST use the approved paramecium character instead of displaying the number 0; existing cell background colors MUST remain.
- **FR-002**: Levels 1 through 4 MUST retain their existing numbered placeholder appearance and cell colors.
- **FR-003**: The level-0 resting appearance MUST match the approved [character concept](../../docs/art/paramecium-concept.svg) and [resting preview](../../docs/art/paramecium-resting-preview.html), including cilia ripple, alternating 12-24 degree body rotation, eyelid blinking, pupil glances, and small internal drift.
- **FR-004**: Eyelids MUST cover the eye from the top and bottom without deforming the eyeball; the eye and eyelids MUST remain upright and horizontal while the body rotates; the pupil MUST look briefly in each of eight possible directions, remain inside the eye outline, and return to center between glances.
- **FR-005**: Each creature's resting motion MUST have independently varied timing and phase; different creatures MAY occasionally coincide but MUST NOT be driven by one synchronized animation cycle.
- **FR-006**: Each surviving creature MUST retain its individual resting-animation state across swaps, falling, selection changes, redraws, hint flashes, and other visual updates. New or replacement creature identities MUST receive their own state.
- **FR-007**: Only the creature artwork may rotate; the cell background, selection indicator, and pointer target MUST remain fixed and usable for mouse and touch input.
- **FR-008**: Existing swap, drag, cancellation, reaction, hint, meld, Apex, removal, falling, refill, and reset effects MUST remain correctly associated with the relevant creature and cell.
- **FR-009**: Existing hint and reaction flashes MUST remain visible on affected level-0 cells with their established timing, without falsely flashing unaffected cells.
- **FR-010**: Removed or reset creatures MUST NOT leave stale artwork, active effects, or callbacks that alter the replacement board.
- **FR-011**: Resting animation and its visual variation MUST NOT change game rules, creature identity, scoring, turns, free moves, the goal of 100, win/loss behavior, or gameplay random draws.
- **FR-012**: The game MUST remain readable, selectable, and responsive on desktop and mobile with up to 64 animated level-0 creatures, and MUST be evaluated against the performance scenario in User Story 3.
- **FR-013**: With a reduced-motion preference, the game MUST suppress resting animation while preserving recognizable creatures, interaction, and existing required effect feedback.
- **FR-014**: If the level-0 artwork is unavailable, the game MUST display a recognizable level-0 placeholder and preserve board interaction.
- **FR-015**: The approved editable character master MUST be retained for later refinement; this feature MUST NOT introduce artwork or animation for levels 1 through 4.

### Key Entities *(include if data involved)*

- **Level-0 creature**: An existing game creature with a stable identity, presented as the approved paramecium while preserving its gameplay level and behavior.
- **Resting visual state**: Per-creature motion timing and phase for cilia, rotation, eyelids, gaze, and internal drift; it does not determine game outcomes.
- **Board cell**: The fixed interaction and selection area containing a colored background and the current creature's presentation.
- **Creature lifecycle**: Creation, movement, survival across effects, removal, and reset; visual state follows the current creature identity until removal or reset.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all tested ready boards, every occupied level-0 cell shows a paramecium and every occupied level 1-4 cell retains its number and existing color.
- **SC-002**: Across controlled observations, all five approved resting motions are visible, all eight gaze directions can occur, and multiple creatures demonstrate independent timing without requiring random movements never to coincide.
- **SC-003**: In tested swaps, redraws, hint flashes, cascades and refills, every surviving level-0 creature retains its identity-associated animation state and removed creatures leave no stale visuals.
- **SC-004**: For identical controlled boards, moves and gameplay random sequences, all tested board states, score, turns, free moves and terminal outcomes match the existing rules with and without visual animation.
- **SC-005**: In the 64-creature foreground scenario, at least 95% of frame intervals are at or below 33.4 ms during a 30-second observation on each tested representative desktop and mobile configuration; record devices and conditions rather than claiming universal device performance.
- **SC-006**: Desktop mouse and mobile touch tests complete selection, dragging, cancellation and reset without artwork obscuring neighboring cells or shifting the interactive target.
- **SC-007**: Reduced-motion and missing-artwork tests preserve an identifiable, playable level-0 cell; reset during effects produces no stale updates.

## Assumptions

- This feature adds only the **resting** paramecium appearance and motion; dedicated fearful, move, attack, dying, exploding, evolving, and spawning character animations remain future work. Existing gameplay effects continue unchanged.
- The approved visual references are the existing [SVG master](../../docs/art/paramecium-concept.svg) and [resting preview](../../docs/art/paramecium-resting-preview.html); the preview is a behavioral reference rather than a production implementation.
- The existing board is 8x8, with stable per-creature IDs, five levels, and a goal of 100 level-0 removals. Visual variation may use independent randomness or deterministic per-creature variation as long as gameplay randomness is unaffected.
- Reusable transparent artwork layers and shared pre-rendered cilia frames are a proposed implementation strategy; production asset format and rendering details belong in planning and must preserve the observable behavior above.
- The 33.4 ms frame-interval criterion is a minimum representative-device validation target, not a guarantee for every device. The existing 60 fps project target remains desirable.
- The fallback for unavailable artwork is the existing colored level-0 numbered placeholder. No changes to the game engine, scoring, other levels' creature designs, or level progression are required by this specification.