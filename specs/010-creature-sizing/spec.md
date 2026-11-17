# Feature Specification: Creature Sizing by Food-Chain Rank

**Feature Branch**: Not created

**Created**: 2026-11-16

**Status**: Draft

**Input**: Size creatures relative to their board cells according to their rank in the active food chain, using 75%, 80%, 85%, 90%, and 95% from lowest to highest. Shift the same sizes to levels 1-5 when that food chain replaces levels 0-4.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the Hierarchy on the Board (Priority: P1)

As a player, I can see higher-ranked creatures rendered larger than lower-ranked creatures, so I have a visual clue about their food-chain hierarchy alongside the existing key.

**Why this priority**: The current five-level board is playable today and is the primary place players compare creatures.

**Independent Test**: Display a board containing levels 0-4 and measure each creature's resting visual bounds against its cell; compare the sizes and verify the existing hierarchy key remains available.

**Acceptance Scenarios**:

1. **Given** the active food chain is levels 0-4, **When** creatures are shown at rest, **Then** levels 0, 1, 2, 3, and 4 occupy respectively 75%, 80%, 85%, 90%, and 95% of a cell's side length as defined by the measurement rule below.
2. **Given** multiple creatures of the same level appear in different cells, **When** the board is viewed, **Then** their resting bounds use the same level-specific percentage regardless of position.
3. **Given** the board contains animated level-0 and level-1 artwork and numbered placeholders for levels 2-4, **When** the board is shown, **Then** each representation follows the same rank-based sizing rule while retaining its recognizable shape and the existing hierarchy key.
4. **Given** any active creature type is temporarily absent from the board, **When** other creatures are shown, **Then** their sizes remain tied to their ranks in the active food chain and do not change merely because of the absence.

### User Story 2 - Keep the Clue When the Food Chain Shifts (Priority: P2)

As a player, I can interpret relative size consistently if a future stage replaces the lowest creature with a new highest creature, so the size cue remains aligned with the current hierarchy.

**Why this priority**: The meaning of relative size must survive the anticipated shift without making the present feature depend on implementing stage progression.

**Independent Test**: Evaluate a representative five-level active food-chain configuration of levels 1-5 and verify its assigned sizes, independently of adding level progression to the game.

**Acceptance Scenarios**:

1. **Given** a future active chain of levels 1-5, **When** its sizing is evaluated, **Then** levels 1, 2, 3, 4, and 5 use respectively 75%, 80%, 85%, 90%, and 95%.
2. **Given** the active chain changes from levels 0-4 to levels 1-5, **When** the new chain is displayed, **Then** level 1 is the smallest, level 5 is the largest, and levels 2-4 each move to the size associated with their new rank.
3. **Given** a future five-level chain begins at any nonnegative level, **When** its consecutive creature levels are evaluated, **Then** the same five sizes apply in ascending rank order.

### User Story 3 - Play Normally with Resized Creatures (Priority: P1)

As a player, I can select and move creatures and understand their effects on desktop and mobile without the new visual sizes changing how the game plays.

**Why this priority**: The hierarchy cue must not make the board harder to play or change game outcomes.

**Independent Test**: Use mouse and touch on a mixed-level board, including cell edges, and observe a move, an effect, a refill, and a reset while checking their established outcomes and presentation.

**Acceptance Scenarios**:

1. **Given** a creature of any active rank, **When** a player selects or drags from its cell using mouse or touch, **Then** the entire existing cell interaction area remains usable and adjacent-swap behavior is unchanged.
2. **Given** a creature is moving, falling, selected, highlighted, or shown in an existing reaction effect, **When** it is displayed, **Then** its rank-based size remains consistent and the existing cell colors, selection indicators, and effect timing remain intact.
3. **Given** a board is refilled or reset, **When** creatures appear, **Then** each uses its active-rank size and game rules, counters, and random outcomes are unaffected by sizing.
4. **Given** reduced motion is enabled or animated artwork is unavailable, **When** the resting or fallback representation is shown, **Then** it remains recognizable, uses the same rank-based size, and remains playable.

### Edge Cases

- Empty cells during reactions and refill contain no creature to size and do not change the active chain or sizes of remaining creatures.
- A board containing only one or a subset of active creature types still uses their ranks within the full active chain, not their ranks among the currently visible types.
- Edge and corner creatures remain within their cells at rest; transient movement between cells follows the existing movement behavior without altering interaction boundaries.
- Artwork with non-square proportions is scaled uniformly; its shorter dimension may be less than the stated percentage. Transparent padding, the colored cell, selection border, and effects are excluded from the resting creature bounds.
- Animated deformation may change the visible bounds during motion; the specified measurement applies to the neutral resting pose, and animation must not spill into neighboring cells while the creature is stationary.
- The behavior for active chains with fewer or more than five ranks is outside this feature and must be specified before such a chain is introduced; do not infer it from temporarily missing board occupants.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST associate the five consecutive levels in the active food chain with ascending rank positions from lowest to highest, independent of which levels currently appear on the board.
- **FR-002**: The resting creature bounds for ranks 1-5 MUST have longest side lengths of 75%, 80%, 85%, 90%, and 95%, respectively, of the side length of the square cell.
- **FR-003**: The resting creature bounds MUST enclose the visible creature artwork or fallback number, excluding transparent padding and the cell background, selection border, and cell-wide effects. The resting representation MUST be centered in the cell and scaled uniformly without distortion.
- **FR-004**: In the current active chain, the game MUST apply the rank sizes to levels 0-4 in order. A five-level chain beginning at another nonnegative level MUST use the same rank-to-size mapping without requiring a distinct sizing rule for each level number.
- **FR-005**: The rank sizing rule MUST apply consistently to animated creatures, their reduced-motion resting representations, and numbered placeholders or fallback representations.
- **FR-006**: Creatures of the same level in the same active chain MUST use the same resting size across the board, including after movement, reactions, refill, redraw, and reset.
- **FR-007**: A temporary absence of a level or a temporarily empty cell MUST NOT change the active chain or cause remaining creatures to be resized.
- **FR-008**: The game MUST preserve cell geometry, colors, hierarchy key, selection indication, and full-cell mouse and touch interaction areas while resizing creature visuals.
- **FR-009**: Existing animation, movement, hint and reaction effects, reduced-motion behavior, and fallback playability MUST remain functional; stationary animated artwork MUST remain within its cell.
- **FR-010**: Sizing MUST NOT alter game rules, creature identities, move legality, scores, progression, refill outcomes, or gameplay randomness.
- **FR-011**: The board MUST remain readable and playable at supported desktop and mobile sizes, with equivalent mouse and touch actions.
- **FR-012**: Each creature design MUST define its own padding-free neutral bounding box as part of the design. Board sizing MUST use that box; the space around the creature comes from its rank percentage, not added bounding-box padding.

### Key Entities *(include if feature involves data)*

- **Active food chain**: The five consecutive creature levels eligible for the current stage, ordered from lowest to highest independently of their current board presence.
- **Creature rank**: A position from 1 through 5 in the active food chain, used to determine the visual size of each creature of that level.
- **Resting creature bounds**: The design-authored, padding-free smallest rectangle enclosing the visible creature representation in its neutral resting pose, excluding cell decorations.
- **Board cell**: The unchanged square containing a creature, whose side length is the reference for the size percentages and whose interaction area remains available to the player.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all tested current-chain boards, the longest resting visual bound for every represented level is within 1 percentage point of its specified cell-size percentage, at desktop and mobile sizes.
- **SC-002**: In tested five-level chains starting at 0, 1, and at least one other nonnegative level, all five ranks map in order to 75%, 80%, 85%, 90%, and 95%; an absent level does not change the mapping.
- **SC-003**: In all tested mouse and touch scenarios, cell-edge selection and equivalent moves remain usable, and the same initial conditions and inputs produce the same gameplay outcomes and counters as before the sizing change.
- **SC-004**: In all tested redraw, refill, reset, effect, reduced-motion, and fallback scenarios, represented creatures retain their assigned rank size and the existing hierarchy key remains visible.
- **SC-005**: In a five-person usability check, at least four participants correctly order the five ranks by relative size and match that order to the existing hierarchy key without assistance.

## Assumptions

- The current playable prototype's active chain is levels 0-4. Introducing level 5, stage transitions, new creature artwork, or gameplay progression is not part of this feature; the shifted chain is a representative sizing configuration for future use.
- The active chain is determined by the stage's eligible levels, not by the set of creatures presently visible after random generation, removal, or refill.
- A percentage denotes the longer dimension of the neutral visible creature bounding rectangle relative to the square cell's side. Uniform scaling preserves aspect ratio; it does not force both dimensions to equal the percentage.
- Creature-design bounds are authored with the design and independently checked against the neutral visible silhouette; temporary numbered placeholders use their actual visible glyph bounds until artwork exists.
- The 1-percentage-point measurement tolerance accounts for display rounding and antialiasing. It does not change the intended target sizes.
- The existing key continues to convey hierarchy; redesigning it or adding a new tutorial is out of scope.