# Animation Spike Decision

## Interim Recommendation: Retain Phaser Canvas

Keep the current Phaser Canvas implementation as the production renderer for now. It is the strongest of the measured desktop options across the required workloads, passing dense amoeba and mixed-board thresholds while the shared-frame candidate passes only mixed and WebGL fails all three. No production migration is authorized or recommended from this incomplete platform comparison.

## Evidence

- Current Canvas, shared-frame Canvas and forced WebGL implement the deterministic 64-paramecium, 64-amoeba and mixed fixtures in the isolated harness.
- Canvas and forced WebGL pass the current local fixture, input, and deterministic game-outcome checks on desktop Chromium and mobile Chromium emulation.
- Forced WebGL passes the local reduced-motion screenshot comparison against Canvas. This is not owner approval or physical-device evidence.
- Shared-frame passes local mechanics/input checks and the reduced-motion screenshot comparison on desktop and mobile emulation. This is not owner approval or physical-device evidence.
- The latest animation-spike browser run reports 60 passed, 0 failed and 4 skipped across desktop and mobile emulation.
- The selected existing mechanics/UI regression run reported 133 passed, 2 failed and 7 skipped. Both failures were the idle-hint cancellation test firing before pointer-down because its setup advanced to 9 seconds before input. The test now uses a five-second margin and the complete `gameplay-helpers.spec.ts` file passes (14 passed) across desktop and mobile; production gameplay code was unchanged. The full broader selected regression set has not been rerun after this test-only correction.
- Unit tests pass 148/148; type-check and production build pass.
- Physical iPhone and Android coverage is unavailable/unconfirmed. `adb` is unavailable. These gaps do not establish candidate failure or success.
- The authored rig/deform study is blocked pending owner/artist approval, tool access, license/privacy review and permission to use artwork.
- Nine valid desktop timing trials are recorded, one per candidate/workload. Current Canvas: dense paramecium 92.33% (fail), dense amoeba 95.92% (pass), mixed 95.23% (pass). Shared-frame: 90.43% (fail), 91.98% (fail), 95.38% (pass), respectively. Forced WebGL: 0%, 5.45%, 0% (all fail). See `matrix.md` and raw reports.
- All measurements came from one local Windows/Win32 Playwright desktop Chromium setup at 1280x900, DPR 1. GPU acceleration and exact desktop model are unavailable; cache policy is unspecified. These results must not be generalized to all desktop hardware.
- Physical iPhone/Android performance, owner visual approval, and owner complexity judgment are still missing. No production-readiness conclusion is supported.

## Decision Rule Application

- The desktop performance gate passed for the tested desktop configuration. All three WebGL workloads miss the 95% threshold, so FR-010 triggers the equivalent Godot comparison before any production migration decision.
- Godot is not installed on PATH. No installation was attempted; the triggered comparison is blocked pending toolchain availability/authorization. Missing physical mobile results remain pending and are not inferred from desktop measurements.
- No production migration is implemented or authorized by this spike. Retaining Canvas is an interim recommendation, not a finalized cross-platform engine decision.

## Next Evidence Needed

1. Make the authorized Godot toolchain available and complete its equivalent functional/UI checks before any Godot timing.
2. Complete functional and performance verification on physical iPhone and Android devices; desktop emulation does not substitute.
3. Obtain owner/artist decision for the authored-character tool and artwork workflow.
4. Obtain owner visual/complexity review and revisit the interim renderer recommendation with the complete evidence matrix.
