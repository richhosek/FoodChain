import type { CandidateCapabilities, CandidateDefinition } from '../contracts.ts';

const capabilities: CandidateCapabilities = {
  silhouette: 'unverified',
  'rank-sizing': 'unverified',
  'independent-blink': 'unverified',
  'independent-gaze': 'unverified',
  'body-motion': 'unverified',
  selection: 'unverified',
  'drag-cancel': 'unverified',
  'reaction-flash': 'unverified',
  'movement-refill': 'unverified',
  reset: 'unverified',
  'reduced-motion': 'unverified',
  'mouse-input': 'unverified',
  'touch-input': 'unverified',
};

export function createBlockedAuthoredCandidate(): CandidateDefinition {
  return {
    id: 'authored',
    version: 'blocked-no-approved-tool',
    expectedRenderer: 'canvas',
    capabilities,
    blockedReason: 'Owner/artist approval, authoring-tool access, license/privacy review, and artwork permission are not confirmed',
    create: () => { throw new Error('Blocked authored candidate must not initialize'); },
  };
}