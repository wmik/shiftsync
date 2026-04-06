import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('Setting up test environment...');

  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/shiftsync_test';
  process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'test-secret';
  process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000';

  try {
    console.log('Running database migrations...');
    execSync('npx prisma migrate deploy', {
      env: { ...process.env },
      cwd: path.resolve(process.cwd()),
      stdio: 'pipe',
    });

    console.log('Running seed...');
    execSync('npx tsx prisma/seed.ts', {
      env: { ...process.env },
      cwd: path.resolve(process.cwd()),
      stdio: 'pipe',
    });
  } catch (error) {
    console.log('Setup may have issues, continuing...', error);
  }

  console.log('Launching browser for authentication...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('Pre-warming session...');
    await page.evaluate(() => {
      document.cookie = 'test=true;path=/';
    });
  } catch (error) {
    console.log('Browser warmup skipped:', error);
  } finally {
    await browser.close();
  }

  console.log('Global setup complete');
}

export default globalSetup;
