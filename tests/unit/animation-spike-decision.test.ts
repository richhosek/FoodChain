import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDecision } from '../../experiments/animation-spike/src/decision.ts';

test('requires Godot after a verified WebGL parity failure even when timing is pending', () => {
  assert.deepEqual(evaluateDecision({ behavior: 'fail', performance: 'pending', complexity: 'pending', godot: 'not-started', ownerRequestedGodot: false }), {
    status: 'godot-required',
    godotRequired: true,
  });
});

test('requires Godot when the owner rejects WebGL complexity', () => {
  const result = evaluateDecision({ behavior: 'pass', performance: 'pass', complexity: 'rejected', godot: 'incomplete', ownerRequestedGodot: false });
  assert.equal(result.godotRequired, true);
  assert.equal(result.status, 'godot-required');
});

test('accepts a supported direction only with complete evidence and owner complexity acceptance', () => {
  assert.deepEqual(evaluateDecision({ behavior: 'pass', performance: 'pass', complexity: 'accepted', godot: 'not-started', ownerRequestedGodot: false }), {
    status: 'webgl-supported',
    godotRequired: false,
  });
});

test('keeps missing evidence pending and does not infer a Godot trigger', () => {
  assert.deepEqual(evaluateDecision({ behavior: 'pass', performance: 'pending', complexity: 'accepted', godot: 'not-started', ownerRequestedGodot: false }), {
    status: 'pending',
    godotRequired: false,
  });
});

test('requires an explicitly requested Godot comparison and reports it complete only when complete', () => {
  assert.deepEqual(evaluateDecision({ behavior: 'pass', performance: 'pass', complexity: 'accepted', godot: 'complete', ownerRequestedGodot: true }), {
    status: 'godot-complete',
    godotRequired: true,
  });
  assert.equal(evaluateDecision({ behavior: 'pass', performance: 'pass', complexity: 'accepted', godot: 'pending', ownerRequestedGodot: true }).status, 'godot-required');
});
