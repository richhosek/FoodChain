# Validation: Gameplay Helpers

## Baseline Before Implementation

Captured on 2026-11-14 before feature-005 changes.

- `npm run typecheck`: passed.
- `npm run build`: passed; Vite reported the existing large-chunk warning.
- `npm run test:unit`: 34 passed, 4 failed (38 total). The four existing failures are target-10 assumptions in `tests/unit/domain.test.ts`; the configured game target remains 100. See [feature-003 validation](../003-predator-evolution/validation.md).
- `npm run test:e2e -- --workers=4`: 83 passed, 5 skipped, 12 failed. The failures include the established target-100 versus target-10 assertions in desktop/mobile tests and the existing reset-during-refill timing-sensitive cases. They are baseline results and must not be “fixed” by changing the target.

## Final Validation

## Final Validation

- `npm run typecheck`: passed.
- `npm run build`: passed; the existing Vite large-chunk warning remains.
- `npm run test:unit`: 54 passed, 4 failed (58 test declarations). The four failures are exactly the baseline target-10 assumptions listed above. All 13 new gameplay-helper unit tests pass.
- `npm run test:e2e -- --workers=4`: 97 passed, 5 skipped, 12 failed. The failures are the same six goal-10 tests in both desktop and mobile projects as the baseline; no new browser failure names remain.
- Focused gameplay-helper browser suite `npx playwright test tests/e2e/gameplay-helpers.spec.ts --workers=4`: 14 passed across desktop and mobile. Coverage includes failure dialog trigger/dismiss/reset, 10-second move hint and repeat cadence, pending and active-hint cancellation, and the Free Moves flash.
- Physical iOS/Android validation: unavailable in this environment; not claimed as passed.
