# Feature Specification: Nine-Creature Meld

**Feature Branch**: `006-nine-creature-meld`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: Whenever nine creatures of the same level occupy a 3x3 square, they meld into one creature one level higher in the center square. The other eight creatures flash away and the board shifts to fill the empty squares. If the matching creatures are at the top level, the activation triggers an Apex Predator Event and clears the board.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Meld a Matching 3x3 Group (Priority: P1)

As a player, I want nine same-level creatures in a 3x3 square to meld into a stronger center creature, so arranging a complete square creates a clear food-chain progression.

**Why this priority**: The activation provides a new way to evolve creatures and creates a board-clearing/refill event that drives subsequent play.

**Independent Test**: On a controlled board, create a 3x3 block of level 0 through level 3 creatures through a completed move, then verify the eight surrounding creatures flash away, the center becomes one level higher, and the board refills under the existing gravity rules.

**Acceptance Scenarios**:

1. **Given** a successful move or refill creates a complete 3x3 square of nine level-0 creatures, **When** the board is checked for activations, **Then** the eight outer creatures are removed and the center becomes one level 1 creature.
2. **Given** a complete 3x3 square of nine level-1, level-2, or level-3 creatures is created, **When** the board is checked, **Then** its center becomes one creature exactly one level higher and its other eight cells are cleared.
3. **Given** a meld removes the eight surrounding creatures, **When** the meld effect completes, **Then** surviving creatures fall and vacancies are replenished from above using the existing refill rules.
4. **Given** a meld and other eligible activations occur in one snapshot, **When** the wave resolves, **Then** selected activations are resolved deterministically without any creature being removed or replaced twice.

### User Story 2 - Trigger the Apex Predator Event (Priority: P1)

As a player, I want a 3x3 square of top-level creatures to trigger the Apex Predator Event, so completing the strongest formation has a decisive board-wide outcome.

**Why this priority**: The top-level formation is the special terminal-scale outcome of the new activation and must be distinct from ordinary evolution.

**Independent Test**: Create a complete 3x3 square of level-4 creatures and verify that the Apex Predator Event clears every board cell and leaves no replacement creature.

**Acceptance Scenarios**:

1. **Given** nine level-4 creatures occupy a complete 3x3 square, **When** the activation resolves, **Then** an Apex Predator Event clears the entire board and creates no replacement.
2. **Given** a 3x3 square contains even one creature below level 4, **When** the activation resolves, **Then** it is not a top-level Apex Predator Event and follows the ordinary uniform-level meld rule only if all nine levels match.
3. **Given** an Apex Predator Event occurs, **When** scoring and the next board state are finalized, **Then** existing removed-level scoring and refill behavior apply without duplicate counts or stale board updates.

### Edge Cases

- A match may occur anywhere a full 3x3 square fits, including board edges; partial windows outside the board never qualify.
- Only nine identical levels qualify; a mixed-level square does not meld.
- A newly created match is evaluated after an accepted move and after each completed refill/cascade step; the untouched starting board is not activated before the player makes a move.
- Overlapping matching windows are considered from the same board snapshot in row-major top-left order. A selected window reserves its nine cells for that activation wave; later overlapping windows that share any reserved cell wait for a later board state, while disjoint windows may resolve in the same wave.
- If any selected level-4 meld occurs in a wave, the Apex Predator Event takes precedence and clears the entire board with no creations.
- Outside an Apex Predator Event, a selected meld takes precedence over any predator reaction that uses one of its nine creatures; disjoint reactions still resolve in the same wave.
- The center cell is replaced by the evolved creature for ordinary melds; the other eight matched creatures are removed exactly once.
- A 3x3 pattern already present elsewhere on the board but not newly affected by a move/refill is not activated by an unrelated move.
- Reset or effect cancellation must prevent an old meld animation, refill, or cascade from updating the new board.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST detect a complete in-bounds 3x3 square containing nine creatures of the same level after a successful move and after each completed refill step.
- **FR-002**: The initial board MUST NOT be activated before the player makes a move.
- **FR-003**: A qualifying level-0 through level-3 meld MUST remove the eight non-center creatures and replace the center creature with one creature exactly one level higher.
- **FR-004**: A qualifying level-4 meld MUST trigger an Apex Predator Event that clears the entire board and creates no replacement creature.
- **FR-005**: Mixed-level 3x3 squares and partial/out-of-bounds windows MUST NOT trigger a meld or Apex Predator Event.
- **FR-006**: Every matched creature MUST be removed at most once in a wave, and ordinary meld centers MUST be protected from their own removals.
- **FR-007**: Overlapping matching windows MUST be selected from one snapshot in row-major top-left order; a selected window reserves its cells, and only disjoint selected windows resolve in that wave.
- **FR-008**: The existing flash effect MUST visibly distinguish the eight removed outer creatures before they disappear; ordinary meld centers remain as the evolved creature.
- **FR-009**: After a non-apex meld, existing gravity, uniform refill, reaction resolution, scoring, and cascade behavior MUST continue until the board settles.
- **FR-010**: A qualifying top-level meld MUST take Apex Predator Event precedence over other same-wave creations and clear the whole board once.
- **FR-011**: Reset, cancellation, and epoch protections MUST prevent stale meld effects or refill results from updating a replacement board.
- **FR-012**: Existing predator-eating reactions, apex formations, move/free-move accounting, target 100, and hint behavior MUST remain unchanged except when they interact through the shared activation wave.

### Key Entities *(include if data involved)*

- **Meld window**: A top-left position and its nine in-bounds cells, all holding the same creature level in one board snapshot.
- **Meld activation**: A selected non-overlapping meld window, its level, the eight removed creatures, and either a center replacement or apex outcome.
- **Activation wave**: A snapshot-based set of disjoint melds and any compatible existing reactions, with removals deduplicated by creature identity and resulting creations protected.
- **Apex Predator Event**: The top-level 3x3 meld outcome that removes every creature from the board and creates no replacement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every tested uniform 3x3 window of levels 0 through 3 produces exactly one center creature one level higher and removes exactly its eight outer creatures before refill.
- **SC-002**: Every tested uniform 3x3 level-4 window clears all 64 board cells, creates no replacement, and triggers the Apex Predator Event once.
- **SC-003**: Mixed-level, partial, and out-of-bounds windows produce no meld activation.
- **SC-004**: Overlapping-window tests resolve only the row-major non-overlapping selections, with no duplicate removals, creations, or score counts.
- **SC-005**: After an ordinary meld, existing refill/cascade processing settles the board while preserving turns, free moves, and level-zero scoring semantics.
- **SC-006**: Reset/cancellation tests show no stale meld or refill update on the replacement board.

## Assumptions

- The board is 8x8, and creature levels are 0 through 4; level 4 is the top level.
- Ordinary meld evolution is exactly one level higher and applies to uniform 3x3 squares of levels 0 through 3.
- The top-level meld uses the existing Apex Predator Event board-clear outcome and no replacement.
- Activation checks begin after accepted moves and after refill steps, allowing melds and subsequent cascades; the starting board is not auto-processed.
- For overlapping matches, row-major top-left order with non-overlapping windows gives deterministic, duplicate-free resolution. Disjoint matches may resolve simultaneously.
- Ordinary melds use existing level-zero scoring: each removed level-0 creature counts once, including all eight removed cells; the evolved center counts only if it is later removed by another activation.
- Replacement creatures continue to use the current equal-probability refill distribution; initial/reset board generation remains unchanged.