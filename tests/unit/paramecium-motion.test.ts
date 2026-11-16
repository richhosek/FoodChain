import test from 'node:test';
import assert from 'node:assert/strict';
import { createParameciumMotion, updateParameciumMotion } from '../../src/view/paramecium-motion.ts';

function sample(seed: string, duration: number, step = 0.05) {
  const state = createParameciumMotion(seed);
  const frames = [];

  for (let elapsed = 0; elapsed < duration; elapsed += step) {
    frames.push(updateParameciumMotion(state, step));
  }

  return frames;
}

test('motion is deterministic per creature while distinct seeds receive independent phases and timing', () => {
  const first = sample('creature-a', 12);
  const repeated = sample('creature-a', 12);
  const other = sample('creature-b', 12);

  assert.deepEqual(first, repeated);
  assert.notDeepEqual(first.slice(0, 20), other.slice(0, 20));
  assert.notEqual(first[0]?.ciliaFrameIndex, other[0]?.ciliaFrameIndex);
});

test('cilia ripple uses 32 indexed frames and never exceeds the requested 30-degree swing', () => {
  const frames = sample('cilia', 3);

  assert.ok(frames.some(frame => frame.ciliaFrameIndex !== frames[0]?.ciliaFrameIndex));
  assert.ok(frames.every(frame => Number.isInteger(frame.ciliaFrameIndex) && frame.ciliaFrameIndex >= 0 && frame.ciliaFrameIndex < 32));
  assert.ok(frames.some(frame => Math.abs(frame.ciliaAngleDegrees) > 20));
  assert.ok(frames.every(frame => Math.abs(frame.ciliaAngleDegrees) <= 30));
});

test('cilia phase and period are independently seeded within the resting reference range', () => {
  const first = createParameciumMotion('cilia-a');
  const second = createParameciumMotion('cilia-b');

  assert.ok(first.ciliaPeriodSeconds >= 1.45 && first.ciliaPeriodSeconds <= 1.85);
  assert.ok(second.ciliaPeriodSeconds >= 1.45 && second.ciliaPeriodSeconds <= 1.85);
  assert.notEqual(first.ciliaPhase, second.ciliaPhase);
  assert.notEqual(first.ciliaPeriodSeconds, second.ciliaPeriodSeconds);
});

test('body rotation stays within alternating 12-24 degree targets', () => {
  const frames = sample('rotation', 35, 0.1);
  const angles = frames.map(frame => frame.rotationDegrees);
  const positivePeak = Math.max(...angles);
  const negativePeak = Math.min(...angles);

  assert.ok(positivePeak >= 12 && positivePeak <= 24);
  assert.ok(negativePeak <= -12 && negativePeak >= -24);
});

test('blinks close and reopen over a short interval, independently of other creatures', () => {
  const first = sample('blink-a', 16, 0.02);
  const second = sample('blink-b', 16, 0.02);
  const closureValues = first.map(frame => frame.blinkClosure);

  assert.ok(closureValues.some(closure => closure > 0.9));
  assert.ok(closureValues.some((closure, index) => closure > 0 && closure < 1 && closureValues[index + 1] === 0));
  assert.notDeepEqual(first.map(frame => frame.blinkClosure), second.map(frame => frame.blinkClosure));
});

test('gaze visits all eight directions, stays within 58.5 scaled source units, and returns to center between short glances', () => {
  const directions = new Set<number>();
  let sawCenteredPause = false;
  let sawGlance = false;

  for (let seed = 0; seed < 80; seed += 1) {
    const state = createParameciumMotion(`gaze-${seed}`);
    let activeFrames = 0;

    for (let index = 0; index < 2400; index += 1) {
      const frame = updateParameciumMotion(state, 0.05);
      const distance = Math.hypot(frame.gazeX, frame.gazeY);
      assert.ok(distance <= 58.5 + 1e-9);

      if (frame.gazeDirectionIndex === null) {
        sawCenteredPause = true;
        activeFrames = 0;
        assert.equal(distance, 0);
      } else {
        directions.add(frame.gazeDirectionIndex);
        activeFrames += 1;
        if (activeFrames <= 15) sawGlance = true;
      }
    }
  }

  assert.deepEqual([...directions].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(sawCenteredPause, true);
  assert.equal(sawGlance, true);
});

test('gaze holds are short and centered pauses are longer', () => {
  const state = createParameciumMotion('gaze-timing');
  const step = 0.05;
  const centeredRuns: number[] = [];
  const glanceRuns: number[] = [];
  let wasCentered = true;
  let runLength = 0;

  for (let index = 0; index < 2400; index += 1) {
    const frame = updateParameciumMotion(state, step);
    const isCentered = frame.gazeDirectionIndex === null;

    if (isCentered !== wasCentered) {
      (wasCentered ? centeredRuns : glanceRuns).push(runLength * step);
      runLength = 0;
      wasCentered = isCentered;
    }
    runLength += 1;
  }

  assert.ok(centeredRuns.length > 1);
  assert.ok(glanceRuns.length > 1);
  assert.ok(centeredRuns.every(duration => duration >= 2.4 && duration <= 5.1));
  assert.ok(glanceRuns.every(duration => duration >= 0.45 && duration <= 0.95));
});

test('three internal details drift independently by only a few source units', () => {
  const frames = sample('details', 15);
  const initial = frames[0]?.internalDetails;

  assert.equal(initial?.length, 3);
  assert.ok(frames.every(frame => frame.internalDetails.length === 3));
  assert.ok(frames.every(frame => frame.internalDetails.every(detail => Math.abs(detail.x) <= 5 && Math.abs(detail.y) <= 3.5)));
  assert.ok(frames.some(frame => frame.internalDetails[0]?.x !== initial?.[0]?.x));
  assert.notDeepEqual(frames[0]?.internalDetails, frames[1]?.internalDetails);
});

test('reduced motion freezes the current frame and resumes without advancing paused time', () => {
  const state = createParameciumMotion('pause-resume');
  const beforePause = updateParameciumMotion(state, 1.25);
  const paused = updateParameciumMotion(state, 8, true);
  const stillPaused = updateParameciumMotion(state, 3, true);
  const resumed = updateParameciumMotion(state, 0.25);
  const uninterrupted = createParameciumMotion('pause-resume');
  updateParameciumMotion(uninterrupted, 1.25);
  const expectedResume = updateParameciumMotion(uninterrupted, 0.25);

  assert.deepEqual(paused, beforePause);
  assert.deepEqual(stillPaused, beforePause);
  assert.deepEqual(resumed, expectedResume);
});