# Research: Replenishment and Drag Interaction

## Replenishment Distribution

**Decision**: Retain `sampleLevel` for starting and reset boards; add a separate replenishment sampler used only by `refillBoard`. Use cumulative thresholds 5/15, 9/15, 12/15, 14/15, and 15/15 with one injected random draw per new creature.

**Rationale**: Both `generateBoard` and `refillBoard` currently use `sampleLevel`, so changing that sampler would silently change the starting distribution and invalidate its guarantees. The new thresholds express the requested ratios exactly and preserve seeded/scripted reproducibility.

**Alternatives considered**: Replacing the shared thresholds would alter starting boards. Reweighting existing boards after generation would distort the independent refill distribution and introduce extra random draws.

## Drag Input and Visual Preview

**Decision**: Use one pointer-event input path on the game canvas, with an owning pointer ID and pointer capture for movement and release outside the canvas. Maintain a transient gesture and preview only in the view; move the existing Phaser containers without mutating the authoritative board. End or cancel the gesture before submitting a single `onMove(origin, destination)` to the existing game controller.

**Rationale**: The current `BoardView` acts only on Phaser `pointerdown` and `pointerup`, so there is no intermediate feedback. The existing `GameLevel.move` owns legality, turns, randomness, and reactions. A view-only preview preserves these rules and avoids restoring domain state on cancellation or rejection. Native canvas coordinates must be transformed using the current canvas bounding rectangle and the logical 800-by-800 board dimensions to avoid CSS scaling errors.

**Alternatives considered**: Mutating the board on pointer movement risks multiple turns and consumes randomness or triggers cascades prematurely. Mixing separate Phaser and native gesture handlers risks duplicate commits. Dragging only on release fails the requested feedback.

**Pointer handling**: Only the initiating pointer owns the gesture; ignore other pointers and non-primary mouse buttons. Handle release outside the canvas using capture, and cancel on `pointercancel`, unexpected loss of capture, window blur, hidden document, reset, or loss of move permission. Clear the active gesture before releasing capture to avoid a late cancellation or release committing a second time. Capture may be interrupted by the OS or browser; real-device checks remain necessary.

**Sources**: Phaser's installed `node_modules/phaser/src/input/InputPlugin.js` handles pointer-up/outside and cancellation; `node_modules/phaser/src/scale/ScaleManager.js` handles display scaling. [MDN pointer capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) and [Playwright touchscreen limitations](https://playwright.dev/docs/api/class-touchscreen) describe capture and tap-only high-level touch emulation.

## Test Strategy and Existing Baseline

**Decision**: Use the existing Node unit test and Playwright projects. Test refill interval boundaries with scripted random inputs and prove starting generation is unchanged. Add browser checks of visible positions before release, restoration, direction changes, outside release, rejection, cancellation, reset, and mouse/touch equivalence. Use deterministic test fixtures without a production mutation API.

**Rationale**: Statistical frequency checks alone are probabilistic; controlled boundary samples prove the mapping. Browser interaction tests are necessary to verify the visual preview and timing of commits. Touch emulation must be complemented with physical iOS and Android checks when available.

**Baseline**: The current prototype's target was changed to 100 and reset now preserves it. Four existing unit tests still assume the prior target of 10; this is pre-existing and outside this feature. Record baseline failures separately from new regressions and do not revert the user's target. Existing browser fixtures may also assume the old target and must be triaged before attributing failures to this feature.

**Alternatives considered**: Mocking only a move callback cannot prove Phaser visuals, release outside the canvas, or cancel/reset behavior. A production test-only control would expose an unnecessary mutation surface.