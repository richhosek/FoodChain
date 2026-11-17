# Data Model: Side-by-Side Animation Spike

## Candidate

- `id`: stable unique identifier for current Canvas, shared-frame Canvas, forced WebGL, authored-character study, or conditional Godot.
- `engineVersion`, `renderer`, `animationMethod`, `sourceRevision`, `assetHashes`, `toolAndLicense`: recorded descriptions; unknown or unavailable values carry a reason.
- `capabilities`: explicit support or verified failure for the required animation, sizing, effects, input, reduced-motion and cancellation behaviors. A forced WebGL candidate must report the actual renderer; a Canvas fallback is not the same candidate.
- `status`: `ready`, `blocked`, `failed`, or `incomplete`. Missing tool access or data is not a passing result.

## Workload

- `id`: `dense-paramecium`, `dense-amoeba`, or `mixed`.
- `board`: 8x8, 64 stable IDs and positions, with level counts respectively 64/0/0/0/0, 0/64/0/0/0, and 16/16/11/11/10. Use one fixed explicit seed and record the actual row-major fixture and checksum.
- `initialVisualState`: repeatable per-creature phases, blink and gaze schedules, rotation, and authored design bounds; identical logical values across candidates. Any unavoidable representation difference is recorded and requires visual review.
- `interactionScript`: same positions and ordered selection, drag/cancel, flash, reaction, reset and reduced-motion cases; measure timing run and scripted parity separately with identical per-candidate timing policy.

## Trial

- `candidateId`, `workloadId`, `runId`, `deviceKind` (physical desktop, physical iPhone, physical Android, or emulated), device model, OS, browser/host and versions, GPU/acceleration when available, viewport, DPR, renderer and build mode.
- `timing`: cold/warm policy, initial ready time, warm-up interval, all raw foreground frame intervals, observation duration, sample count, fraction <=33.4 ms, p95/p99 and maximum, visibility changes and context loss. Percentiles use a documented consistent method. Minimum duration 30 seconds; nonzero samples and continuous foreground are required for validity.
- `input`: action sequence, input mode, timestamps, acknowledgment definition, latency and expected/actual deterministic outcome; failed, missing and unsupported inputs are not treated as passing.
- `resources`: transferred compressed bytes, decoded asset bytes or estimated texture allocation separately, initialization-to-ready time, and peak memory where measurable, with scope/tool/method or unavailable reason. Do not compare unlike definitions as equivalent.
- `status`: `valid`, `invalid`, `failed`, or `blocked`. Invalid visibility, missing data or failed initialization cannot produce a performance pass; retain all samples including stalls.

## Character Study and Review

- `reference`: copied approved master and design-authored neutral bounds, source hash, chosen creature, neutral pose and fixed board size.
- `authoring`: tool/runtime versions, license terms, whether artwork leaves the machine, time for initial creation and defined revision, export steps and artifacts, observable limitations.
- `visualReview`: owner/evaluator, checklist outcomes with reasons for silhouette, independent eye/blink, body motion, effect, sizing, behavior and state continuity. No unapproved result becomes a pass.

## Decision Record

1. Establish and record owner/evaluator rubric before reviewing results; acceptance of visual parity and complexity requires the owner's explicit reasons.
2. Classify each required WebGL trial separately. A verified performance/behavior/visual failure or owner complexity rejection triggers the equivalent Godot comparison; unavailability alone does not.
3. If triggered, keep the production recommendation pending until the equivalent Godot prototype and measurement report are complete. If required evidence is missing or inconclusive with no trigger, retain pending and list dependencies. If all required evidence passes and complexity is accepted, Godot is optional.
4. Record evidence links, known failures, migration/maintenance implications and a recommended direction; the owner makes a separate production migration decision.