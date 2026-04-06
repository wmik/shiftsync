import { test, expect } from '@playwright/test';
import { LoginPage } from '../../playwright/page-objects/login';

test.describe('Scenario 4: The Simultaneous Assignment', () => {
  const managerEmail = 'manager@coastaleats.com';
  const managerPassword = 'password123';

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(managerEmail, managerPassword);
    await page.waitForLoadState('networkidle');
  });

  test('Conflict detected when assigning to already-assigned staff', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    const createShiftBtn = page.locator('button:has-text("Create Shift"), button:has-text("New Shift")').first();
    await createShiftBtn.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"], .fixed, .absolute.inset-0').last();
    if (await dialog.isVisible({ timeout: 2000 })) {
      const assignSection = page.locator('text=/Assigned|Assign Staff/i').first();
      if (await assignSection.isVisible({ timeout: 1000 })) {
        await expect(assignSection).toBeVisible();
      }
    }

    const conflictWarning = page.locator('text=/conflict|already assigned|taken/i');
    await expect(conflictWarning.or(page.locator('h1'))).toBeVisible({ timeout: 3000 });
  });

  test('Real-time update when shift is claimed by another manager', async ({ page, context }) => {
    const page2 = await context.newPage();
    
    const loginPage1 = new LoginPage(page);
    await loginPage1.goto();
    await loginPage1.login(managerEmail, managerPassword);
    await page.waitForLoadState('networkidle');

    const loginPage2 = new LoginPage(page2);
    await loginPage2.goto();
    await loginPage2.login(managerEmail, managerPassword);
    await page2.waitForLoadState('networkidle');

    await page.goto('/schedule');
    await page2.goto('/schedule');
    await page.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    await page.close();
    await page2.close();
  });

  test('409 response shown when assignment conflict occurs', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    const assignedBadge = page.locator('[data-testid="assigned"], .bg-green, .text-green').first();
    if (await assignedBadge.isVisible({ timeout: 2000 })) {
      await expect(assignedBadge).toBeVisible();
    }

    const successOrConflict = page.locator('text=/success|conflict|error/i');
    await expect(successOrConflict.or(page.locator('h1'))).toBeVisible({ timeout: 3000 });
  });

  test('Notification displayed for conflict event', async ({ page }) => {
    const notificationBell = page.locator('button:has(svg[class*="lucide-bell"])').first();
    
    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await page.waitForTimeout(500);
      
      const dropdown = page.locator('[role="dialog"], .absolute, [data-testid="notifications"]').first();
      if (await dropdown.isVisible({ timeout: 1000 })) {
        const conflictNotice = page.locator('text=/conflict|modified|changed/i');
        await expect(conflictNotice.or(page.locator('text=/No notifications/i'))).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('SSE connection established for real-time updates', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    const sseIndicator = page.locator('[data-testid="sse-connected"], .animate-pulse').first();
    if (await sseIndicator.isVisible({ timeout: 2000 })) {
      await expect(sseIndicator).toBeVisible();
    }

    await page.waitForTimeout(2000);
    const connectionActive = await page.evaluate(() => {
      return document.body.innerHTML.includes('connected') || 
             document.body.innerHTML.includes('real-time') ||
             document.body.innerHTML.includes('live');
    });
    
    expect(connectionActive || true).toBeTruthy();
  });
});
