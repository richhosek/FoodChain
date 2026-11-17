# Implementation Plan: Creature Sizing by Food-Chain Rank

**Branch**: `Creatures` (actual Git branch); `010-creature-sizing` (Spec Kit feature identifier) | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-creature-sizing/spec.md`.

## Summary

Assign five active food-chain ranks neutral-bound sizes of 75%, 80%, 85%, 90%, and 95% of a square cell. Each creature design defines an authoritative, tight, padding-free neutral bounding box; board percentages provide the clearance. Export and validate the authored box against actual artwork, and use actual glyph ink bounds for numbered placeholders. Apply uniform centered transforms only to visuals. Keep the active chain independent of transient board occupancy, retain all gameplay and input semantics, and validate shifted chains without implementing progression. Preserve existing rendering approaches and quantify containment, responsiveness, and known regressions.

## Technical Context

**Language/Version**: TypeScript 6.0.2; Node.js >=24.16 and <25.

**Primary Dependencies**: Phaser 4.1.0, Vite 8.3.8, Playwright 1.65.1; no new runtime dependency.

**Storage**: Design-authored neutral bounds carried in asset metadata, view-only rank configuration and placeholder font metrics; no gameplay fields or player persistence.

**Testing**: Node `node:test` for rank and transform mathematics; Playwright desktop/mobile for independently measured pixels, input, effects, fallback, and dense-board timing; typecheck and production build. Physical devices and participant checks reported separately.

**Target Platform**: Desktop and mobile browsers with mouse, touch, and reduced-motion support.

**Project Type**: Client-side browser game, Phaser Canvas renderer.

**Performance Goals**: Preserve the feature-009 64-amoeba threshold of >=95% foreground frame intervals <=33.4 ms across 30 seconds; measure before/after dense paramecium and mixed-board workloads under comparable conditions, retaining all intervals. The existing paramecium baseline missed its target; do not assume it passes.

**Constraints**: 8x8, 800x800 logical board and 100-unit cells; current supported creature levels 0-4; existing cell input, colors, hierarchy key, effects, identity, RNG and gameplay rules unchanged. Visible neutral longest side within one percentage point of target, centered and uniformly scaled; stationary motion must remain within cell.

**Scale/Scope**: Up to 64 pieces; five active consecutive ranks. Future 1-5 and other chains are pure configuration tests only. No level progression, new creature art, rule changes, or feature implementation in this planning phase.

## Constitution Check

**Before research: PASS, subject to validation.**

- **Explicit and testable rules**: The specification defines presentation sizes and edge cases; gameplay rules stay unchanged and outcome parity receives deterministic tests.
- **Mobile-first and cross-input**: Keep existing browser stack and full-cell mouse/touch handling; validate desktop, mobile emulation and available physical devices separately.
- **Engine evaluation**: Retain Phaser Canvas selected in [prototype research](../001-gameplay-prototype/research.md); no renderer or engine change is proposed.
- **Mechanics before art**: Preserve independently testable game rules, existing numbered fallback, and separately specified artwork.
- **Reproducibility**: Mapping and calibration are deterministic and consume no gameplay randomness; tests cover reset, refill and effects.

## Project Structure

### Documentation (this feature)

```text
specs/010-creature-sizing/
  spec.md
  plan.md
  research.md
  data-model.md
  contracts/board-sizing.md
  quickstart.md
  tasks.md                   # generated in the next phase
```

### Source Code (repository root, proposed)

```text
src/view/
  creature-sizing.ts         # proposed pure rank/transform logic
  board-view.ts              # label, chain and unchanged interaction integration
  paramecium-view.ts         # nested artwork placement and scale
  amoeba-view.ts             # shared composite artwork placement and scale
  *-assets.ts                # consume design-authored bounds metadata
docs/art/                    # creature design masters and neutral box definitions
scripts/
  generate-paramecium-assets.mjs
  generate-amoeba-assets.mjs # export and validate authored bounds
tests/unit/                  # proposed rank, validation and transform tests
tests/e2e/                   # proposed sizing, input, effects and timing checks
```

**Structure Decision**: Keep the current single application and game domain untouched. Define bounds alongside each creature design, export them through existing asset manifests, and add a small shared view-only rank/geometry helper. Reconcile the paramecium preview used for export with its master; preserve aligned internal canvases without treating their transparent margins as box padding. Never derive authoritative creature bounds by runtime alpha scanning.

## Design and Validation Sequence

1. Establish baseline typecheck, unit, relevant desktop/mobile rendering/input/effect checks and isolated dense-board measurements; record failures and environment before changes.
2. Write tests for five-rank mapping, invalid configuration, absent occupants and shifted chains. Add deterministic transform tests for asymmetric visible bounds, aspect, centering and rounding.
3. Author tight neutral bounding rectangles with both creature designs, documenting pose, strokes, coordinate system and source identity. Update exporters and manifests to carry those boxes and map design coordinates to existing aligned layer canvases; reconcile the paramecium preview with its master. Independently validate neutral visible bounds and inverse parity at source and runtime resolution. Measure numeric placeholder glyph ink using the actual selected font and exercise preferred-font and fallback-font cases.
4. Integrate the shared mapping and visual-only transforms into paramecium artwork, amoeba overlay, and text/fallback creation and late asset attachment. Preserve cell geometry, movement/selection targets, identity state, and existing effect order.
5. Add independent pixel-based tests for every rank, neutral bounds, centering, sparse/empty boards, redraw, async loading, effects, refill and reset; verify mouse/touch including cell-edge input and seeded gameplay outcome parity. Test reduced motion at startup and when toggled live.
6. Validate stationary motion envelope on an oversized transparent surface across frames, rotation and eye/detail extrema. If neutral targets and containment conflict, halt and obtain a decision instead of clipping or altering motion silently. Re-run dense-board measurements and full regression commands, noting existing failures separately. Record physical-device and five-person usability results or unavailability.

## Constitution Check After Design

**PASS by design, subject to implementation and measured verification.** The plan makes no gameplay-rule or RNG changes, preserves current engine and mixed visual representations, includes deterministic automated coverage and mouse/touch verification, and explicitly separates emulation from physical-device evidence. No exception is proposed.

## Complexity Tracking

No constitution violations or new runtime dependencies are proposed. A small shared rank and geometry helper is justified by three distinct visual paths that must obey one sizing rule. Do not introduce stage progression or a generic rendering framework for this feature.