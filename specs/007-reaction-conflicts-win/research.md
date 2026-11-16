# Research: Reaction Conflicts and Win Dialog

## Snapshot-Based Selection

**Decision**: Discover candidates from the existing immutable pre-wave board and current move/refill candidate rules. A pure selector repeatedly chooses the unassigned prey with the most currently available adjacent predators, using topmost then leftmost prey to break ties. Reserve prey and its available predators, recompute all remaining groups, and stop when no prey has three eligible unassigned predators. Apply replacement, blast and Apex rules to the actual selected predators.

**Rationale**: This preserves the user's choice that a four-predator group can still react with three after losing a shared predator, while ensuring every creature participates in at most one reaction. Actual counts can change priority, blast radius, replacement and Apex eligibility.

**Alternatives considered**: Discarding a whole overlapping group contradicts the clarification. Selecting in candidate order is nondeterministic. Optimizing total reactions rather than highest available predator count contradicts the specified greedy rule.

## Meld and Apex Precedence

**Decision**: Preserve row-major non-overlapping meld selection. A selected level-4 meld clears the board. Otherwise select predator reactions provisionally without meld reservations; if a selected reaction is Apex, clear the board. If not, discard that selection, reserve meld creatures, select predator reactions again from the same snapshot, and honor any newly selected Apex; otherwise resolve the final reactions and melds together. Only the resolving selection appears in effects or produces ordinary outcomes.

**Rationale**: This implements the clarified Apex priority while preserving ordinary meld priority and a single participation per selected predator wave. Provisional selection must not allocate replacements, alter score, or emit effects.

**Alternatives considered**: Reserving melds before every Apex check prevents the explicitly requested predator Apex priority. Triggering Apex for every initially eligible prey ignores conflict selection.

## Move Prediction and Hints

**Decision**: Share a pure activation-selection primitive across wave resolution and move prediction, including meld reservations and Apex checks. Preserve separate initial-move and refill candidate sets and the existing initial-board generation policy. Derive a hint from a swap that really produces a selected activation and highlight an appropriate moved participant; keep hint randomness independent of gameplay randomness.

**Rationale**: The current prediction helpers independently count predators and melds, so leaving them unchanged can incorrectly report moves or losses. Pure selection avoids producing IDs or consuming RNG when merely checking a move. Locate the shared primitive to avoid the current mechanics-to-board import becoming circular.

**Alternatives considered**: Calling the full stateful move lifecycle for each predicted swap mutates state and draws gameplay randomness. Duplicating the selection algorithm in the predictor risks divergence.

## Win Dialog

**Decision**: Reuse the existing accessible dialog pattern in the application shell. Show the win dialog once per level epoch only after the level reports won and the completed board is rendered; Close and Escape dismiss without changing terminal state. Reset closes it and invalidates outstanding effects; a later epoch can show a new dialog.

**Rationale**: The level already checks the target after all cascades and awards win precedence over loss. Existing reset, abort, and epoch guards provide the right lifecycle boundary. Native dialog behavior and existing layout support desktop and mobile.

**Alternatives considered**: Showing the dialog as soon as the score crosses the threshold obscures unfinished effects. Restarting on dismissal changes game state unexpectedly.

## Verification and Baseline

**Decision**: Add deterministic rule tests for selection, cross-role conflicts, tie ordering, actual reduced predator counts, both Apex passes, meld interaction, scoring and cascades; add desktop/mobile browser tests for dialog timing, dismissal, reset and stale effects. Update prior tests that assume shared predators, goal 10, or uniform nonreacting boards.

**Rationale**: Existing fixtures can form melds and constant-value refill streams can cascade repeatedly; bounded fixture waits and varied deterministic refills keep tests meaningful without changing production rules. A bounded research run found existing failures and two unit timeouts, so establish and report a fresh baseline rather than assuming a clean suite.

**Alternatives considered**: Adding a production cascade cap to make tests finish changes gameplay and is outside scope. Treating outdated shared-predator animation expectations as authoritative would contradict this feature.