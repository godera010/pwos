import { test, expect } from '@playwright/test';

test.describe('Dashboard Smoke Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('loads dashboard within 3 seconds', async ({ page }) => {
        const start = Date.now();
        await expect(page.getByText('Dashboard')).toBeVisible();
        const duration = Date.now() - start;
        console.log(`Dashboard loaded in ${duration}ms`);
        expect(duration).toBeLessThan(3000); // Req 69
    });

    test('displays key charts and metrics', async ({ page }) => {
        await expect(page.getByText('Soil Moisture')).toBeVisible(); // Chart title
        await expect(page.getByText('Ambient Conditions')).toBeVisible();
        await expect(page.getByText('System Health')).toBeVisible();
    });

    test('shows system online status', async ({ page }) => {
        await expect(page.getByText('System Online')).toBeVisible();
    });
});
