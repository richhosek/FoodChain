# Move Reaction Discovery Contract

This contract defines which prey are considered after a completed legal swap. Reaction thresholds and outcomes are inherited from the active game rules.

## Candidate Selection

1. Include both cells involved in the successful swap as candidates, preserving reactions where the prey moved.
2. For each moved creature, inspect its post-swap neighboring cells.
3. Include a neighboring stationary prey when the moved creature is exactly one level higher than that prey.
4. Evaluate the resulting candidate set against one post-swap snapshot. Each prey contributes at most one reaction.
5. The existing resolver triggers a reaction only when at least three neighboring creatures are exactly one level above the prey; orthogonal and diagonal neighbors count.
6. Do not include an unrelated stationary prey merely because it already has a qualifying predator group elsewhere.
7. Invalid, illegal, or rejected swaps do not select reaction candidates or trigger effects.

## Reactions and Cascades

- If multiple moved or affected prey qualify, resolve them using the existing simultaneous-wave rules.
- Existing replacement levels, apex, blast, scoring, refill, cascade, and move accounting remain unchanged.
- After refill, continue using only the existing falling/spawn candidate positions; this contract does not introduce global stationary-prey scans for later waves.
