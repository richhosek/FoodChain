import { expect, test } from '@playwright/test';

test('labels browser runs as emulated unless physical-device metadata is explicitly provided', async ({ page }) => {
  await page.goto('/experiments/animation-spike/index.html');
  const result = await page.evaluate(async () => {
    const trialModulePath = '/experiments/animation-spike/src/trial.ts';
    const { readTrialEnvironment } = await import(trialModulePath);
    const browserEnvironment = readTrialEnvironment();
    const declaredDevice = readTrialEnvironment({
      deviceKind: 'physical-iphone',
      deviceModel: 'Owner-provided device model',
      operatingSystem: 'Owner-provided iOS version',
      browser: 'Owner-provided browser',
    });
    return { browserEnvironment, declaredDevice };
  });

  expect(result.browserEnvironment.deviceKind).toBe('emulated');
  expect(result.browserEnvironment.deviceModel).toBeNull();
  expect(result.declaredDevice.deviceKind).toBe('physical-iphone');
  expect(result.declaredDevice.deviceModel).toBe('Owner-provided device model');
});
