# Data Model: Level 0 Creature Animation

## Existing Game State

- `Creature`: existing unique `id` and `level` in 0-4; identity is stable through board clones, swaps and falling. This feature adds no gameplay fields.
- `Board`: 8x8 cells with up to 64 creatures. Intermediate reaction snapshots can contain empty cells. Existing generation, refill, score, turns, free moves, win/loss and target 100 are unchanged.
- `LevelState.epoch`: guards stale game effects, but a failed reset restores the checkpoint while retaining the incremented epoch. Starting IDs can repeat after a successful reset; therefore epoch or ID alone is not a sufficient view-state lifecycle signal.

## Shared Artwork

- `ArtworkSet`: immutable, reusable transparent cilia frames, body/highlight, internal-detail layers, eye white, pupil, upper and lower eyelid-closure layers, and eye outline, with Canvas-compatible inverse variants for flashes.
- `ArtworkStatus`: loading, ready, or unavailable. A complete valid set is required before replacing the `0` placeholder; partial load or decoding failure uses the existing playable placeholder. Shared assets are not regenerated per creature or per frame.
- `Master`: the approved editable [SVG](../../docs/art/paramecium-concept.svg). The [resting preview](../../docs/art/paramecium-resting-preview.html) is the timing and appearance reference; generated runtime assets are derived deliverables, not a replacement for the master.

## Creature Visual State

- `key`: view-owned board-generation token plus creature ID. Store only view data; independent state is created for each new level-0 identity.
- `elapsed` and per-creature visual RNG state; independent seeds/phases for cilia, rotation, eye blinking, pupil glances and each internal detail. Never use the gameplay random source or global `Math.random`.
- `cilia`: wave phase and period; preview reference is approximately 1.45-1.85 seconds with a 30-degree swing. A shared frame sequence is indexed independently for each creature.
- `rotation`: current/previous/target angle and timing, easing between alternating directions; resting targets alternate between 12 and 24 degrees in each direction every 3-5 seconds. The body and internal details rotate together; the eye follows the body's position but counter-rotates to keep the eye and eyelids horizontal.
- `blink`: independent next-blink time and closure progress. Upper and lower lids close over the unchanged eye and reopen; the preview blink is approximately 0.22 seconds.
- `gaze`: centered wait, one of eight directions, short outward transition, directional hold and return. The preview waits 2.5-5 seconds centered, holds a direction 0.35-0.65 seconds, and flicks each way over 0.1 seconds. The eye is scaled 1.5x with its pupil and eyelids; gaze offsets scale with it to retain the original relative range and inside-outline clearance.
- `internalDetails`: independent small offsets and phases within the original neighborhood; the preview uses horizontal amplitudes of 3-5 source units and smaller vertical movement.
- `motionPreference`: normal or reduced. Reduced motion freezes resting state but leaves a recognizable neutral appearance and required gameplay feedback; preference changes are handled during a session.

## View and Transaction Lifecycle

1. Initial board: register the first view generation, load complete assets or show fallback, create states for current level-0 IDs and attach their views.
2. Redraw, selection, flash, drag or refill: reuse existing identity state regardless of cell; a newly spawned or replaced ID receives a new independently seeded state. Outer tile, selection and hit area stay unrotated; only an inner artwork container rotates.
3. During a move, preserve pre-move visual states through all provisional reaction/refill snapshots. On successful commit, prune identities no longer present; on abort or failure, restore/rebind checkpoint states and discard uncommitted identities. No new visual work may commit through an aborted effect.
4. Successful reset: abort obsolete effects, advance the view generation once and dispose prior states before attaching the new board. Failed or cancelled reset: retain the previous generation and restore checkpoint states even when the game epoch has changed.
5. Shutdown: stop active callbacks/tweens and remove update, preference and input listeners. Asset load failure or disposal never mutates gameplay state.