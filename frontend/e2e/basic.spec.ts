import { test, expect } from '@playwright/test';

test.describe('Time Selection Flow', () => {
    test('should display time options on home page', async ({ page }) => {
        await page.goto('/');

        const timeOptions = page.getByRole('button', { name: /min/i });
        await expect(timeOptions).toHaveCount(3); // 15, 30, 60 min

        await expect(page.getByText('15 min')).toBeVisible();
        await expect(page.getByText('30 min')).toBeVisible();
        await expect(page.getByText('60 min')).toBeVisible();
    });

    test('should show menu options after selecting time', async ({ page }) => {
        await page.goto('/');

        // Select 30 min
        await page.getByText('30 min').click();

        // Check if body part selection appears
        await expect(page.getByText('Push')).toBeVisible();
        await expect(page.getByText('Pull')).toBeVisible();
        await expect(page.getByText('Legs')).toBeVisible();
    });
});
