# Quickstart: Side-by-Side Animation Spike

## Prerequisites and Safety

- Windows or another supported development environment, Node.js >=24.16 and <25, the repository's existing dependencies and Playwright Chromium. The planned experiment is not yet implemented; no new run command or passing result is implied by this document.
- Obtain explicit owner/artist agreement and review terms before acquiring an authoring tool or uploading artwork. Check whether real iPhone and Android devices are available. Missing hardware, permissions, licenses or unsupported metrics must be recorded as pending or blocked.
- Work in isolated `experiments/animation-spike/` paths and use new empty output directories; never overwrite existing artwork or production assets. Existing uncommitted workspace changes must be preserved.

## Existing Baseline

From the repository root, verify the existing project and inspect historical results:

```powershell
npm run typecheck
npm run test:unit
npm run build
```

The existing benchmarks are documented in [feature 010](../010-creature-sizing/quickstart.md). Their prior Canvas results are context only: the paramecium fixture includes a production scene and is not directly comparable to the isolated amoeba fixture. Capture a new matched baseline in the experiment; do not report the old figures as this spike's result.

## Execute After Implementation

1. Follow [the harness contract](contracts/spike-harness.md): verify one board per trial, forced actual renderer, reproducible fixture/checksum, independent motion, ready barrier and teardown. Check dense paramecium, dense amoeba and mixed 16/16/11/11/10 workloads for each available candidate.
2. On desktop and mobile browser emulation, exercise selection, drag/cancel, flash/reaction, reset, reduced motion and deterministic outcomes. Validate failure, context loss and invalid foreground-trial reporting. Use the actual browser project rather than interpreting a renderer fallback as WebGL.
3. Run each timed candidate/workload serially for >=30 foreground seconds after identical warm-up; retain raw intervals and report p95/p99, maximum, sample count, budget fraction, input acknowledgment latency, asset transfer/decoded sizes, load time and comparable peak memory or an explicit unavailable reason. Measure from fresh pages with a recorded cache policy.
4. Repeat on at least one real iPhone and one real Android device and a desktop browser. Record model, OS, browser/host, viewport/DPR, graphics acceleration and actual conditions. Browser emulation is supplementary, not device evidence.
5. After approval, create one representative rigged/deforming study; time initial creation and one defined revision, document tool versions, license, privacy/export requirements and compare its appearance and measurements using the same rubric. If blocked, record the reason and do not claim its workflow was evaluated.
6. Record the owner's visual and complexity judgments. If WebGL has a verified performance or parity failure, or complexity is rejected, build and evaluate the equivalent isolated Godot scene before any migration decision. Missing evidence without a verified trigger stays pending; see [decision model](data-model.md).
7. Re-run focused experiment tests and project typecheck, unit tests and build. Run applicable interaction regressions; document any pre-existing or newly observed failures. Present a results matrix with raw evidence, limitations and the owner's decision or pending status.

Exact experiment commands, tool versions, runtime dependencies and device setup are to be added when the harness is implemented. No physical-device, authored-study or performance result is asserted by this plan.