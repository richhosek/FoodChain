# Data Model: Creature Sizing by Food-Chain Rank

## Active Chain

- `lowestLevel`: nonnegative integer defining the first of exactly five consecutive active levels. Current value is 0; a future stage may supply another value once progression exists.
- `levels`: `lowestLevel` through `lowestLevel + 4`; independent of transient board contents.
- Validate integer range, the derived top level, and the rank lookup. An out-of-chain level or invalid chain is an explicit error, not a silently clamped rank. Actual board level types remain 0-4 in this feature.

## Rank and Target Size

| Zero-based rank | Fraction of cell side | Current level | Future illustrative level |
| --- | ---: | ---: | ---: |
| 0 | 0.75 | 0 | 1 |
| 1 | 0.80 | 1 | 2 |
| 2 | 0.85 | 2 | 3 |
| 3 | 0.90 | 3 | 4 |
| 4 | 0.95 | 4 | 5 |

`rank = creatureLevel - lowestLevel`; lookup is pure, deterministic, and does not depend on occupied cells or gameplay randomness. The spec's human-facing ranks 1-5 correspond to indices 0-4 above.

## Authored Neutral Bounds and Transform

- **Bounds**: design-authored nonempty `left`, `top`, `right`, `bottom` in documented design coordinates, tight around the entire neutral visible creature including stroke and cilia, with no added padding. Exclude cell tile, selection and effects. Record source identity/hash, pose and coordinate conventions in the exported manifest.
- **Art neutral reference**: explicit body/contour and cilia reference, zero body rotation, open lids and centered gaze, composed with actual runtime layer alignment; do not assume a motion frame is exactly neutral.
- **Asset registration**: preserve the design-to-raster coordinate transform and common alignment for all normal/inverse layers. Internal transparent raster margins may remain for motion and compositing, but do not change the authored rectangle or add board-sizing clearance. The paramecium preview used for export must be reconciled with the master defining the box.
- **Independent verification**: compare the authored box to the neutral visible composite, including visible strokes and details, using a documented alpha threshold, pixel-edge convention and raster/downsample tolerance. The scan verifies the box; it does not replace design-authored geometry as runtime authority.
- **Glyph bounds**: visible ink for the actual digit, font family, weight and loaded/fallback font state. Invalidate or recompute when the effective font changes; bound caching avoids per-frame measurement.
- **Target**: `target = cellSide * rankFraction`; `scale = target / max(width, height)`. Translate the transformed authored-box center to the cell center while preserving aspect ratio. Validate positive finite dimensions and scale. The rank percentage alone supplies neutral cell clearance; no extra box padding is applied. Perform calibration once per representation/font configuration, never for every animation update.
- **Tolerance**: In a neutral render the longest visible dimension must be within 1% of the cell side from the target; verify independently from rendered pixels at desktop and mobile display sizes. Preserve normal/inverse alpha geometry.

## Presentation and State Transitions

1. Board setup uses the current chain, creates fixed cell containers, and selects rank sizing for art or fallback label; tile and pointer mapping remain unchanged.
2. When complete artwork becomes ready, attach it using the same rank fraction; on failure retain a measured numeric fallback. Font resolution or fallback change refreshes glyph calibration without changing gameplay state.
3. Redraw, selection, flash, drag, reaction and refill reuse the creature level's rank transform while existing cell/identity and motion lifecycle remains authoritative. Empty cells do not modify the chain.
4. Reset, rollback, and teardown use existing state ownership and cancellation. Visual recalibration does not draw gameplay randomness or mutate creature identities or game outcomes.
5. Reduced motion freezes the current pose, not necessarily neutral. Calibration specifies the fixed scale relative to the neutral reference; verify live-frozen and animated poses remain within the stationary cell independently. Motion may cross cell boundaries only as part of existing movement between cells.

## Containment Risk

Measure the complete composite on a surface larger than the cell across the reachable body, face, lid, rotation and detail envelope. Continuous extrema need a conservative bound or sampled margin. If the measured neutral size and animation containment cannot both hold without changing current motion, leave implementation blocked and request an explicit decision; never count a clipped surface as proof.