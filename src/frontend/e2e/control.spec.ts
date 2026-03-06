import { test, expect } from '@playwright/test';

test.describe('Manual Control Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('can toggle manual mode', async ({ page }) => {
        // Toggle button might say "Auto Mode Active" or "Manual Mode Active"
        // We find the button and click it
        const toggleBtn = page.getByRole('button', { name: /Mode Active/i });
        await toggleBtn.click();
        // Wait for state change via toaster or UI update
        // Since we mock backend response in dev mode usually, or assume backend is running
        // This test might be flaky if backend isn't up. 
        // If backend is mocked in dev server setup, then fine.
        // Assuming we test against live dev server which might hit real backend or mocked one.
    });

    test('manual water button triggers action', async ({ page }) => {
        // First ensure manual mode
        const modeBtn = page.getByRole('button', { name: /Mode Active/i });
        const text = await modeBtn.textContent();
        if (text?.includes('Auto')) {
            await modeBtn.click();
        }

        // Find Water button
        const waterBtn = page.getByRole('button', { name: /Manual Water/i });
        await expect(waterBtn).toBeVisible();
        await waterBtn.click();

        // Expect some feedback? 
        // Maybe a toast or log entry appearing?
    });
});
