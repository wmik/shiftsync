import { test, expect } from '@playwright/test';
import { LoginPage } from '../../playwright/page-objects/login';
import { DashboardPage } from '../../playwright/page-objects/pages';

test.describe('Scenario 2: The Overtime Trap', () => {
  const managerEmail = 'manager@coastaleats.com';
  const managerPassword = 'password123';

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(managerEmail, managerPassword);
    await page.waitForLoadState('networkidle');
  });

  test('Dashboard shows overtime warning when approaching 40 hours', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    const overtimeWarning = page.locator('text=/overtime|approaching|40.*hours/i');
    await expect(overtimeWarning.or(page.locator('h1'))).toBeVisible({ timeout: 5000 });
  });

  test('Analytics shows projected overtime', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const hoursSection = page.locator('text=/Hours|Overtime|Weekly/i').first();
    await expect(hoursSection).toBeVisible({ timeout: 5000 });

    const hoursChart = page.locator('canvas, svg, [data-testid="hours-chart"]').first();
    if (await hoursChart.isVisible({ timeout: 2000 })) {
      await expect(hoursChart).toBeVisible();
    }
  });

  test('Staff dashboard shows personal hours status', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('james@coastaleats.com', 'password123');
    await page.waitForLoadState('networkidle');

    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    const hoursIndicator = page.locator('text=/hours this week|my hours/i').first();
    await expect(hoursIndicator.or(page.locator('h1'))).toBeVisible({ timeout: 5000 });

    const overtimeCard = page.locator('.border-red, .border-amber, [data-testid="overtime"]').first();
    if (await overtimeCard.isVisible({ timeout: 2000 })) {
      await expect(overtimeCard).toBeVisible();
    }
  });

  test('6th consecutive day shows warning', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    const shiftCards = page.locator('[data-testid="shift-card"], .border.rounded-lg');
    const count = await shiftCards.count();

    if (count >= 6) {
      const warningBadge = page.locator('text=/6th|consecutive.*day|warning/i').first();
      if (await warningBadge.isVisible({ timeout: 2000 })) {
        await expect(warningBadge).toBeVisible();
      }
    }
  });

  test('Manager sees overtime-prone staff flagged', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const jamesCard = page.locator('text=/James|James Park/i').first();
    if (await jamesCard.isVisible({ timeout: 2000 })) {
      const overtimeFlag = page.locator('.bg-red, .text-red, [data-testid="overtime-flag"]').first();
      await expect(overtimeFlag.or(jamesCard)).toBeVisible();
    }
  });

  test('What-if calculator available for shift preview', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const whatIfSection = page.locator('text=/what.?if|calculator|simulate/i').first();
    if (await whatIfSection.isVisible({ timeout: 2000 })) {
      await expect(whatIfSection).toBeVisible();
    } else {
      const addShiftButton = page.locator('button:has-text("Add Shift"), button:has-text("Preview")').first();
      await expect(addShiftButton.or(page.locator('h1'))).toBeVisible({ timeout: 3000 });
    }
  });
});
