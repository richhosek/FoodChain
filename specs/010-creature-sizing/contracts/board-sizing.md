# Board Sizing and Interaction Contract

## Inputs and Targets

The view receives a five-level active chain, a creature level, a square cell side and a design-authored padding-free neutral bounding box. The current view uses levels 0-4. For any validated consecutive five-level chain, ascending ranks map to 0.75, 0.80, 0.85, 0.90 and 0.95 of the cell side. Absent levels and empty cells do not change this mapping. Out-of-chain inputs are rejected rather than silently assigned a size. Future chain mapping is verified independently of the current level-0-to-4 gameplay type.

## Visual Presentation

- Each creature's design defines its own tight neutral bounding box without padding, including visible strokes and details. Its longest side is scaled to the target fraction of the cell side and its center to the cell center; independent visible-pixel verification must agree within one percentage point. Preserve aspect ratio. The rank fraction provides the clearance; do not introduce additional box padding.
- Aligned internal raster canvases may contain transparent margins needed for animation, but these are not the authored bounds and do not influence the rank scale. Numbered placeholders use their visible glyph bounds until artwork exists.
- Apply the same target to artwork, initial/loading and unavailable-art fallback numbers, and normal/inverse variants. Actual glyph metrics use the active font and are refreshed when font resolution changes.
- Per-rank transforms remain stable during animation and motion. The existing reduced-motion preference freezes the current pose; arbitrary frozen poses are not asserted to have exactly neutral bounds, but are still stationary-cell contained.
- Tile fill, selection border and pointer geometry are never scaled with creature art. Preserve existing tile colors, key, selection indication and inversion scope and timing. A stationary creature's full animated envelope fits its cell; do not use clipping to satisfy this condition.

## Lifecycle and Interaction

- Mouse and touch retain the full existing cell target, including edges, regardless of creature size. Selection, drag preview, cancel, swaps, convergence, falling and refill use existing positional rules.
- Asset readiness, asset failure, font changes, redraws, hint flashes, effect snapshots, reset and rollback preserve correct rank size and existing animation identity/lifecycle. Effects may move pieces between cells; containment applies when stationary.
- Game rules, RNG draws, move legality, scores, free moves, identities and outcomes must match equivalent pre-change inputs and deterministic game state.

## Verification Contract

- Unit fixtures validate mappings for 0-4, 1-5 and at least one other chain, invalid inputs, asymmetric calibration bounds and uniform centering.
- Verify authored boxes are tight against controlled neutral compositions from the actual exported art, including the paramecium preview/master relationship, all visible strokes and normal/inverse layers. Browser fixtures independently measure visible pixels including each current rank, failed art and actual loaded/fallback fonts. Verify desktop and mobile scale, cell-edge mouse/touch, sparse/empty cells, flash, selection, movement, refill, reset and reduced-motion freeze/resume.
- Measure full motion envelopes on a transparent surface larger than a cell; check normal and inverse variants, board edges and rounded drawing boundaries. Preserve the amoeba dirty-cell compositor's redraw correctness with overlapping moving pieces.
- Run dense-board foreground timing separately from other tests and report conditions, all frame intervals and interaction evidence; document physical-device and usability testing independently.