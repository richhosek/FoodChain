# Research: Side-by-Side Animation Spike

## Fair Candidate Comparison

**Decision**: Use one isolated same-origin experiment page and one active 800x800 logical board per trial. Compare (A) the unchanged current Phaser Canvas implementation, (B) an experimental shared-frame paramecium implementation on Phaser Canvas, (C) an experimental Phaser WebGL implementation, and (D) one authoring-tool character study integrated into the same scene when available. Run each against 64 paramecia, 64 amoebae, and the same seeded mixed 16/16/11/11/10 distribution, with identical positions, IDs, seeded visual states, sizes, scripted events, and measurement procedure. D may be an additional adapter or a documented combination with a renderer candidate; specify which creature it replaces and keep the other creature's implementation and workloads explicit. A candidate unable to provide an entire workload is incomplete, not exempt.

**Rationale**: The existing `paramecium-performance.spec.ts` starts the production scene and adds a second board; the amoeba and mixed-board harnesses start from a blank same-origin page. Their historical results are not directly comparable. Prior results identify risk but are not results for this matched trial. Production uses `Phaser.CANVAS` explicitly in `src/view/board-view.ts`; its constructor does not take a renderer option.

**Alternatives considered**: Compare previous reports, rejected because scenes and workload differ; change production `BoardView` to select renderers, rejected because the spike must not modify production behavior; compare only simplified sprites, rejected because facial motion, effects, and interaction are part of the actual workload.

## WebGL and Rendering Strategy

**Decision**: Make experimental adapters separate from production sources. Preserve A as the actual production Canvas board, not a reconstruction; route a blank page and instantiate exactly one real `BoardView`. Build B and C as isolated experimental presentations using equivalent deterministic fixtures and asset identities. Force `Phaser.WEBGL` for C and report actual renderer and initialization/context loss errors; no automatic Canvas fallback under a WebGL label. Avoid assuming that the Canvas board composite performs well as a frequently uploaded WebGL texture. Evaluate shared atlases/layers and per-instance state with no per-frame texture uploads as a starting hypothesis, then measure; retain approved visuals, inversion, selection, movement, reset and input.

**Rationale**: The current amoeba renderer composites into one dirty-cell canvas, whereas the paramecium creates per-creature body and eye canvases. Changing the renderer flag on the existing board would not necessarily improve either: texture refresh in WebGL may upload to the GPU, and Canvas-only blending and pixel readback tests need alternative verification. Game rules in `src/game/` are independent of Phaser and can be reused without production modification.

**Alternatives considered**: Per-creature canvas texture refresh under WebGL, a candidate only if measured, not assumed efficient; migrate the production board, rejected for this spike; use `Phaser.AUTO`, rejected for the explicit WebGL trial because fallback hides failure.

## Character Study and Licensing

**Decision**: Propose Rive for one amoeba study, contingent on artist/owner approval, account access, export capability, privacy and license review. Work from a copy of the approved master, preserve independent eyes/blink and contour deformation, and record a timed initial creation and a small defined revision. Compare a reproducibly exported candidate integrated in the same workload matrix; live runtime integration is an unverified option, not assumed. If approval, license, local/remote processing or export is unavailable, mark the study blocked with requirements and next action. An owner-approved alternate such as a Godot 2D rig may be researched, but not silently substituted or installed.

**Rationale**: A tool-driven character evaluates production workflow rather than only performance; the current SVG and scripted frame exporters do not demonstrate that workflow. Rive's mesh workflow and export terms must be checked at execution; hosted exports may upload artwork and paid features may apply. Spine is another candidate, but its runtime license and editor version must be verified; official compatibility guidance states newer spine-phaser-v4 releases require Phaser 4.2.1, and its Canvas backend does not support meshes. No purchase, upload, install, upgrade, or license acceptance is authorized by this plan.

**Alternatives considered**: Existing procedural frames alone, useful as B but not an authored-character study; Spine, a valid owner-approved alternative subject to license and version compatibility; hand-coded deformation labeled as authored study, rejected because it cannot establish artist workflow.

## Measurement and Decision

**Decision**: Gather serial, foreground, unfiltered requestAnimationFrame intervals for at least 30 seconds; retain raw timestamps or intervals and derive sample count, fraction <=33.4 ms, p95/p99 and maximum, plus visibility/context loss and renderer identity. Each candidate gets a fresh page, controlled asset-ready barrier, warm-up, same viewport/logical resolution/DPR, seeded state and deterministic interaction script. A separate controlled visual/effect and input run avoids measuring a different event timeline; the timing run uses the same specified actions and independent animation. Record input-to-acknowledgment timing and semantics, and report unavailable metrics explicitly.

Define transferred versus decoded asset bytes separately; load time from candidate initialization to all required artwork ready; peak memory only through a supported comparable tool with collection method and scope, otherwise unavailable. Record cold/warm cache policy, build mode, device/browser/GPU and hardware acceleration, trials, update rate, and raw evidence. Use actual physical iPhone and Android runs plus desktop browsers; emulation is supplementary. Require visual review and owner-signed complexity decision, not a fabricated numeric complexity score.

**Rationale**: Frame budget alone does not demonstrate parity, input response, memory, or authoring cost. Browser memory APIs are inconsistent; claiming a portable peak metric would be misleading. Desktop headless software rendering may not represent device GPU behavior.

**Alternatives considered**: Drop slow frames or use fake clocks, rejected; compare emulator data as hardware, rejected; rely on average FPS, rejected; infer memory from compressed PNG size, rejected.

## Conditional Godot Prototype

**Decision**: If verified WebGL performance or behavioral/visual criteria fail, or the owner rejects its documented complexity, prototype equivalent workloads and interactions in an isolated Godot experiment before any migration decision. If required evidence is unavailable or inconclusive and no verified failure or owner rejection exists, mark the branch pending. Owner may request the comparison even after a pass. Preserve the current production game and game-rule behavior; compare deterministic outcome fixtures across implementations.

**Rationale**: This preserves the user's conditional decision rule and does not equate missing hardware with failure. The project constitution currently requires a browser-based TypeScript initial version; an isolated alternative evaluation does not authorize changing it. Godot 4 web documentation states WebGL 2 Compatibility renderer is required and C# web export is unsupported; test actual platform/version, browser, deployment constraints and integration, including accessibility, before drawing conclusions.

**Alternatives considered**: Automatically migrate after a bad emulator run, rejected; waive a verified failure because physical devices are absent, rejected; run a Godot scene with fewer features and call it equivalent, rejected.

## Sources and Existing Evidence

- [Feature specification](spec.md), [prior sizing baseline and limitations](../010-creature-sizing/quickstart.md), [amoeba renderer research](../009-level-one-amoeba/research.md), [engine comparison](../001-gameplay-prototype/research.md).
- [Phaser rendering constants](https://docs.phaser.io/api-documentation/constant/phaser), [CanvasTexture](https://docs.phaser.io/api-documentation/class/textures-canvastexture), [Spine Phaser runtime](https://esotericsoftware.com/spine-phaser), [Rive mesh documentation](https://rive.app/docs/editor/manipulating-shapes/meshes), [Rive export documentation](https://rive.app/docs/editor/exporting/exporting-for-video-and-static-design), [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).