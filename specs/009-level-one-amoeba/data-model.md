# Data Model: Level 1 Amoeba Animation

## Existing Game State

- **Creature**: Existing gameplay identity and level (0-4). The amoeba feature adds no gameplay fields and does not change board generation, refill, scoring, turns, free moves, win/loss, or the level-0 goal.
- **Board**: Existing 8 x 8 grid with up to 64 occupied cells and transient empty cells during reactions/refill. Cell color, interaction position, selection, and pointer target remain owned by the existing board view.

## Shared Amoeba Artwork

- **AmoebaArtworkSet**: Immutable shared layers generated offline from `docs/art/amoeba-concept.svg`: 32 combined body/highlight/interior frames, 33 face poses with pupil gaze and counter-tilting brow, and 11 eyelid states. Each layer has normal and inverse variants for existing flashes.
- **AmoebaArtworkStatus**: `loading`, `ready`, or `unavailable`. Only a complete validated set replaces the numbered `1`; incomplete or undecodable assets retain the existing colored level-1 placeholder and usable cell. The bundle is loaded only when the board contains a level-1 creature.
- **AmoebaMaster**: Editable SVG concept that remains the art source of truth. The HTML resting study defines motion intent but is not the production asset source.

## Per-Creature Resting Visual State

- **Identity key**: View generation plus stable creature ID. State is view-owned and never added to game-domain creatures.
- **Elapsed time and visual random streams**: Deterministic isolated streams for body-frame phase/period, face gaze/blink schedules, and interior-detail sampling used by the safety tests. They do not read or advance gameplay randomness.
- **Body contour**: Shared 32-frame sequence rasterized from the approved closed SVG path with highlight and six collision-safe interior shapes baked into each frame. Per-creature frame phase/cadence drives the broad ripple and localized upper-right lobe wave while preserving the three-lobe silhouette and cell fit.
- **Face**: Shared precomposed poses contain the eye, pupil gaze, and counter-tilting brow. The separate 11-state lid layer blinks over the face. Blink uses a 0.22-second closure; gaze visits eight directions, flicks out and back, and spends longer centered than looking away.
- **Interior details**: Their offsets are baked into the contour frames. The offline generator resolves overlap while producing frames; deterministic tests verify bounds and pairwise clearance.
- **Motion preference**: Current reduced-motion setting. Reduced motion freezes resting state but leaves a recognizable neutral character and all required gameplay effects available.

## Amoeba View Registry and Lifecycle

1. Initial board: load amoeba layers atomically only if level-1 creatures are present; show the numbered fallback until the complete set is ready; create independent state for each level-1 identity.
2. Redraw, selection, flash, drag, reaction snapshots, and refill: destroy/recreate cell containers as the current board view does, but rebind each surviving identity to its existing resting state. New identities receive distinct seeded state.
3. Move checkpoint: retain pre-move states while effect/refill snapshots are provisional. On commit, prune identities no longer on the board; on failure or cancellation, restore checkpoint membership and rebind surviving states.
4. Reset checkpoint: successful reset advances the view generation and clears old state even if IDs are reused. Failed reset restores the checkpoint and old visual generation despite a changed game epoch.
5. Shutdown: stop update work, invalidate stale callbacks, clear registries, remove preference listeners, dispose per-creature containers, and release the board composite texture.

## Board Rendering Data

- **Amoeba artwork view entry**: Creature ID, motion state, outer cell container, inversion and selection state, and latest body/face/lid frame. A single board-sized Canvas overlay redraws only cells whose frame, inversion, selection, or position changed; the per-cell container remains the movement and input target.
- **Flash presentation**: Per-cell inversion flag. The overlay composites matching inverse body/face/lid frames and inverted tile fill, leaving unaffected cells unchanged and preserving existing four-phase timing.
