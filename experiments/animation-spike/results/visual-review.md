# Candidate Visual Review

## Current Canvas

- Candidate: actual production `BoardView`, Phaser Canvas.
- Visual reference: approved production paramecium artwork, dense 64-paramecium workload, reduced-motion state.
- Status: local visual reference captured. Owner/evaluator sign-off is not recorded; this is not an owner acceptance.

## Forced WebGL

- Candidate: production `BoardView` with explicit Phaser WebGL constructor selection and runtime renderer verification.
- Functional evidence: actual renderer reports `webgl`; deterministic fixture and mouse drag checks pass.
- Screenshot comparison: Playwright-captured baseline and WebGL screenshots are decoded to same-size 800x800 images. Mean RGB channel difference is below 12 and changed-pixel fraction is below 0.08.
- Status: local visual check passes. Physical-device validation and owner acceptance remain pending.

## Shared-Frame Canvas

- Candidate: isolated board-wide Canvas compositor using the production paramecium layers and motion logic.
- Functional evidence: mixed workload level counts, independent motion, selection/cancel, deterministic game outcome and reset checks pass.
- The experiment removes the numbered level-zero fallback labels once paramecium artwork is ready, retaining the existing cell tile/input containers beneath the board compositor.
- Reduced-motion screenshot comparison against the same Canvas baseline passes the configured mean RGB difference (<12) and changed-pixel fraction (<0.08) bounds on desktop and mobile Chromium emulation.
- Status: local visual check passes. Physical-device validation and owner acceptance remain pending.

## Limits

- These are local automated pixel comparisons, not owner visual approval or physical-device observations.
- Rigged/deforming authored study remains blocked pending owner/artist approval, tool access and license review.
