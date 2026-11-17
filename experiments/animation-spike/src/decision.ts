export type EvidenceState = 'pass' | 'fail' | 'pending';
export type ComplexityState = 'accepted' | 'rejected' | 'pending';
export type GodotState = 'not-started' | 'pending' | 'incomplete' | 'complete';
export type DecisionStatus = 'webgl-supported' | 'pending' | 'godot-required' | 'godot-complete';

export interface DecisionInput {
  behavior: EvidenceState;
  performance: EvidenceState;
  complexity: ComplexityState;
  godot: GodotState;
  ownerRequestedGodot: boolean;
}

export interface DecisionResult {
  status: DecisionStatus;
  godotRequired: boolean;
}

export function evaluateDecision(input: DecisionInput): DecisionResult {
  const godotRequired = input.behavior === 'fail'
    || input.performance === 'fail'
    || input.complexity === 'rejected'
    || input.ownerRequestedGodot;

  if (godotRequired) {
    return {
      status: input.godot === 'complete' ? 'godot-complete' : 'godot-required',
      godotRequired: true,
    };
  }

  if (input.behavior !== 'pass' || input.performance !== 'pass' || input.complexity !== 'accepted') {
    return { status: 'pending', godotRequired: false };
  }

  return { status: 'webgl-supported', godotRequired: false };
}