const CILIA_FRAME_COUNT = 32;
const CILIA_SWING_DEGREES = 30;
const BLINK_DURATION_SECONDS = 0.22;
const GAZE_FLICK_SECONDS = 0.1;

export interface ParameciumDetailOffset {
  x: number;
  y: number;
}

export interface ParameciumMotionFrame {
  elapsedSeconds: number;
  ciliaFrameIndex: number;
  ciliaAngleDegrees: number;
  rotationDegrees: number;
  blinkClosure: number;
  gazeDirectionIndex: number | null;
  gazeX: number;
  gazeY: number;
  internalDetails: ParameciumDetailOffset[];
}

interface InternalDetailMotion {
  phase: number;
  speed: number;
  amplitude: number;
}

export interface ParameciumMotionState {
  elapsedSeconds: number;
  rotationRandom: () => number;
  blinkRandom: () => number;
  gazeRandom: () => number;
  ciliaPhase: number;
  ciliaPeriodSeconds: number;
  rotationStartSeconds: number;
  rotationDurationSeconds: number;
  rotationFromDegrees: number;
  rotationTargetDegrees: number;
  nextBlinkSeconds: number;
  nextGlanceSeconds: number;
  glanceStartSeconds: number | null;
  glanceDurationSeconds: number;
  glanceDirectionIndex: number;
  details: InternalDetailMotion[];
}

function createRandom(seed: string | number): () => number {
  const text = String(seed);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let value = hash >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function range(random: () => number, minimum: number, maximum: number): number {
  return minimum + random() * (maximum - minimum);
}

export function createParameciumMotion(seed: string | number): ParameciumMotionState {
  const seedKey = String(seed);
  const ciliaRandom = createRandom(`${seedKey}:cilia`);
  const rotationRandom = createRandom(`${seedKey}:rotation`);
  const blinkRandom = createRandom(`${seedKey}:blink`);
  const gazeRandom = createRandom(`${seedKey}:gaze`);
  const rotationDirection = rotationRandom() < 0.5 ? -1 : 1;
  const rotationTargetDegrees = rotationDirection * range(rotationRandom, 12, 24);

  return {
    elapsedSeconds: 0,
    rotationRandom,
    blinkRandom,
    gazeRandom,
    ciliaPhase: ciliaRandom() * Math.PI * 2,
    ciliaPeriodSeconds: range(ciliaRandom, 1.45, 1.85),
    rotationStartSeconds: 0,
    rotationDurationSeconds: range(rotationRandom, 3, 5),
    rotationFromDegrees: 0,
    rotationTargetDegrees,
    nextBlinkSeconds: range(blinkRandom, 2, 5),
    nextGlanceSeconds: range(gazeRandom, 2.5, 5),
    glanceStartSeconds: null,
    glanceDurationSeconds: 0,
    glanceDirectionIndex: 0,
    details: Array.from({ length: 3 }, (_, index) => {
      const detailRandom = createRandom(`${seedKey}:detail:${index}`);
      return {
        phase: detailRandom() * Math.PI * 2,
        speed: range(detailRandom, 0.32, 0.48),
        amplitude: 3 + index,
      };
    }),
  };
}

function advanceRotation(state: ParameciumMotionState): void {
  while (state.elapsedSeconds >= state.rotationStartSeconds + state.rotationDurationSeconds) {
    state.rotationStartSeconds += state.rotationDurationSeconds;
    state.rotationFromDegrees = state.rotationTargetDegrees;
    state.rotationTargetDegrees = -Math.sign(state.rotationTargetDegrees) * range(state.rotationRandom, 12, 24);
    state.rotationDurationSeconds = range(state.rotationRandom, 3, 5);
  }
}

function advanceBlink(state: ParameciumMotionState): void {
  while (state.elapsedSeconds >= state.nextBlinkSeconds + BLINK_DURATION_SECONDS) {
    state.nextBlinkSeconds += BLINK_DURATION_SECONDS + range(state.blinkRandom, 2.5, 6.5);
  }
}

function advanceGaze(state: ParameciumMotionState): void {
  while (true) {
    if (state.glanceStartSeconds !== null) {
      const glanceEnd = state.glanceStartSeconds + state.glanceDurationSeconds + GAZE_FLICK_SECONDS * 2;
      if (state.elapsedSeconds < glanceEnd) return;
      state.glanceStartSeconds = null;
      state.nextGlanceSeconds = glanceEnd + range(state.gazeRandom, 2.5, 5);
      continue;
    }

    if (state.elapsedSeconds < state.nextGlanceSeconds) return;
    state.glanceStartSeconds = state.nextGlanceSeconds;
    state.glanceDirectionIndex = Math.floor(state.gazeRandom() * 8);
    state.glanceDurationSeconds = range(state.gazeRandom, 0.35, 0.65);
  }
}

function createFrame(state: ParameciumMotionState): ParameciumMotionFrame {
  const ciliaCycle = (state.elapsedSeconds / state.ciliaPeriodSeconds + state.ciliaPhase / (Math.PI * 2)) % 1;
  const ciliaFrameIndex = Math.floor(ciliaCycle * CILIA_FRAME_COUNT);
  const ciliaAngleDegrees = CILIA_SWING_DEGREES * Math.sin(ciliaCycle * Math.PI * 2);

  const rotationProgress = Math.min(
    (state.elapsedSeconds - state.rotationStartSeconds) / state.rotationDurationSeconds,
    1,
  );
  const rotationEase = (1 - Math.cos(Math.PI * rotationProgress)) / 2;
  const rotationDegrees = state.rotationFromDegrees
    + (state.rotationTargetDegrees - state.rotationFromDegrees) * rotationEase;

  const blinkAge = state.elapsedSeconds - state.nextBlinkSeconds;
  const blinkProgress = blinkAge >= 0 && blinkAge < BLINK_DURATION_SECONDS
    ? blinkAge / BLINK_DURATION_SECONDS
    : 0;
  const blinkClosure = blinkProgress === 0 ? 0 : 1 - Math.abs(1 - 2 * blinkProgress);

  let gazeX = 0;
  let gazeY = 0;
  let gazeDirectionIndex: number | null = null;
  if (state.glanceStartSeconds !== null) {
    const glanceAge = state.elapsedSeconds - state.glanceStartSeconds;
    const gazeAmount = Math.min(
      1,
      glanceAge / GAZE_FLICK_SECONDS,
      (state.glanceDurationSeconds + GAZE_FLICK_SECONDS * 2 - glanceAge) / GAZE_FLICK_SECONDS,
    );
    const direction = state.glanceDirectionIndex * Math.PI / 4;
    gazeX = 39 * Math.cos(direction) * gazeAmount;
    gazeY = 39 * Math.sin(direction) * gazeAmount;
    gazeDirectionIndex = state.glanceDirectionIndex;
  }

  const internalDetails = state.details.map(detail => ({
    x: detail.amplitude * Math.sin(state.elapsedSeconds * detail.speed + detail.phase),
    y: detail.amplitude * 0.7 * Math.cos(state.elapsedSeconds * detail.speed * 0.8 + detail.phase),
  }));

  return {
    elapsedSeconds: state.elapsedSeconds,
    ciliaFrameIndex,
    ciliaAngleDegrees,
    rotationDegrees,
    blinkClosure,
    gazeDirectionIndex,
    gazeX,
    gazeY,
    internalDetails,
  };
}

export function updateParameciumMotion(
  state: ParameciumMotionState,
  deltaSeconds: number,
  reducedMotion = false,
): ParameciumMotionFrame {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
    throw new RangeError('deltaSeconds must be a finite non-negative number');
  }

  if (reducedMotion) return createFrame(state);

  state.elapsedSeconds += deltaSeconds;
  advanceRotation(state);
  advanceBlink(state);
  advanceGaze(state);
  return createFrame(state);
}