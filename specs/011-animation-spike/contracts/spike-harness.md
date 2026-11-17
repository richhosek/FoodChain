# Animation Spike Harness Contract

## Candidate Interface

The experiment exposes distinct candidate identifiers for the unchanged Canvas baseline, shared-frame Canvas, forced WebGL and the authored-character study, plus the conditional Godot candidate when triggered. Each accepts the same fixture, visual seed and scripted actions, provides a ready or explicit blocked/failure state, reports its actual renderer, supports teardown, and never modifies production state or design masters. The baseline uses the actual production `BoardView` on a blank page. No more than one candidate scene runs during a trial.

## Workloads and Behavior

- Three fixed 8x8 boards: 64 paramecia; 64 amoebae; and a seeded mixed board of 16/16/11/11/10 levels 0-4. Store the complete ordered IDs and positions, seed and fixture checksum.
- Candidates use identical cell sizes, authored neutral bounds, visual initial states and scripted interaction timing. Preserve silhouette, independent blink/gaze/body motion, existing tiles and selection, inversion phases, move/convergence/refill, drag/cancel, reset and reduced-motion semantics. Reuse deterministic rules or compare identical serialized fixture outcomes.
- For an authored study, disclose exactly which creature it replaces. Missing artwork or unsupported workload is recorded as incomplete, not filled with a different candidate while reporting a pass.
- WebGL must be explicitly requested and verified; context initialization failure, loss, asset failure or unsupported features are reported without silently switching renderer.

## Trial Lifecycle and Metrics

1. Start a fresh isolated page and one scene; record candidate/version/renderer, workload, device/browser/OS, viewport/DPR, acceleration, cache policy and asset hashes. Wait for all required assets, establish ready time, warm up identically and confirm foreground.
2. Collect all frame intervals over at least 30 seconds, retaining stalls and raw samples. Report sample count, duration, fraction <=33.4 ms, p95/p99 and maximum. Missing samples, background visibility or context loss invalidates a run. At least 95% of valid intervals must meet the budget for a performance pass.
3. Use consistent mouse/touch interaction actions and measure request-to-acknowledgment latency with explicit timestamps and expected outcomes. Verify visual/effect parity in a separate deterministic run using the same fixture.
4. Record delivered compressed bytes, decoded/estimated texture bytes, initialization-to-ready, and peak runtime memory only if the measurement mechanism and scope are comparable. Mark unsupported metrics unavailable with reasons. Report visual review and documented initial/revision workflow, time, licensing and constraints.
5. Destroy the candidate scene and clean up timers/listeners before another trial; do not run performance trials concurrently. Physical iPhone and Android results are identified separately from emulation.

## Decision and Safety

Verified WebGL performance or parity failure, or explicit owner rejection of documented complexity, triggers a same-scene Godot prototype before any migration decision. Missing or inconclusive evidence without a trigger leaves the decision pending. A candidate's emulator pass is not physical-device acceptance. Owner acceptance and written reasons, licensing and platform gaps are part of the decision record. Nothing in this contract authorizes a production migration, dependency upgrade, tool purchase, or uploading artwork.