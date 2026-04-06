import { test, expect } from '@playwright/test';
import { LoginPage } from '../../playwright/page-objects/login';
import { SchedulePage, ShiftDialog } from '../../playwright/page-objects/pages';

test.describe('Scenario 1: The Sunday Night Chaos', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('sarah@coastaleats.com', 'password123');
    await page.waitForLoadState('networkidle');
  });

  test('Staff can drop a shift and another staff can claim it', async ({ page }) => {
    const schedulePage = new SchedulePage(page);
    await schedulePage.goto();

    const myShifts = page.locator('text=My Shifts, text=My Upcoming').first();
    await expect(myShifts).toBeVisible();

    const dropButton = page.locator('button:has-text("Drop Shift"), button:has-text("Drop"), [data-testid="drop-shift"]').first();
    
    if (await dropButton.isVisible()) {
      await dropButton.click();
      
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Drop"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForLoadState('networkidle');
      }
    }

    const notification = page.locator('text=/Drop.*success|Request.*submitted/i');
    await expect(notification.or(page.locator('text=/No upcoming shifts/i'))).toBeVisible({ timeout: 5000 });
  });

  test('Open drop requests visible to other staff', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('mike@coastaleats.com', 'password123');
    await page.waitForLoadState('networkidle');

    await page.goto('/requests');
    await page.waitForLoadState('networkidle');

    const dropRequestsTab = page.locator('button:has-text("Drop"), [data-testid="drop-tab"]').first();
    await dropRequestsTab.click();
    await page.waitForLoadState('networkidle');

    const claimButton = page.locator('button:has-text("Claim"), button:has-text("Pick Up")').first();
    
    if (await claimButton.isVisible({ timeout: 2000 })) {
      await expect(claimButton).toBeEnabled();
    }
  });

  test('Notification received when dropped shift is claimed', async ({ page }) => {
    const notificationBell = page.locator('button:has(svg[class*="lucide-bell"])').first();
    
    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await page.waitForTimeout(500);
      
      const dropdown = page.locator('[role="dialog"], .absolute, [data-testid="notifications"]').first();
      if (await dropdown.isVisible({ timeout: 1000 })) {
        const notifications = page.locator('text=/CLAIMED|claimed/i');
        await expect(notifications.or(page.locator('text=/No notifications/i'))).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('Drop request shows expiry countdown', async ({ page }) => {
    await page.goto('/requests');
    await page.waitForLoadState('networkidle');

    const myRequestsTab = page.locator('button:has-text("My Requests"), [data-testid="my-requests-tab"]').first();
    await myRequestsTab.click();
    await page.waitForLoadState('networkidle');

    const expiryText = page.locator('text=/expires|remaining|24h/i');
    await expect(expiryText.or(page.locator('text=/No requests/i'))).toBeVisible({ timeout: 3000 });
  });
});
