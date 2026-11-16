# Creature Animation Research

**Status:** Preliminary research and art direction, 2026-11-15. No production art or animation pipeline has been selected yet.

## Direction

Replace the prototype's numbered creatures with expressive, microscopic, single-celled characters. The intended visual style is 2D cartoon art with black outlines, round white eyes, and black pupils. Each of the first five creature levels should have a recognizable silhouette at game-board size.

**Level 0 is a paramecium.** Amoebae can eat paramecia, so an amoeba is a possible higher-level predator rather than the base creature. Actual feeding relationships depend on species and size; the game can take creative liberties rather than claiming that every proposed level is a scientifically accurate food chain.

| Level | Creature direction | Status | Visual idea |
| --- | --- | --- | --- |
| 0 | Paramecium | Chosen base creature | Rounded slipper shape, short cilia, expressive eyes. |
| 1 | Amoeba | Proposed | A soft, irregular outline with flexible pseudopods. |
| 2 | Euglena-inspired creature | Proposed | Teardrop-shaped body and a trailing flagellum. |
| 3 | Stentor-inspired creature | Proposed | Trumpet-shaped body with a waving crown. |
| 4 | Didinium-inspired creature | Proposed | Barrel-shaped predator with a prominent feeding opening and bands of cilia. |

Levels 1-4 are **concepts to review**, not final species assignments or verified predator-prey relationships. These organisms are protists or protist-inspired characters; the term "animals" is artistic shorthand, not a taxonomic claim.

## Preliminary Animation States

| State | Initial purpose | Suggested playback |
| --- | --- | --- |
| Resting | Subtle breathing, cilia movement, blinking or drifting. | Loop |
| Fearful | Communicate an imminent threat through eyes, posture or trembling. | Loop while threatened |
| Move | Show swimming or movement during a swap or fall. | Loop or transition as needed |
| Attack | Show a predator converging on its prey. | One-shot or timed action |
| Dying | Show a creature being consumed or removed. | One-shot |
| Exploding | Show a creature or effect involved in a blast. | One-shot |
| Evolving | Transition from one level to another. | One-shot |
| Spawning | Introduce a creature entering the board. | One-shot |

This list is preliminary. Exact triggers, priorities, durations, interruptions, and whether an effect belongs to a creature or the board need a later gameplay and animation design. Preserve the existing reset/cancellation behavior when integrating effects.

## Current Game Constraints

- The prototype uses **Phaser 4.1.0** and currently renders its board with the **Canvas** renderer. Its game rules are separate from presentation.
- The logical board canvas is 800 x 800 pixels, with an 8 x 8 grid and 100 x 100 logical pixels per cell. This is a useful readability target, not a required export resolution; test at actual desktop and mobile display sizes.
- Phaser can load [sprite sheets, texture atlases, and SVG images](https://docs.phaser.io/phaser/concepts/loader). It does not automatically turn an SVG into a character rig or expose its internal parts as game animations.
- Existing predator convergence lasts 1000 ms, and the game can show up to 64 creatures. Animation must be tested for responsiveness, asset size, and reset safety on representative devices.

## SVG and Delivery Formats

Keep a scalable, editable master where practical. SVG is well suited to flat colors, clean outlines, and revising the characters at different sizes. Separate the body, eyes, pupils, and appendages into editable shapes or layers for animation; an automatic trace may still require cleanup and separation.

SVG is **not required as the game runtime format**. Phaser typically rasterizes a loaded SVG into a texture at a selected size, so resizing that texture beyond its resolution can blur it. A common production route is to animate the master, then export transparent PNG frames or a PNG texture atlas with animation metadata. Phaser can play those frames directly. Export resolution, frame counts, padding, alignment, and device-memory impact should be measured before committing to a standard.

Alternatively, a skeletal or vector runtime can interpolate poses while the game runs, but it introduces integration and performance considerations. The [official Spine Phaser runtime documentation](https://esotericsoftware.com/spine-phaser) says runtime releases before 4.3.11 support Phaser 4.1.0; newer releases require Phaser 4.2.1 or later. It also documents that the Canvas backend does **not** support mesh deformation. Verify the exact editor/runtime version and license before choosing it; soft-body creatures may require a different renderer, baked frames, or another approach.

## Tools Investigated

Availability, capabilities, prices, licensing and export options can change. Check current plans, commercial-use rights, privacy and input-retention terms before adopting a service or uploading original art.

### Sketch to Character

| Tool | Use | Output and considerations |
| --- | --- | --- |
| [Adobe Firefly](https://www.adobe.com/products/firefly/features/image-to-image.html) | Upload a photo or sketch and use an image-to-image prompt to explore cartoon interpretations. | PNG or JPEG artwork; typically a flat image that needs cleanup and layering before rigging. |
| [Recraft](https://www.recraft.ai/) | Explore consistent flat illustration styles and AI-assisted vector designs. | Raster and vector workflows, including SVG; inspect and clean generated shapes before animation. |
| [Vectorizer.AI](https://vectorizer.ai/) | Trace a sketch or raster image into scalable paths. | Editable SVG and other vector formats; tracing alone does not reliably create an animation-ready layer structure. |
| [Inkscape](https://inkscape.org/) | Free vector editor for tracing, refining shapes, and separating body parts. | Editable SVG masters; cleanup and part separation remain artist-directed. |

### Animate and Export

| Tool | Use | Output and considerations |
| --- | --- | --- |
| [Rive](https://rive.app/features) | Animate vector shapes with a timeline, bones, meshes and state transitions. | Can import SVG and render PNG sequences. A live Rive integration with Phaser would need investigation; pre-rendered frames are the simpler first experiment. |
| [Spine](https://esotericsoftware.com/) | Create game-focused skeletal animations from layered image parts. | Official Phaser runtime or frame export; paid software, runtime licensing/version requirements, and Canvas mesh limitations apply. |
| [OpenToonz](https://opentoonz.github.io/e/) | Free, open-source 2D animation with raster and vector workflows. | Useful for hand-drawn sequences; expect a more traditional production and learning process. |
| [Aseprite](https://www.aseprite.org/) | Edit frame sequences, loops, and sprite sheets. | PNG/JSON atlas export; primarily a pixel-art tool, so it is a less natural fit for smooth vector-style characters. |
| [PixelLab](https://www.pixellab.ai/) | Explore AI-assisted sprite creation and text- or skeleton-guided animation. | Game-oriented sprite output, but primarily pixel art rather than the requested smooth cartoon style. |

### AI-Assisted In-Betweens

Some image-to-video models available through [Krea](https://www.krea.ai/) accept start and end images and generate motion between them. They are worth testing as **motion concepts**, particularly for one-shot evolution or explosion effects. They do not necessarily produce a transparent, aligned sprite sheet or an editable rig; inspect results for shape drift, moving eyes, inconsistent outlines, camera movement, flicker, and loop discontinuities.

Rigging tools such as Rive and Spine also interpolate between key poses. That interpolation is controlled animation rather than necessarily generative AI, and usually provides more predictable, repeatable loops. [EbSynth](https://ebsynth.com/) propagates the look of a painted keyframe over existing video; it is a stylization tool, not a tool that creates motion solely from two still poses.

## Suggested First Experiment

1. Photograph a paramecium sketch with even lighting, a plain background, and the full outline visible.
2. Use Firefly or Recraft to explore a few cartoon interpretations. Approve one reference pose before producing alternate expressions.
3. Clean and separate the body, eyes, pupils, and cilia in Inkscape or another editor. Retain the original sketch, generated references, editable master, and tool/version information.
4. Animate one creature in Rive: start with resting, fearful, and attack. Compare rigged interpolation with an AI-generated motion concept if desired.
5. Export transparent PNG frames or an atlas with a consistent frame canvas and registration point. Integrate a small prototype in Phaser, keeping game rules independent of the artwork.
6. Evaluate legibility at cell size, looping, transitions, performance with many simultaneous creatures, reset/cancellation, and desktop/mobile behavior before producing all five creatures and all states.

**Suggested prompt:**

> Use this sketch as the character's silhouette. Create one friendly microscopic paramecium game character in a clean 2D cartoon style, with a consistent black outline, two round white eyes and black pupils. Flat colors, simple shapes, short cilia, no text, centered full body, plain background. Preserve the sketch's distinctive proportions.

The recommended initial path is **AI-assisted concept art -> cleaned editable artwork -> controlled animation -> transparent PNG atlas in Phaser**. A live vector or skeletal runtime remains an option to evaluate after this first character is proven.

## Sources

- [Phaser asset loading](https://docs.phaser.io/phaser/concepts/loader) and [Spine Phaser runtime](https://esotericsoftware.com/spine-phaser).
- [Firefly image-to-image](https://www.adobe.com/products/firefly/features/image-to-image.html), [Recraft documentation](https://www.recraft.ai/docs), and [Vectorizer.AI](https://vectorizer.ai/).
- [Rive features](https://rive.app/features), [OpenToonz](https://opentoonz.github.io/e/), [PixelLab](https://www.pixellab.ai/), [Krea](https://www.krea.ai/), and [EbSynth](https://ebsynth.com/).