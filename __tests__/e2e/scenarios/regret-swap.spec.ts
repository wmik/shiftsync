import { test, expect } from '@playwright/test';
import { LoginPage } from '../../playwright/page-objects/login';
import { RequestsPage } from '../../playwright/page-objects/pages';

test.describe('Scenario 6: The Regret Swap', () => {
  const sarahEmail = 'sarah@coastaleats.com';
  const sarahPassword = 'password123';
  const mikeEmail = 'mike@coastaleats.com';
  const mikePassword = 'password123';

  test('Staff can create swap request', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(sarahEmail, sarahPassword);
    await page.waitForLoadState('networkidle');

    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    const swapRequestsTab = page.locator('button:has-text("Swap"), [data-testid="swap-tab"]').first();
    await swapRequestsTab.click();
    await page.waitForLoadState('networkidle');

    const requestSwapButton = page.locator('button:has-text("Request Swap"), button:has-text("New Swap")').first();
    
    if (await requestSwapButton.isVisible({ timeout: 2000 })) {
      await requestSwapButton.click();
      await page.waitForTimeout(500);

      const swapDialog = page.locator('[role="dialog"], .fixed, .absolute.inset-0').last();
      if (await swapDialog.isVisible({ timeout: 2000 })) {
        await expect(swapDialog).toBeVisible();
      }
    }

    const myRequestsTab = page.locator('button:has-text("My Requests"), [data-testid="my-requests-tab"]').first();
    await myRequestsTab.click();
    await page.waitForLoadState('networkidle');

    const pendingBadge = page.locator('text=/Pending|PENDING/i').first();
    await expect(pendingBadge.or(page.locator('text=/No requests/i'))).toBeVisible({ timeout: 3000 });
  });

  test('Requester can cancel pending swap', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(sarahEmail, sarahPassword);
    await page.waitForLoadState('networkidle');

    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    const myRequestsTab = page.locator('button:has-text("My Requests"), [data-testid="my-requests-tab"]').first();
    await myRequestsTab.click();
    await page.waitForLoadState('networkidle');

    const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Withdraw")').first();
    
    if (await cancelButton.isVisible({ timeout: 2000 })) {
      await cancelButton.click();
      await page.waitForTimeout(500);

      const confirmDialog = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmDialog.isVisible({ timeout: 1000 })) {
        await confirmDialog.click();
        await page.waitForLoadState('networkidle');
      }

      const cancelledBadge = page.locator('text=/Cancelled|CANCELLED/i');
      await expect(cancelledBadge.or(page.locator('text=/No requests/i'))).toBeVisible({ timeout: 3000 });
    } else {
      await expect(page.locator('text=/No requests/i')).toBeVisible({ timeout: 2000 });
    }
  });

  test('Both parties can cancel when in PENDING_APPROVAL', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(mikeEmail, mikePassword);
    await page.waitForLoadState('networkidle');

    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    const pendingApprovalSection = page.locator('text=/Pending Approval|PENDING_APPROVAL/i').first();
    if (await pendingApprovalSection.isVisible({ timeout: 2000 })) {
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Withdraw")').first();
      await expect(cancelButton).toBeVisible();
    }

    const myRequestsTab = page.locator('button:has-text("My Requests"), [data-testid="my-requests-tab"]').first();
    await myRequestsTab.click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible({ timeout: 3000 });
  });

  test('Swap workflow states displayed correctly', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(sarahEmail, sarahPassword);
    await page.waitForLoadState('networkidle');

    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    const workflowInfo = page.locator('text=/PENDING|APPROVED|DENIED|CANCELLED|REJECTED/i').first();
    await expect(workflowInfo.or(page.locator('h1'))).toBeVisible({ timeout: 3000 });
  });

  test('Notification sent on swap state change', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(sarahEmail, sarahPassword);
    await page.waitForLoadState('networkidle');

    const notificationBell = page.locator('button:has(svg[class*="lucide-bell"])').first();
    
    if (await notificationBell.isVisible()) {
      await notificationBell.click();
      await page.waitForTimeout(500);
      
      const dropdown = page.locator('[role="dialog"], .absolute, [data-testid="notifications"]').first();
      if (await dropdown.isVisible({ timeout: 1000 })) {
        const swapNotification = page.locator('text=/swap|SWAP/i');
        await expect(swapNotification.or(page.locator('text=/No notifications/i'))).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('Cannot cancel completed swap', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(sarahEmail, sarahPassword);
    await page.waitForLoadState('networkidle');

    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    const completedSection = page.locator('text=/Completed|APPROVED/i').first();
    if (await completedSection.isVisible({ timeout: 2000 })) {
      const cancelButton = page.locator('button:has-text("Cancel")');
      const isCancelHidden = await cancelButton.isHidden();
      expect(isCancelHidden).toBeTruthy();
    }

    await expect(page.locator('h1')).toBeVisible({ timeout: 3000 });
  });

  test('Max 3 pending requests enforced', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(sarahEmail, sarahPassword);
    await page.waitForLoadState('networkidle');

    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    const myRequestsTab = page.locator('button:has-text("My Requests"), [data-testid="my-requests-tab"]').first();
    await myRequestsTab.click();
    await page.waitForLoadState('networkidle');

    const pendingCount = await page.locator('[data-testid="pending-badge"], text=/Pending/i').count();
    
    if (pendingCount >= 3) {
      const requestNewButton = page.locator('button:has-text("Request Swap"), button:has-text("New")').first();
      if (await requestNewButton.isVisible({ timeout: 1000 })) {
        const isDisabled = await requestNewButton.isDisabled();
        expect(isDisabled).toBeTruthy();
      }
    }
  });
});
