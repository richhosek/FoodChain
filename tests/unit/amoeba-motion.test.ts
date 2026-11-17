import assert from 'node:assert/strict';
import test from 'node:test';
import { createAmoebaMotion, getAmoebaDetailOffsets, updateAmoebaMotion } from '../../src/view/amoeba-motion.ts';

function sample(seed: string, durationSeconds: number, stepSeconds = 0.05) {
  const state = createAmoebaMotion(seed);
  const frames = [];
  for (let elapsed = 0; elapsed < durationSeconds; elapsed += stepSeconds) {
    frames.push(updateAmoebaMotion(state, stepSeconds));
  }
  return { state, frames };
}

test('motion is deterministic per creature and distinct identities receive independent phases', () => {
  const first = sample('amoeba-a', 12);
  const repeated = sample('amoeba-a', 12);
  const other = sample('amoeba-b', 12);

  assert.deepEqual(first.frames, repeated.frames);
  assert.notDeepEqual(first.frames.slice(0, 40), other.frames.slice(0, 40));
  assert.notEqual(first.frames[0]?.bodyFrameIndex, other.frames[0]?.bodyFrameIndex);
  assert.notDeepEqual(
    getAmoebaDetailOffsets(first.state),
    getAmoebaDetailOffsets(other.state),
  );
});

test('shared contour frame selection advances independently and stays within the 32-frame set', () => {
  const first = sample('contour-a', 20);
  const second = sample('contour-b', 20);
  const indices = first.frames.map(frame => frame.bodyFrameIndex);

  assert.ok(indices.every(index => Number.isInteger(index) && index >= 0 && index < 32));
  assert.ok(new Set(indices).size > 10);
  assert.notDeepEqual(indices.slice(0, 80), second.frames.slice(0, 80).map(frame => frame.bodyFrameIndex));
});

test('blinks close and reopen over 0.22 seconds independently of gaze', () => {
  const first = sample('blink-a', 24, 0.02);
  const second = sample('blink-b', 24, 0.02);
  const closures = first.frames.map(frame => frame.blinkClosure);

  assert.ok(closures.some(closure => closure > 0.9));
  assert.ok(closures.some((closure, index) => closure > 0 && closure < 1 && closures[index + 1] === 0));
  assert.notDeepEqual(closures, second.frames.map(frame => frame.blinkClosure));
});

test('gaze reaches eight directions, stays bounded, and counter-tilts the eyebrow', () => {
  const directions = new Set<number>();
  let sawCentered = false;
  let sawLeft = false;
  let sawRight = false;

  for (let seed = 0; seed < 48; seed += 1) {
    const { frames } = sample(`gaze-${seed}`, 45, 0.05);
    for (const frame of frames) {
      assert.ok(Math.hypot(frame.gazeX, frame.gazeY) <= 39 + 1e-8);
      if (frame.gazeDirectionIndex === null) {
        sawCentered = true;
        assert.equal(frame.gazeX, 0);
        assert.equal(frame.gazeY, 0);
      } else {
        directions.add(frame.gazeDirectionIndex);
      }
      if (frame.gazeX < -10) {
        sawLeft ||= frame.eyebrowRotationDegrees > 0;
        assert.ok(frame.eyebrowRotationDegrees > 0);
      }
      if (frame.gazeX > 10) {
        sawRight ||= frame.eyebrowRotationDegrees < 0;
        assert.ok(frame.eyebrowRotationDegrees < 0);
      }
    }
  }

  assert.deepEqual([...directions].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(sawCentered, true);
  assert.equal(sawLeft, true);
  assert.equal(sawRight, true);
});

test('pre-baked interior detail offsets stay within bounds and retain pairwise clearance', () => {
  const state = createAmoebaMotion('interior-safety');
  const radii = [55, 24, 14, 34, 14, 24];
  const homes = [
    { x: 196, y: 460 },
    { x: 236, y: 563 },
    { x: 300, y: 520 },
    { x: 645, y: 418.5 },
    { x: 590, y: 455 },
    { x: 405, y: 490 },
  ];

  for (let elapsed = 0; elapsed < 45; elapsed += 0.05) {
    updateAmoebaMotion(state, 0.05);
    const offsets = getAmoebaDetailOffsets(state);
    assert.equal(offsets.length, homes.length);
    for (let first = 0; first < homes.length; first += 1) {
      const firstOffset = offsets[first]!;
      assert.ok(Math.abs(firstOffset.x) <= [3.2, 7.5, 8.5, 2.8, 6.8, 8][first]!);
      assert.ok(Math.abs(firstOffset.y) <= [2.4, 6, 6.8, 2.2, 5.3, 6.2][first]!);
      for (let second = first + 1; second < homes.length; second += 1) {
        const secondOffset = offsets[second]!;
        const dx = homes[first]!.x + firstOffset.x - homes[second]!.x - secondOffset.x;
        const dy = homes[first]!.y + firstOffset.y - homes[second]!.y - secondOffset.y;
        assert.ok(Math.hypot(dx, dy) > radii[first]! + radii[second]! + 3);
      }
    }
  }
});

test('reduced motion freezes state and resumes without advancing paused time', () => {
  const state = createAmoebaMotion('pause-resume');
  const beforePause = updateAmoebaMotion(state, 1.25);
  const paused = updateAmoebaMotion(state, 8, true);
  const stillPaused = updateAmoebaMotion(state, 3, true);
  const resumed = updateAmoebaMotion(state, 0.25);
  const uninterrupted = createAmoebaMotion('pause-resume');
  updateAmoebaMotion(uninterrupted, 1.25);
  const expectedResume = updateAmoebaMotion(uninterrupted, 0.25);

  assert.deepEqual(paused, beforePause);
  assert.deepEqual(stillPaused, beforePause);
  assert.deepEqual(resumed, expectedResume);
  assert.throws(() => updateAmoebaMotion(state, Number.NaN), RangeError);
  assert.throws(() => updateAmoebaMotion(state, -0.01), RangeError);
});
