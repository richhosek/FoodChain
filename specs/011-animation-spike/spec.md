# Feature Specification: Side-by-Side Animation Spike

**Feature Branch**: `animation-spike` (existing branch)

**Created**: 2026-11-16

**Status**: Draft

**Input**: Compare the existing Phaser Canvas path, an optimized shared-frame paramecium, and a Phaser WebGL version under equivalent dense and mixed workloads. Build a representative rigged or deforming character, assess the artist workflow and runtime costs, test real iPhone and Android devices and desktop browsers, and conditionally prototype the same scene in Godot before deciding whether to migrate.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare Equivalent Animation Workloads (Priority: P1)

As the project owner, I want to compare the current presentation with alternative animation paths under the same board conditions, so I can tell whether they improve performance without sacrificing the characters or play.

**Why this priority**: Existing dense-board results differ substantially, and a comparable baseline is needed before choosing an animation direction.

**Independent Test**: Run each candidate in an isolated 64-cell fixture with identical creature distributions and scripted interactions; compare visual behavior, frame intervals, responsiveness, loading, assets, and memory with the recorded conditions.

**Acceptance Scenarios**:

1. **Given** a dense board of 64 paramecia and a representative mixed board, **When** the current Canvas implementation and optimized shared-frame and WebGL candidates are exercised, **Then** each uses equivalent board content, display dimensions, animation behavior, input, and measurement duration on the same test configuration.
2. **Given** any candidate, **When** a reviewer observes resting and gameplay cues, **Then** blinking, independent gaze, body movement, existing flash and movement effects, and mouse or touch interaction remain recognizable and comparable to the current approved experience.
3. **Given** a 30-second foreground run, **When** results are reported, **Then** the report includes all observed frame intervals, sample count, fraction at or below 33.4 ms, p95/p99, longest stall, input outcome and latency, browser, viewport, device and renderer conditions; stalls are not discarded.
4. **Given** a candidate fails to initialize or reproduce a required behavior, **When** it is evaluated, **Then** its failure is documented and the candidate is not reported as passing or silently excluded from the comparison.

### User Story 2 - Evaluate the Character Creation Workflow (Priority: P1)

As the project's artist or owner, I want to create and evaluate one representative rigged or deforming character, so that future creatures can be produced and maintained without sacrificing their expressiveness.

**Why this priority**: The effort to create and revise several creatures and animation states matters as much as the speed of a single prototype.

**Independent Test**: Produce one representative character using a documented selected authoring tool, demonstrate its animations at board size, and compare its appearance, creation/revision workflow, delivered asset size, memory, load time and frame timing against the other candidates.

**Acceptance Scenarios**:

1. **Given** the approved character reference, **When** the representative character is authored and displayed, **Then** it preserves its recognizable silhouette, independent eye behavior and body movement, and demonstrates a gameplay effect and an interaction in the comparison scene.
2. **Given** the authored candidate and the other candidates, **When** a reviewer compares them, **Then** the same visual checklist, measured workload and reporting units are used, and the author records creation and revision steps, elapsed effort, limitations, licensing and export requirements.
3. **Given** a selected tool or required license is unavailable, **When** the spike is reported, **Then** the candidate is marked blocked, the reason and acquisition requirements are recorded, and its visual or workflow quality is not claimed as verified.

### User Story 3 - Make an Evidence-Based Platform Decision (Priority: P1)

As the project owner, I want results from real mobile devices and desktop browsers, together with a clear fallback decision, so I can choose a production direction without mistaking emulation for actual device performance.

**Why this priority**: Mobile responsiveness and a defensible decision are the purpose of the spike.

**Independent Test**: Review the results matrix for a physical iPhone, a physical Android device, and a desktop browser, and verify that the decision follows the documented performance, visual and complexity criteria.

**Acceptance Scenarios**:

1. **Given** each available physical device and desktop browser, **When** each supported candidate runs the same scenarios, **Then** the report identifies the device model, OS, browser or app environment, configuration and measured results, and distinguishes physical hardware from emulation.
2. **Given** a candidate completes each required configuration and workload, **When** evaluating performance, **Then** at least 95% of its unfiltered foreground frame intervals are at or below 33.4 ms over at least 30 seconds, and the documented selection and drag interactions succeed.
3. **Given** the WebGL candidate has complete evidence, **When** it fails a required performance or visual criterion or the owner judges its documented implementation or authoring complexity excessive, **Then** the team prototypes and measures the same scene in Godot before making a migration decision.
4. **Given** the WebGL candidate meets the performance and visual criteria and the owner accepts its documented complexity, **When** the review is complete, **Then** a Godot prototype is not required by this spike; the decision and supporting evidence are recorded.
5. **Given** a required device, license or result is unavailable, **When** the comparison is reviewed, **Then** the corresponding result and final acceptance remain unverified; inability to test is not treated as either proof of failure or a pass.

### Edge Cases

- A browser or device lacks a candidate's rendering capability, loses its graphics context, or cannot load assets: record the failure and recovery behavior without substituting a different candidate under the same label.
- A page loses foreground visibility, the measurement ends early, or no frames are sampled: invalidate that trial and report why rather than filtering stalls or declaring a pass.
- A candidate approximates an approved motion by pre-rendering: verify that independently timed gaze, blinking and body motion remain discernible and do not become synchronized across all creatures.
- A candidate supports the visual appearance but not selection, drag/cancel, effects, reduced motion or reset: document the missing behavior and fail behavioral parity for that candidate.
- The mixed board contains 16 level-0, 16 level-1, 11 level-2, 11 level-3 and 10 level-4 creatures; the dense board has 64 level-0 creatures. A separate 64-level-1 workload is included to preserve the existing amoeba stress baseline.
- If a physical device or authoring tool is unavailable, retain the incomplete result with its reason and next action; do not infer physical results from browser emulation.
- If WebGL evidence is missing or inconclusive, record the decision as pending; do not trigger or waive the conditional Godot comparison on the basis of missing evidence alone.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The spike MUST compare the existing Phaser Canvas presentation, an optimized shared-frame paramecium path, and a Phaser WebGL path in an isolated, reproducible scene; it MUST NOT replace or migrate the production game as part of this feature.
- **FR-002**: Each candidate MUST be evaluated on 64 paramecia, 64 amoebae, and the specified mixed 64-cell board, with identical positions, creature content, starting visual states, foreground duration and scripted input for a given test configuration. Differences in supported features MUST be recorded, not silently approximated.
- **FR-003**: The comparison MUST preserve the approved creature silhouettes, rank-relative sizing, independent blinking, gaze and body motion, and existing tile colors, selection, movement, reaction flash, reduced motion and reset/cancellation behavior.
- **FR-004**: A reviewer MUST be able to perform equivalent mouse and touch selection, drag and cancel actions for each candidate and verify affected-cell effects and unchanged gameplay outcomes on deterministic fixtures.
- **FR-005**: The spike MUST create one representative rigged or deforming character in a selected authoring tool, show it in the same scene, and document the tool and runtime versions, licensing, export process and candidate-specific limitations. If unavailable, the result MUST be marked blocked.
- **FR-006**: Each available candidate and workload MUST record the same measurement definitions for visual parity, authoring and revision effort, delivered asset size, loading time, peak runtime memory where measurable, frame timing, longest stall, and interaction latency. Unsupported or unavailable metrics MUST be identified with reasons and MUST NOT be invented.
- **FR-007**: Foreground frame measurements MUST span at least 30 seconds, include all intervals including stalls, provide sample count, budget fraction, p95/p99 and maximum, and record visibility and measurement validity. An interrupted or empty trial MUST be invalidated.
- **FR-008**: The evaluation MUST include at least one physical iPhone, one physical Android device and a desktop browser, with model, operating system, browser or host, viewport, device pixel ratio and relevant configuration recorded. Emulation MUST be reported separately and MUST NOT satisfy physical-device coverage.
- **FR-009**: Before comparing results, the project owner and evaluator MUST use a recorded review rubric: visual parity against approved artwork and the behaviors in FR-003 and FR-004; frame and interaction criteria in SC-002 and SC-003; and complexity assessed against recorded creation/revision steps, effort, dependencies, licenses, and maintenance risks. The owner MUST explicitly accept or reject complexity with written reasons; no numerical complexity threshold is assumed.
- **FR-010**: If WebGL fails any verified required performance or behavioral/visual criterion, or the owner rejects its documented complexity, the spike MUST include a Godot prototype of the same scenes and interactions with the same measurement definitions before a migration decision. If required evidence is unavailable, the decision remains pending rather than treating missing data as pass or failure.
- **FR-011**: The final comparison MUST present each candidate's results, blockers, visual review, known regressions, estimated migration and maintenance implications, and a reasoned recommendation with the owner's decision or pending status. It MUST distinguish prototype results from production readiness.
- **FR-012**: The spike MUST preserve the existing production game, approved design masters, game rules, deterministic outcomes, and existing test assets; any experimental code or generated artifacts MUST be isolated so results can be reproduced without overwriting existing work.

### Key Entities *(include if feature involves data)*

- **Candidate**: A distinct presentation or authored-animation approach evaluated in the spike, including its version, capabilities and limitations.
- **Workload**: A reproducible board composition, animation state and sequence of interactions shared across candidates.
- **Trial**: A candidate and workload measured on a named device and browser or host, with validity, frame intervals, input and resource metrics.
- **Character study**: One rigged or deforming representation with its source artwork, authoring process, licensing, exported assets and visual-review results.
- **Decision record**: The criteria, evidence, owner judgment, unmet requirements and any conditional follow-up needed before choosing a production direction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All required candidates are compared against all three workloads with the same documented setup and a valid 30-second foreground measurement per available configuration, or have an explicit blocked/incomplete result and reason.
- **SC-002**: A candidate passes the performance criterion on a configuration only when at least 95% of all foreground frame intervals are at or below 33.4 ms during each 30-second workload run, with no visibility interruption and at least one observed interval.
- **SC-003**: In every tested required interaction scenario, selection, drag/cancel and the expected feedback complete correctly and produce the same deterministic game outcome; input latency is reported rather than inferred from frame rate.
- **SC-004**: One representative authored character demonstrates the required body, eye and gameplay-effect behaviors at board size, and the owner records pass/fail visual parity against the approved reference with specific reasons.
- **SC-005**: The final comparison includes, for every available candidate, measured or explicitly unavailable asset size, peak memory, load time, frame timing, input latency, and documented authoring/revision effort; it identifies results from one physical iPhone, one physical Android device and one desktop browser separately.
- **SC-006**: The decision record identifies one of three states: a supported direction with evidence and owner acceptance; a conditional Godot comparison completed before a migration decision when triggered; or pending with named missing evidence. No migration is implemented by this spike.

## Assumptions

- This is a bounded comparative experiment, not approval to replace the current engine, ship a new animation pipeline, or change the project's TypeScript/browser-first constitution.
- Phaser Canvas, Phaser WebGL and the conditional Godot scene are named evaluation subjects supplied by the request, not a predetermined production architecture. The choice of authoring tool remains to be researched during planning, subject to availability, licensing and owner approval.
- The current approved paramecium and amoeba artwork and behavior provide the visual reference. The representative rigged or deforming character may be either approved creature as long as it demonstrates the required behaviors and is compared at the same board size.
- The current project target of 95% of frame intervals within 33.4 ms over 30 seconds is the minimum acceptance gate; a smoother 60 fps experience is desirable but not presumed. No absolute input-latency, asset-size, memory or load-time limit has been agreed; report these measures for owner review.
- Desktop browser and mobile-device coverage use comparable workloads; actual device hardware, browsers and available memory metrics may differ and are documented. A missing physical device leaves acceptance pending.
- The owner assesses visual and complexity tradeoffs using the recorded rubric and may ask for a Godot comparison even when the minimum gate passes; a migration decision is separate from performing this spike.