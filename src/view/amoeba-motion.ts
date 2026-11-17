const CONTOUR_FRAME_COUNT = 32;
const FACE_FRAME_STEPS = 4;
const BLINK_DURATION_SECONDS = 0.22;
const GAZE_FLICK_SECONDS = 0.1;
const INTERIOR_CLEARANCE = 3;

export interface AmoebaDetailOffset {
  x: number;
  y: number;
}

export interface AmoebaMotionFrame {
  elapsedSeconds: number;
  bodyFrameIndex: number;
  faceFrameIndex: number;
  blinkClosure: number;
  gazeDirectionIndex: number | null;
  gazeX: number;
  gazeY: number;
  eyebrowRotationDegrees: number;
}

interface InteriorDetailState {
  homeX: number;
  homeY: number;
  radius: number;
  amplitudeX: number;
  amplitudeY: number;
  phase: number;
  speed: number;
  phaseOffset: number;
}

export interface AmoebaMotionState {
  elapsedSeconds: number;
  bodyFramePhase: number;
  bodyFramePeriodSeconds: number;
  blinkRandom: () => number;
  gazeRandom: () => number;
  nextBlinkSeconds: number;
  nextGlanceSeconds: number;
  glanceStartSeconds: number | null;
  glanceDurationSeconds: number;
  glanceDirectionIndex: number;
  details: InteriorDetailState[];
}

function createRandom(seed: string): () => number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
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

export function createAmoebaMotion(seed: string | number): AmoebaMotionState {
  const seedKey = String(seed);
  const contourRandom = createRandom(`${seedKey}:contour`);
  const blinkRandom = createRandom(`${seedKey}:blink`);
  const gazeRandom = createRandom(`${seedKey}:gaze`);

  return {
    elapsedSeconds: 0,
    bodyFramePhase: contourRandom(),
    bodyFramePeriodSeconds: range(contourRandom, 3.5, 4.9),
    blinkRandom,
    gazeRandom,
    nextBlinkSeconds: range(blinkRandom, 2, 5),
    nextGlanceSeconds: range(gazeRandom, 2.5, 5),
    glanceStartSeconds: null,
    glanceDurationSeconds: 0,
    glanceDirectionIndex: 0,
    details: [
      { homeX: 196, homeY: 460, radius: 55, amplitudeX: 3.2, amplitudeY: 2.4 },
      { homeX: 236, homeY: 563, radius: 24, amplitudeX: 7.5, amplitudeY: 6 },
      { homeX: 300, homeY: 520, radius: 14, amplitudeX: 8.5, amplitudeY: 6.8 },
      { homeX: 645, homeY: 418.5, radius: 34, amplitudeX: 2.8, amplitudeY: 2.2 },
      { homeX: 590, homeY: 455, radius: 14, amplitudeX: 6.8, amplitudeY: 5.3 },
      { homeX: 405, homeY: 490, radius: 24, amplitudeX: 8, amplitudeY: 6.2 },
    ].map((detail, index) => {
      const random = createRandom(`${seedKey}:detail:${index}`);
      return {
        ...detail,
        phase: random() * Math.PI * 2,
        speed: range(random, 0.24, 0.38),
        phaseOffset: index * 1.7,
      };
    }),
  };
}

function advanceBlink(state: AmoebaMotionState): void {
  while (state.elapsedSeconds >= state.nextBlinkSeconds + BLINK_DURATION_SECONDS) {
    state.nextBlinkSeconds += BLINK_DURATION_SECONDS + range(state.blinkRandom, 2.5, 6.5);
  }
}

function advanceGaze(state: AmoebaMotionState): void {
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

function gazeAmount(state: AmoebaMotionState): number {
  if (state.glanceStartSeconds === null) return 0;
  const age = state.elapsedSeconds - state.glanceStartSeconds;
  const total = state.glanceDurationSeconds + GAZE_FLICK_SECONDS * 2;
  return Math.max(0, Math.min(1, age / GAZE_FLICK_SECONDS, (total - age) / GAZE_FLICK_SECONDS));
}

function blinkAmount(state: AmoebaMotionState): number {
  const age = state.elapsedSeconds - state.nextBlinkSeconds;
  if (age < 0 || age >= BLINK_DURATION_SECONDS) return 0;
  return 1 - Math.abs(1 - 2 * age / BLINK_DURATION_SECONDS);
}

export function getAmoebaDetailOffsets(state: AmoebaMotionState): AmoebaDetailOffset[] {
  const placed: Array<{ x: number; y: number; radius: number }> = [];
  return state.details.map(detail => {
    const phase = state.elapsedSeconds * detail.speed + detail.phase;
    const requested = {
      x: detail.amplitudeX * Math.sin(phase),
      y: detail.amplitudeY * Math.cos(phase * 0.83 + detail.phaseOffset),
    };
    const isClear = (scale: number): boolean => {
      const x = detail.homeX + requested.x * scale;
      const y = detail.homeY + requested.y * scale;
      return placed.every(previous =>
        Math.hypot(x - previous.x, y - previous.y) > detail.radius + previous.radius + INTERIOR_CLEARANCE);
    };
    let acceptedScale = 1;
    if (!isClear(acceptedScale)) {
      let low = 0;
      let high = 1;
      for (let iteration = 0; iteration < 16; iteration += 1) {
        const middle = (low + high) / 2;
        if (isClear(middle)) low = middle;
        else high = middle;
      }
      acceptedScale = low;
    }
    const offset = { x: requested.x * acceptedScale, y: requested.y * acceptedScale };
    placed.push({ x: detail.homeX + offset.x, y: detail.homeY + offset.y, radius: detail.radius });
    return offset;
  });
}

function createFrame(state: AmoebaMotionState): AmoebaMotionFrame {
  const contourCycle = (state.elapsedSeconds / state.bodyFramePeriodSeconds + state.bodyFramePhase) % 1;
  const bodyFrameIndex = Math.floor(contourCycle * CONTOUR_FRAME_COUNT);
  const closure = blinkAmount(state);
  const amount = gazeAmount(state);
  const direction = state.glanceDirectionIndex * Math.PI / 4;
  const gazeX = state.glanceStartSeconds === null ? 0 : 39 * Math.cos(direction) * amount;
  const gazeY = state.glanceStartSeconds === null ? 0 : 39 * Math.sin(direction) * amount;
  const faceFrameIndex = state.glanceStartSeconds === null
    ? 0
    : 1 + state.glanceDirectionIndex * FACE_FRAME_STEPS + Math.max(0, Math.min(FACE_FRAME_STEPS - 1, Math.ceil(amount * FACE_FRAME_STEPS) - 1));

  return {
    elapsedSeconds: state.elapsedSeconds,
    bodyFrameIndex,
    faceFrameIndex,
    blinkClosure: closure,
    gazeDirectionIndex: state.glanceStartSeconds === null ? null : state.glanceDirectionIndex,
    gazeX,
    gazeY,
    eyebrowRotationDegrees: -gazeX / 39 * 10,
  };
}

export function updateAmoebaMotion(
  state: AmoebaMotionState,
  deltaSeconds: number,
  reducedMotion = false,
): AmoebaMotionFrame {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
    throw new RangeError('deltaSeconds must be a finite non-negative number');
  }
  if (reducedMotion) return createFrame(state);

  state.elapsedSeconds += deltaSeconds;
  advanceBlink(state);
  advanceGaze(state);
  return createFrame(state);
}
