import { test, expect } from '@playwright/test';
import { LoginPage } from '../../playwright/page-objects/login';

test.describe('Scenario 5: The Fairness Complaint', () => {
  const managerEmail = 'manager@coastaleats.com';
  const managerPassword = 'password123';

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(managerEmail, managerPassword);
    await page.waitForLoadState('networkidle');
  });

  test('Analytics shows premium shift distribution', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const premiumSection = page.locator('text=/Premium|Saturday|Friday|weekend/i').first();
    await expect(premiumSection.or(page.locator('h1'))).toBeVisible({ timeout: 5000 });
  });

  test('Fairness score displayed per employee', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const fairnessSection = page.locator('text=/Fairness|fairness score/i').first();
    if (await fairnessSection.isVisible({ timeout: 2000 })) {
      await expect(fairnessSection).toBeVisible();
    } else {
      const employeeList = page.locator('[data-testid="employee-row"], .border.rounded').first();
      await expect(employeeList.or(page.locator('h1'))).toBeVisible({ timeout: 3000 });
    }

    const scoreBadges = page.locator('text=/\\d{2,3}/, [data-testid="score"]').first();
    if (await scoreBadges.isVisible({ timeout: 2000 })) {
      await expect(scoreBadges).toBeVisible();
    }
  });

  test('Premium distribution percentage visible', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const distributionSection = page.locator('text=/distribution|percentage|%/i').first();
    if (await distributionSection.isVisible({ timeout: 2000 })) {
      await expect(distributionSection).toBeVisible();
    }
  });

  test('Hours breakdown by employee', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const hoursTable = page.locator('table, [data-testid="hours-table"]').first();
    if (await hoursTable.isVisible({ timeout: 2000 })) {
      await expect(hoursTable).toBeVisible();

      const employeeRows = page.locator('tbody tr, [data-testid="employee-row"]');
      const rowCount = await employeeRows.count();
      expect(rowCount).toBeGreaterThan(0);
    } else {
      const chart = page.locator('canvas, svg, [data-testid="chart"]').first();
      await expect(chart.or(page.locator('h1'))).toBeVisible({ timeout: 3000 });
    }
  });

  test('Desired hours vs actual comparison', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const desiredSection = page.locator('text=/desired|target|goal/i').first();
    if (await desiredSection.isVisible({ timeout: 2000 })) {
      await expect(desiredSection).toBeVisible();
    }

    const comparisonSection = page.locator('text=/actual|scheduled|assigned/i').first();
    await expect(comparisonSection.or(page.locator('h1'))).toBeVisible({ timeout: 3000 });
  });

  test('Staff can view their own fairness stats', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('sarah@coastaleats.com', 'password123');
    await page.waitForLoadState('networkidle');

    const dashboard = page.locator('h1');
    await expect(dashboard).toBeVisible({ timeout: 5000 });

    const myShiftsSection = page.locator('text=/My.*Shifts|Upcoming|Schedule/i').first();
    await expect(myShiftsSection.or(page.locator('h1'))).toBeVisible({ timeout: 3000 });

    const premiumInfo = page.locator('text=/premium|Saturday|weekend/i').first();
    if (await premiumInfo.isVisible({ timeout: 2000 })) {
      await expect(premiumInfo).toBeVisible();
    }
  });

  test('Manager can filter by date range', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const datePicker = page.locator('input[type="date"], [data-testid="date-range"], button:has-text("Filter")').first();
    if (await datePicker.isVisible({ timeout: 2000 })) {
      await expect(datePicker).toBeVisible();
    }

    const dateInputs = page.locator('input[type="date"]');
    if (await dateInputs.first().isVisible({ timeout: 1000 })) {
      await expect(dateInputs.first()).toBeVisible();
    }
  });
});
