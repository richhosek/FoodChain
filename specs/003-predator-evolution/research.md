# Research: Predator Evolution and Apex Formation

## Reaction Rules

**Decision**: Keep reaction evaluation in the renderer-independent `resolveWave` rules function. Evaluate every candidate from the existing `before` snapshot. For a non-apex reaction, create a replacement at the predator level for exactly three predators, or one level above the predator for four or more, capped at level 4. An apex reaction requires at least four level-4 predators and either all four orthogonal positions or all four diagonal positions around the prey. Preserve the existing apex full-board clear with no replacement and existing non-apex blast behavior.

**Rationale**: The domain already represents levels as the fixed `0 | 1 | 2 | 3 | 4` union, computes neighboring higher-level predators from a board snapshot, and returns a wave containing removals, creations, and explosion positions. Applying the new rules here keeps resolution deterministic and testable without Phaser.

**Alternatives considered**: Deriving the replacement from currently present board levels was rejected because a temporarily absent level must not lower the cap; the approved level maximum is the fixed supported level 4. Rendering-driven reaction decisions were rejected because presentation timing must not influence game state.

## Reaction Presentation

**Decision**: Run predator convergence inside the existing awaited reaction effect, before the existing flash and before the wave's `after` board is applied. Use Phaser 4.1.0's Scene Tween Manager with a 1000 ms duration, and await completion. Stop and clean up on the effect's abort signal.

**Rationale**: `GameLevel.move` awaits `onEffect` for a reaction before setting current board to `wave.after`. `BoardView.effect` already renders `wave.before`, awaits the flash effect, and only then renders `wave.after`. This creates an established synchronization boundary and reset already aborts the effect signal. At common browser refresh rates, 1000 ms spans many rendered frames and allows the convergence to be perceived.

**Alternatives considered**: Changing the domain state to animate would couple outcome computation to frame timing. A new animation engine or package is unnecessary because the existing Phaser tween manager is already in use for refill movement.

**Shared predator decision**: Rules can include a single creature in multiple simultaneous reactions because each prey is evaluated from the same snapshot. One Phaser container cannot move toward multiple prey simultaneously. Animate the original container toward one reaction and create temporary visual-only copies for its additional reaction targets. Copies are presentation elements only and must be destroyed after the wave or on abort; they are not board creatures and must not affect removal identity or score.

## Testing and Existing Project Choices

**Decision**: Use the existing strict TypeScript typecheck, Node built-in test runner for deterministic mechanics/effect tests, Playwright for browser presentation and integration, and Vite production build. Keep the existing Phaser 4.1.0 engine selection.

**Rationale**: The project already injects deterministic boards and creature factories into pure rules tests, and game effects carry an abort signal. Existing tests cover reaction thresholds, explosions, apex, simultaneous creations, reset cancellation, and visual blast phases. Extending those surfaces is the smallest coherent validation approach.

**Alternatives considered**: No new test framework or animation dependency is needed. The original engine comparison selected Phaser over PixiJS, Excalibur, and DOM/CSS, so reopening engine selection for this focused feature would add no value.

## Sources

- Existing engine decision and tradeoffs: [specs/001-gameplay-prototype/research.md](../001-gameplay-prototype/research.md).
- Current wave logic: [src/game/mechanics.ts](../../src/game/mechanics.ts).
- Current awaited game-effect sequence: [src/game/level.ts](../../src/game/level.ts).
- Existing Phaser tween usage: [src/view/board-view.ts](../../src/view/board-view.ts).
- Phaser 4.1.0 TweenManager documentation: [TweenManager](https://docs.phaser.io/api-documentation/class/tweens-tweenmanager); its `add` method starts playback immediately and its update cadence is tied to the manager's frame updates.
- Browser animation scheduling: [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame); callbacks generally match display refresh, so the 1000 ms motion spans multiple opportunities to render intermediate positions.
