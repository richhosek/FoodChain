# Quickstart: Side-by-Side Animation Spike

## Prerequisites and Safety

- Windows or another supported development environment, Node.js >=24.16 and <25, the repository's existing dependencies and Playwright Chromium. The isolated Canvas, shared-frame, and forced-WebGL candidates and desktop trial harness are implemented.
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

1. Follow [the harness contract](contracts/spike-harness.md): verify one board per candidate, forced actual renderer, reproducible fixture/checksum, independent motion, ready barrier and teardown. Run `npm run dev -- --host 127.0.0.1`, then open `/experiments/animation-spike/index.html?candidate=current-canvas&workload=mixed&seed=17` on the Vite URL it prints. Use `candidate=shared-frame` or `candidate=webgl` for the other implemented candidates and each workload ID `dense-paramecium`, `dense-amoeba`, or `mixed`.
2. Before any performance test, verify all applicable selection, drag/cancel, flash/reaction, refill/reset, reduced-motion and deterministic-outcome mechanics, plus applicable desktop/mobile and mouse/touch UI actions for the change. Verify candidate failures, context loss and teardown. Run `npx playwright test tests/e2e/animation-spike-harness.spec.ts tests/e2e/animation-spike-parity.spec.ts tests/e2e/animation-spike-platform.spec.ts --workers=1`, `npm run test:unit`, `npm run typecheck`, and `npm run build` without performance tests. Record device/configuration, commands and results in `experiments/animation-spike/results/verification.md`.
3. Review the verification record. Start no performance test unless every applicable prerequisite succeeded. If any prerequisite failed or is incomplete, record the reason and leave timing pending; do not treat emulation as physical-device verification.
4. Only after the target configuration's gate passes, run its performance test in a dedicated invocation, separate from functional tests and all other performance invocations. For desktop, the candidate-specific commands are:

	```powershell
	npx playwright test tests/e2e/animation-spike-performance.spec.ts --project=desktop --workers=1 --grep "desktop trials for current-canvas"
	npx playwright test tests/e2e/animation-spike-performance.spec.ts --project=desktop --workers=1 --grep "desktop trials for shared-frame"
	npx playwright test tests/e2e/animation-spike-performance.spec.ts --project=desktop --workers=1 --grep "desktop trials for webgl"
	```

	Each command runs its three workloads serially, each for >=30 foreground seconds. Do not execute these commands concurrently. Retain all raw intervals and report p95/p99, maximum, sample count, budget fraction, input acknowledgment latency, asset transfer/decoded sizes, load time and comparable peak memory or an explicit unavailable reason. The captured desktop trial cache policy is `unspecified` and GPU acceleration was unavailable; record actual conditions rather than inferring them.
5. Repeat functional verification and, once its applicable gate passes, isolated timing on at least one real iPhone, one real Android device and a desktop browser. Record model, OS, browser/host, viewport/DPR, graphics acceleration and actual conditions. Browser emulation is supplementary, not device evidence; unavailable devices leave coverage pending.
6. After owner/artist approval, create one representative rigged/deforming study; time initial creation and one defined revision, document tool versions, license, privacy/export requirements and compare its appearance using the same rubric. Verify its applicable mechanics/UI before its separate timed trials. If blocked, record the reason and do not claim its workflow was evaluated.
7. Record the owner's visual and complexity judgments. If WebGL has a verified performance or parity failure, or complexity is rejected, build and evaluate the equivalent isolated Godot scene before any migration decision. The current desktop WebGL trials fail the frame-budget criterion and trigger that comparison; Godot is not installed in the current environment, and no installation has been attempted. Verify Godot's applicable mechanics/UI before any separate Godot timing. Missing evidence without a verified trigger stays pending; see [decision model](data-model.md).
8. Present a results matrix with raw evidence, limitations and the owner's decision or pending status. Run final non-performance regressions separately from timed trials and document any pre-existing or newly observed failures.

Desktop performance results are recorded in `experiments/animation-spike/results/matrix.md` and the raw files in `experiments/animation-spike/results/trials/`. Physical-device measurements, authored-study results and owner sign-off remain pending.