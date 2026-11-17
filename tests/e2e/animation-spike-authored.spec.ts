import { expect, test } from '@playwright/test';

test('authored candidate reports its approval and licensing blocker without loading a renderer', async ({ page }) => {
  await page.goto('/experiments/animation-spike/index.html?candidate=authored&workload=mixed&seed=17');
  await expect(page.getByRole('status')).toHaveText(
    'authored blocked: Owner/artist approval, authoring-tool access, license/privacy review, and artwork permission are not confirmed',
  );
  await expect(page.locator('#candidate-root canvas')).toHaveCount(0);
});
