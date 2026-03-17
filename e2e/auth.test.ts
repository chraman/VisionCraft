import { test, expect } from '@playwright/test';

const ALICE_EMAIL = 'alice@example.com';
const ALICE_PASSWORD = 'password123';

test.describe('Auth flows', () => {
  test('Register new user → redirected to /generate', async ({ page }) => {
    const timestamp = Date.now();
    const email = `testuser_${timestamp}@example.com`;

    await page.goto('/register');
    await page.fill('#name', `Test User ${timestamp}`);
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', 'Password123x');
    await page.fill('#confirm-password', 'Password123x');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/generate');
    expect(page.url()).toContain('/generate');
    await expect(page.getByText('Sign out')).toBeVisible();
  });

  test('Login with seeded user → redirected to /generate', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', ALICE_EMAIL);
    await page.fill('#password', ALICE_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/generate');
    expect(page.url()).toContain('/generate');
    await expect(page.getByText('Sign out')).toBeVisible();
  });

  test('Page refresh keeps session active', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', ALICE_EMAIL);
    await page.fill('#password', ALICE_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/generate');

    await page.reload();
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/generate');
    await expect(page.getByText('Sign out')).toBeVisible();
  });

  test('Unauthenticated access to /generate → redirect to /login', async ({ page }) => {
    await page.goto('/generate');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('Logout clears session and blocks /generate', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', ALICE_EMAIL);
    await page.fill('#password', ALICE_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/generate');

    await page.getByText('Sign out').click();
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');

    await page.goto('/generate');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });
});
