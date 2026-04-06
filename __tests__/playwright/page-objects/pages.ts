import { Page, Locator, expect } from '@playwright/test';

export class SchedulePage {
  readonly page: Page;
  readonly createShiftButton: Locator;
  readonly publishWeekButton: Locator;
  readonly shiftCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createShiftButton = page.locator('button:has-text("Create Shift")');
    this.publishWeekButton = page.locator('button:has-text("Publish Week")');
    this.shiftCards = page.locator('[data-testid="shift-card"], .border.rounded-lg');
  }

  async goto() {
    await this.page.goto('/schedule');
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreateShift() {
    await this.createShiftButton.click();
  }

  async clickPublishWeek() {
    await this.publishWeekButton.click();
  }

  async getShiftByDate(date: string): Promise<Locator> {
    return this.page.locator(`text=${date}`);
  }
}

export class ShiftDialog {
  readonly page: Page;
  readonly locationSelect: Locator;
  readonly skillSelect: Locator;
  readonly dateInput: Locator;
  readonly startTimeInput: Locator;
  readonly endTimeInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.locationSelect = page.locator('select, [role="combobox"]').first();
    this.skillSelect = page.locator('select').nth(1);
    this.dateInput = page.locator('input[type="date"]');
    this.startTimeInput = page.locator('input[type="time"]').first();
    this.endTimeInput = page.locator('input[type="time"]').nth(1);
    this.saveButton = page.locator('button:has-text("Save"), button:has-text("Create")');
    this.cancelButton = page.locator('button:has-text("Cancel")');
  }

  async fill(data: {
    location?: string;
    skill?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
  }) {
    if (data.location) {
      await this.locationSelect.selectOption({ label: data.location });
    }
    if (data.skill) {
      await this.skillSelect.selectOption({ label: data.skill });
    }
    if (data.date) {
      await this.dateInput.fill(data.date);
    }
    if (data.startTime) {
      await this.startTimeInput.fill(data.startTime);
    }
    if (data.endTime) {
      await this.endTimeInput.fill(data.endTime);
    }
  }

  async save() {
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}

export class RequestsPage {
  readonly page: Page;
  readonly swapRequestsTab: Locator;
  readonly dropRequestsTab: Locator;
  readonly myRequestsTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.swapRequestsTab = page.locator('button:has-text("Swap Requests"), [data-testid="swap-tab"]').first();
    this.dropRequestsTab = page.locator('button:has-text("Drop Requests"), [data-testid="drop-tab"]').first();
    this.myRequestsTab = page.locator('button:has-text("My Requests"), [data-testid="my-requests-tab"]').first();
  }

  async goto() {
    await this.page.goto('/requests');
    await this.page.waitForLoadState('networkidle');
  }

  async switchToSwapRequests() {
    await this.swapRequestsTab.click();
  }

  async switchToDropRequests() {
    await this.dropRequestsTab.click();
  }
}

export class DashboardPage {
  readonly page: Page;
  readonly welcomeMessage: Locator;
  readonly upcomingShifts: Locator;
  readonly onDutyNow: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeMessage = page.locator('h1');
    this.upcomingShifts = page.locator('text=My Upcoming Shifts');
    this.onDutyNow = page.locator("text=Who's Working Now");
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async expectWelcome() {
    const text = await this.welcomeMessage.textContent();
    if (!text?.includes('Welcome')) {
      throw new Error(`Expected welcome message, got "${text}"`);
    }
  }
}

export class NotificationBell {
  readonly page: Page;
  readonly bellButton: Locator;
  readonly dropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bellButton = page.locator('button:has(svg[class*="lucide-bell"])');
    this.dropdown = page.locator('[role="dialog"], .absolute');
  }

  async open() {
    await this.bellButton.click();
    await this.dropdown.waitFor();
  }

  async getNotificationCount(): Promise<number> {
    const badge = this.page.locator('span[class*="bg-red-500"]');
    if (await badge.isVisible()) {
      const text = await badge.textContent();
      return parseInt(text || '0', 10);
    }
    return 0;
  }
}
