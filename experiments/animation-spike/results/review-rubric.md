# Pre-Results Review Rubric

This rubric is established before any timed comparison. Evaluation evidence is local automated evidence until reviewed and accepted by the project owner.

## Visual and Behavior

Compare each available candidate with the approved art and current Canvas baseline for silhouette, rank-relative sizing, independent blink and gaze, body movement, tile colors, selection, movement/convergence, reaction flash, refill, reset/cancel, reduced motion and mouse/touch interaction. Record pass/fail/unverified per item with evidence and reasons. A failed item is not offset by a strong result elsewhere.

## Performance and Input

A performance pass requires a valid foreground run of at least 30 seconds with nonzero samples, no visibility interruption or context loss, all intervals retained, at least 95% of intervals <=33.4 ms, and the specified p95/p99/maximum and input outcomes recorded. Input latency is reported separately from frame timing. Invalid or unavailable runs remain invalid or pending.

## Complexity

Record authoring and revision steps/effort, dependencies, licenses, privacy/export requirements, maintenance risks and platform limitations. The project owner must explicitly accept or reject complexity in writing with reasons; no numeric complexity score or threshold is assumed.

## Platform Evidence

Identify physical desktop, physical iPhone, physical Android and emulation separately. Record model, OS, browser/host, viewport, DPR, renderer and relevant graphics conditions. Emulation never satisfies physical-device coverage.

## Decision

Verified WebGL performance or behavior/visual failure, or owner rejection of documented complexity, triggers the equivalent Godot comparison before any migration decision. Missing or inconclusive evidence alone remains pending. No prototype result constitutes production readiness or authorizes migration.

## Current Review Status

Owner acceptance/rejection and physical-device observations have not been recorded. The automated Canvas, shared-frame, and WebGL browser checks pass locally; see `visual-review.md`. Physical-device validation remains pending.
