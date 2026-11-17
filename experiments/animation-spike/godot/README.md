# Conditional Godot Comparison

## Trigger

The isolated desktop performance trials for forced Phaser WebGL are valid and miss the required 95% of foreground intervals <=33.4 ms on all three workloads. Under FR-010 and the harness decision contract, this triggers the equivalent Godot comparison before any production migration decision.

## Status: Blocked

- `godot` and `godot4` are not available on PATH in the current environment.
- No Godot toolchain installation, download, project generation, or runtime setup was attempted; this plan does not authorize tool installation.
- Owner authorization for acquiring/configuring the toolchain and any license/platform review has not been recorded.
- No Godot scene, parity test, or performance trial exists yet.

## Required Before Comparison

1. Obtain owner authorization for the required Godot toolchain setup and record its version and license.
2. Verify its browser export and rendering support for the intended desktop target.
3. Implement the equivalent three-workload scene and interactions only after the toolchain is available.
4. Verify mechanics and UI actions before any separate Godot performance trials.

No production migration is authorized or recommended from the current incomplete comparison.
