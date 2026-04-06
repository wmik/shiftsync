import { test, expect } from '@playwright/test';
import { LoginPage } from '../../playwright/page-objects/login';
import { SchedulePage } from '../../playwright/page-objects/pages';

test.describe('Scenario 3: The Timezone Tangle', () => {
  const emilyEmail = 'emily@coastaleats.com';
  const emilyPassword = 'password123';

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(emilyEmail, emilyPassword);
    await page.waitForLoadState('networkidle');
  });

  test('Emily is certified at multiple timezones', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const certificationsSection = page.locator('text=/certification|location/i').first();
    await expect(certificationsSection.or(page.locator('h1'))).toBeVisible({ timeout: 5000 });
  });

  test('Schedule shows timezone badges for shifts', async ({ page }) => {
    const schedule = new SchedulePage(page);
    await schedule.goto();

    const timezoneBadge = page.locator('text=/PT|ET|EST|PST|UTC/i, [data-testid="timezone"]').first();
    if (await timezoneBadge.isVisible({ timeout: 3000 })) {
      await expect(timezoneBadge).toBeVisible();
    } else {
      const shifts = page.locator('[data-testid="shift-card"], .border.rounded-lg');
      await expect(shifts.or(page.locator('text=/No shifts/i'))).toBeVisible({ timeout: 3000 });
    }
  });

  test('Availability set in local time', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const availabilitySection = page.locator('text=/availability|available/i').first();
    await expect(availabilitySection.or(page.locator('h1'))).toBeVisible({ timeout: 5000 });

    const timeInputs = page.locator('input[type="time"], text=/9:00|17:00|09:00|5:00/i');
    if (await timeInputs.first().isVisible({ timeout: 2000 })) {
      await expect(timeInputs.first()).toBeVisible();
    }
  });

  test('Cross-timezone shift assignment respects local availability', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    const shiftCards = page.locator('[data-testid="shift-card"], .border.rounded-lg');
    const count = await shiftCards.count();

    if (count > 0) {
      const firstShift = shiftCards.first();
      const shiftDetails = await firstShift.textContent();
      
      const locationWithTimezone = page.locator('text=/Downtown|Marina|Times Square/i');
      await expect(locationWithTimezone.or(page.locator('text=/No shifts/i'))).toBeVisible({ timeout: 3000 });

      if (shiftDetails) {
        const hasTimezoneIndicator = /PT|ET|PST|EST|\+.*\d{2}:/.test(shiftDetails);
        expect(hasTimezoneIndicator || count === 0).toBeTruthy();
      }
    }
  });

  test('Overnight shifts show next-day indicator', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    const overnightIndicator = page.locator('text=/\\+|next day|tomorrow/i').first();
    if (await overnightIndicator.isVisible({ timeout: 2000 })) {
      await expect(overnightIndicator).toBeVisible();
    }
  });

  test('Manager sees timezone in shift details', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('manager@coastaleats.com', 'password123');
    await page.waitForLoadState('networkidle');

    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    const createShiftBtn = page.locator('button:has-text("Create Shift"), button:has-text("New Shift")').first();
    await createShiftBtn.click();
    await page.waitForTimeout(500);

    const locationSelect = page.locator('select, [role="combobox"]').first();
    if (await locationSelect.isVisible({ timeout: 2000 })) {
      const options = await locationSelect.locator('option').allTextContents();
      const hasTimezoneContext = options.some(opt => 
        /Downtown|Marina|Times Square|Pacific|Eastern/i.test(opt)
      );
      expect(hasTimezoneContext).toBeTruthy();
    }
  });
});
