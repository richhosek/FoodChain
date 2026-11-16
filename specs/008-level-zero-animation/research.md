# Research: Level 0 Creature Animation

## Approved Artwork and Canvas Rendering

**Decision**: Retain the editable [SVG master](../../docs/art/paramecium-concept.svg) and use the [resting preview](../../docs/art/paramecium-resting-preview.html) as the motion reference. Produce reusable transparent, padded raster layers and a shared pre-rendered cilia sequence from the approved artwork; load them into the existing Phaser 4.1 Canvas scene. Keep body, internal shapes, eye, pupil, eyelids and outline independently composable. Provide normal and inverted shared artwork variants for existing flash effects, preserving alpha.

**Rationale**: Phaser's SVG loader rasterizes an SVG into a texture; loading the master alone does not animate individual cilia, pupils or lids. A shared cilia sequence avoids updating 62 hair paths per creature per frame. Baked transparent eyelid-closure frames clipped to the eye can avoid relying on Canvas-incompatible masking, while the eye and pupil stay round. Include enough padding for the reference's approximately 8-degree rotation and verify it at cell and board edges.

**Alternatives considered**: Animate DOM SVGs on top of the game canvas, rejected for input, layering and effect synchronization complexity. Use a third-party skeletal runtime or switch renderer, deferred because existing Canvas-compatible shared layers are sufficient to test the feature. Updating every cilium of every creature each frame is a useful benchmark but not the preferred initial design.

**Asset production**: Design a reproducible offline export from the existing reference using a documented browser-capable tool already available to the project where practical; commit generated production assets so normal development and production builds do not depend on network access, a local art application or browser installation. Verify source-to-output alignment, transparent pixels, layer ordering, and alpha for flash variants. Do not silently flatten independently animated parts into one fixed loop.

## Visual State and Randomness

**Decision**: Keep per-creature animation state in the view, keyed by stable creature identity within a view-owned board-generation token. Use an isolated deterministic visual PRNG, seeded from a view-specific generation seed and creature ID; do not call the level's random source or global `Math.random`, which the game uses by default. Advance all visible states through one scene update with per-creature phases and schedules.

**Rationale**: Existing `render()` and effect paths recreate display objects, while IDs survive swaps and refill movements. Independent randomized phase, wave period, rotation, blink, gaze and detail drift prevent forced synchronization; exact coincidence remains possible. Visual-only deterministic seeds allow controlled tests without consuming generation or refill draws.

**Alternatives considered**: Store animation state on game creatures, rejected because it couples gameplay to rendering and changes domain contracts. Restart animation whenever a piece is redrawn, rejected because hint flashes and selections would reset phases. Use unseeded global randomness, rejected because gameplay currently defaults to the same source.

## Move, Reset and Rollback Lifecycle

**Decision**: Treat rendered reaction and refill snapshots as provisional until the move commits; retain states needed to restore the pre-move snapshot if effects fail or are cancelled, then prune removed IDs after successful commit. On a successful reset, explicitly advance the view generation and clear old states before rendering the new board. On a failed or aborted reset, restore the checkpoint's state and retain its visual generation and animation phases even though the game epoch has advanced. Guard async callbacks with existing cancellation plus a view generation token; dispose listeners, state and tweens on teardown.

**Rationale**: [level.ts](../../src/game/level.ts) advances epoch even on failed reset, and initial creature IDs may repeat on a successful reset. Clearing the state map on every redraw, intermediate wave or epoch change would break continuity or restore the wrong visual state. Hook the controller's actual success/rollback boundaries rather than inferring successful reset from epoch alone.

**Alternatives considered**: Use only epoch as a visual key, rejected because rollback retains creatures while changing epoch. Prune after each intermediate wave, rejected because a later failure can restore previously removed creatures. Never prune until page shutdown, rejected because repeated games would accumulate state.

## Interaction, Effects and Fallback

**Decision**: Retain the existing outer piece container, colored tile, pointer handling and selection border; rotate only a nested artwork container. Keep reaction convergence, drag preview, gravity/refill and flash timing unchanged. Use shared alpha-preserving inverse assets for the level-0 artwork during affected flash phases, and preserve the existing inverse tile colors; compare composited results visually because per-layer inversion can differ from inversion after compositing.

**Rationale**: Existing movement and hit testing are attached to the outer container in [board-view.ts](../../src/view/board-view.ts). Canvas-compatible pre-inverted textures avoid relying on WebGL-only tint behavior. The established flash pattern is four 125 ms phases in [effects.ts](../../src/view/effects.ts).

**Alternatives considered**: Rotate the full piece container, rejected because cell interaction and selection rotate with the creature. Hide the character during flashes, rejected because the affected creature would become difficult to follow.

**Accessibility and failures**: Honor the initial reduced-motion preference and changes during the session by freezing idle animation while preserving all required gameplay feedback. Remove preference and scene listeners on shutdown. If any required artwork cannot load or decode, keep the existing colored `0` placeholder and input working, without rendering a partial creature. Update the board's accessible description to reflect mixed artwork and numbered levels.

## Verification and Performance

**Decision**: Use deterministic Node tests for animation state and random-source isolation; use Playwright desktop and mobile emulation for rendering, input, redraw, effects, rollback, reset, loading failure and reduced motion. Use a test-only controlled board with 64 level-0 creatures for a real-time foreground performance run of at least 30 seconds; exercise selection, drag and effects as separate measured scenarios where appropriate.

**Rationale**: The dense board is a stress fixture, not a production generation change. Measure every `requestAnimationFrame` interval without clamping or silently removing stalls; report sample count, fraction at or below 33.4 ms, p95/p99, long intervals, responsiveness, browser, viewport, device pixel ratio, hardware and power conditions. The 95% threshold in the spec is an acceptance target, not a prediction that all devices meet it. Chromium mobile emulation is not physical mobile performance; record unavailable physical-device results explicitly.

**Alternatives considered**: Fake timers for performance measurement, rejected because they do not measure real rendering. Testing only one or two creatures, rejected because it cannot validate the dense-board requirement. Adding a production cascade cap to stabilize a test, rejected as a gameplay change.

## References

- [Feature specification](spec.md), [approved preview](../../docs/art/paramecium-resting-preview.html), and [art research](../../docs/art/creature-animation-research.md).
- [Phaser asset loading](https://docs.phaser.io/phaser/concepts/loader) and [Spine Phaser Canvas limitations](https://esotericsoftware.com/spine-phaser).
- Existing [view](../../src/view/board-view.ts), [level lifecycle](../../src/game/level.ts), [game controller](../../src/main.ts), and [browser test configuration](../../playwright.config.ts).