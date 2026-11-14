# Prototype Validation

## Automated Checks

- `npm run typecheck`: passed with TypeScript 6.0.2 and Phaser 4.1.0 declarations.
- `npm run test:unit`: 23 passed, including seeded starting boards, accepted-board rarity over test seeds, predator thresholds, overlapping effects, apex scoring, multiple waves, win/loss, cancellation of an eight-wave cascade, and four scheduled 125 ms flash phases.
- `npm run test:e2e`: 37 passed and 3 skipped. The skips are touch-only tests in the desktop project; mobile viewport tap and emulated drag passed in Chromium. Tests include identical seeded mouse/touch outcomes, 4-8 predator explosion footprints, win, loss, reset during explosion and falling, visual effect sequencing, and landing-triggered waves.
- `npm run build`: passed; Vite reported a Phaser bundle larger than its 500 kB warning threshold.
- `npm install`: completed without reported vulnerabilities at installation time.

## Manual and Outstanding Checks

- Desktop and narrow mobile-viewport screenshots were inspected; the narrow layout had no horizontal overflow. Browser emulation is not a substitute for real devices.
- Physical iOS and Android browser, touch, and performance checks: unverified; devices were not available in this session.
- Five-participant usability check (SC-004): unverified; no participants were available in this session.
- Starting-board rejection sampling and randomly generated cascades have no specified fixed termination bound. Tests exercise cancellation, including an eight-wave cascade, but do not prove termination.
- The lockfile records license metadata for all 55 dependency entries, including platform-specific optional packages: MIT 35, Apache-2.0 5, MPL-2.0 12, ISC 1, BSD-3-Clause 1, and 0BSD 1. This is a metadata review, not a legal compliance determination.
- Distribution notices have not been assembled. Before release, identify the dependencies actually included in the shipped bundle and preserve all applicable license and notice obligations, including Phaser's MIT notice.