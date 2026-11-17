# Research: Creature Sizing by Food-Chain Rank

## Active Chain and Rank

**Decision**: Define a pure presentation-side mapping for a five-level consecutive chain parameterized by its lowest nonnegative integer, with fractions `[0.75, 0.80, 0.85, 0.90, 0.95]`. The current board supplies the fixed chain 0-4. Validate chain start and rank inputs explicitly; do not infer the chain from occupants or add level 5 to game rules. Exercise 1-5 and another shifted chain in pure tests only.

**Rationale**: `src/game/creature.ts` currently restricts levels to 0-4, and there is no stage progression. Removal, refill, or sparse test fixtures can leave a rank absent without changing the level hierarchy. A numerical helper can demonstrate future mappings without pretending that current gameplay supports them.

**Alternatives considered**: Infer minimum and maximum from visible pieces, rejected because sizes would jump on removal; extend domain levels and stage progression, rejected as outside this feature; hardcode five unrelated level cases, rejected because future chain shifts would require rewriting the rule.

## Design-Authored Bounds and Calibration

**Decision**: Each creature design authors a named, non-rendering neutral bounding rectangle in design coordinates, tight around the complete visible creature including stroke and cilia, with no added padding. Define its neutral pose explicitly: zero body rotation, open eye, centered gaze and the approved undeformed or documented neutral contour/cilia. Export the authored rectangle and pose definition with source hashes and coordinate conventions into the asset manifest. Validate its tightness independently against a reproducible neutral composition from the actual runtime artwork, with documented alpha threshold, pixel-edge convention and downsampling tolerance. An indexed animation frame is not assumed to be undeformed. Normal/inverse variants must have identical bounds.

For target fraction `p` and square cell side `C`, uniformly scale by `p * C / max(boxWidth, boxHeight)` and translate the authored box center to the cell center. Apply one shared transform to all layers for that representation. The rank percentage alone defines the neutral clearance; do not add padding to the design box. Preserve any larger internal raster canvases needed for alignment and animation, but never treat their transparent margins as part of the box or extra board clearance. Use the fixed authored box, not per-frame resizing or runtime alpha scans.

**Rationale**: The creature design owns its geometry. Both existing SVG masters use padded viewBoxes and do not yet define this rectangle; paramecium's exporter renders the separate resting preview while amoeba's renders its master. The exporter must reconcile the authored master coordinates with the actual preview geometry and layer registration, and validate both source identities. Padded storage is not a padded bounding box. A fixed reference preserves aspect ratio and prevents motion-driven size pulsing.

**Alternatives considered**: Derive authoritative bounds at runtime from raster alpha, rejected because the design defines them; scale by padded texture dimensions, rejected because margins differ; scale independently on each axis, rejected because it distorts art; dynamically fit every frame, rejected because it changes resting motion; clip overflow, rejected because it hides artwork and can mask failures.

## Numbers and Font Loading

**Decision**: Measure visible ink bounds for each numeric glyph, including fallbacks 0 and 1, using the same actual font, weight, text renderer, and font-loading state as the board. Apply a uniform scale and translation to center the ink at the rank target. Cache metrics by glyph and actual font configuration; when the intended font finishes loading or fails, recompute or rebuild the affected labels using the actual selected font. Ensure font changes never change cell geometry or input.

**Rationale**: The current bold Space Grotesk labels use a 38px font size, and text layout bounds or nominal font size do not equal ink bounds. The font has an external loading path and a fallback; a test that waits only for the preferred font misses offline rendering.

**Alternatives considered**: One font size per rank without measuring ink, rejected because digits have different bearings and bounding boxes; assuming the font always loads, rejected because the fallback is user-visible; stretching glyphs to fill a square, rejected as distortion.

## Integration, Motion, and Effects

**Decision**: Keep each board cell container and pointer coordinate mapping unchanged. Scale/offset only the nested paramecium artwork, each numeric label, and the amoeba composite's art layers. Leave amoeba tile fill and selected border at their current cell sizes; keep its single dirty-cell texture, draw ordering, and refresh strategy. Use the same placement in initial attach, async asset readiness, redraw, inverse flash, drag, reaction convergence, and refill.

Define the neutral pose as a calibration reference, not a requirement to reset animation. Reduced motion currently freezes the existing pose, including when toggled live; preserve that behavior. A frozen or animated pose may have bounds different from the neutral reference, but must be contained in its stationary cell. Independently validate the full motion envelope without masking overflow: all amoeba body/face/lid states and paramecium cilia, rotation, gaze, blink, and detail-offset extremes, using a conservative analytical envelope or bounded sampling with a documented error margin. Test on a transparent surface larger than a cell so clipping cannot hide overflow. If the prescribed neutral targets and containment cannot coexist with the current motion, treat this as an explicit blocker requiring a product decision; do not silently shrink, clip, or change approved motion.

**Rationale**: `BoardView` maps pointer positions to cells and creates moving containers; the amoeba overlay draws tile and artwork together and clears cell-sized areas. Resizing the outer container or entire overlay would alter tiles, input, and movement. Reduced-motion behavior and identity checkpoints are already covered by existing feature contracts.

**Alternatives considered**: Scale outer containers, rejected because tiles and input geometry move; re-render full board or create per-creature amoeba textures, rejected due previous performance results; force a neutral pose when reducing motion, rejected because live-freeze semantics would change.

## Validation and Performance

**Decision**: Add pure rank and calibration tests, and independent browser pixel measurements of neutral visible artwork and glyph ink, excluding the tile and comparing against an independently known expected rectangle rather than the same metadata alone. Exercise desktop/mobile, ready and failed artwork, preferred and fallback fonts, sparse/empty boards, cell edges, movement, inversion, selection, refill, reset and reduced motion. Verify 1-percentage-point target tolerance in logical cell coordinates and separately check responsive display. Use deterministic gameplay state and score for input parity.

Re-run the existing 30-second 64-amoeba and paramecium performance harnesses on desktop and mobile in isolation with all frame intervals and input responsiveness reported, and add a representative mixed-board measurement if available. The feature-009 amoeba target is 95% of foreground frame intervals <=33.4 ms; the historical level-zero run missed its target. Establish and report before/after under comparable conditions rather than claiming either is proven by this plan. Keep physical-device and five-person usability checks explicitly unverified when unavailable. The previous full E2E run had 50 failures, 117 passes, and 5 skips, including a pre-existing paramecium manifest mismatch; re-evaluate and report rather than assume all failures are unrelated.

**Alternatives considered**: Validate only scale values in implementation metadata, rejected because padding and offsets could be wrong; compare animated screenshots without a controlled pose, rejected because phases vary; run performance tests concurrently, rejected because contention confounds measured frame intervals.

## References

- [Feature specification](spec.md), [board view](../../src/view/board-view.ts), [paramecium renderer](../../src/view/paramecium-view.ts), [amoeba renderer](../../src/view/amoeba-view.ts).
- [Level-zero validation](../008-level-zero-animation/validation.md), [level-one research](../009-level-one-amoeba/research.md), [prototype engine research](../001-gameplay-prototype/research.md).