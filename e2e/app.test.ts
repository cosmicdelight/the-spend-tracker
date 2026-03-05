import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('The Spend Tracker', () => {
  test('should log in via Try Demo and show dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Check if we're on the auth page
    await expect(page).toHaveURL(/.*auth/);
    
    // Click Try Demo
    const demoButton = page.getByRole('button', { name: /Try Demo/i });
    await expect(demoButton).toBeVisible();
    await demoButton.click();
    
    // Should be redirected to dashboard
    await expect(page).toHaveURL('/', { timeout: 15000 });
    await expect(page.getByText(/Total Charged/i)).toBeVisible();
  });

  test('CSV Import bug: missing original_amount and quoted comma parsing', async ({ page }) => {
    // 1. Login first
    await page.goto('/auth');
    await page.getByRole('button', { name: /Try Demo/i }).click();
    await expect(page).toHaveURL('/', { timeout: 15000 });

    // 2. Open Import CSV dialog
    await page.getByRole('button', { name: /Import CSV/i }).click();
    await expect(page.getByText(/Import from CSV/i)).toBeVisible();

    // 3. Create a CSV file with a quoted comma in description
    const csvContent = 'date,amount,personal_amount,category,sub_category,payment_mode,description,notes\n' +
                       '2026-03-01,100.00,100.00,Dining,,credit_card,"Dinner, with friends",test notes';
    const csvPath = path.join(__dirname, 'test_import.csv');
    fs.writeFileSync(csvPath, csvContent);

    // 4. Upload the file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(csvPath);

    // 5. Check if it parsed correctly (bug 2 check)
    await page.getByRole('button', { name: /Continue/i }).click();
    
    // If the quoted comma bug exists, the description might be messed up or columns shifted
    // Wait for preview step
    await page.getByRole('button', { name: /Confirm & continue/i }).click();
    
    const descriptionCell = page.locator('table tbody tr td').last();
    const descriptionText = await descriptionCell.textContent();
    console.log('Parsed description:', descriptionText);
    
    // If bug 2 is present, "Dinner, with friends" will be split and description will be wrong.
    // In our case, description is the last column in the table preview.
    // Actually, look at the table header in ImportTransactionsDialog.tsx:
    // Date | Amount | Personal | Category | Description
    
    // 6. Complete import and check original_amount (bug 1 check)
    await page.getByRole('button', { name: /Import 1 expenses/i }).click();
    await expect(page.getByText(/Import successful/i)).toBeVisible();

    // 7. Go to Expenses tab and check the transaction
    await page.getByRole('button', { name: /Expenses/i, exact: true }).click();
    await expect(page.getByText(/Dinner, with friends/i)).toBeVisible();
    
    // Click to edit and check original amount
    await page.getByText(/Dinner, with friends/i).click();
    
    // We expect original_amount to be 100.00 but bug says it's 0
    const originalAmountLabel = page.locator('text=Original:');
    if (await originalAmountLabel.isVisible()) {
        const text = await originalAmountLabel.textContent();
        console.log('Original amount in UI:', text);
    }
  });

  test('Manual Recurring Transaction advancement bug', async ({ page }) => {
    // 1. Login
    await page.goto('/auth');
    await page.getByRole('button', { name: /Try Demo/i }).click();
    await expect(page).toHaveURL('/', { timeout: 15000 });

    // 2. Find a recurring transaction with "Create Now" button
    // The demo seed has "Netflix"
    const netflixRow = page.locator('div').filter({ hasText: /^Netflix/ }).first();
    const createNowButton = netflixRow.getByRole('button', { name: /Create Now/i });
    
    if (await createNowButton.isVisible()) {
        // Get current next due date if possible
        const initialDueDate = await netflixRow.locator('text=/Due/').textContent();
        console.log('Initial due date:', initialDueDate);
        
        await createNowButton.click();
        await expect(page.getByText(/Expense created/i)).toBeVisible();
        
        // Check if next due date advanced
        const finalDueDate = await netflixRow.locator('text=/Due/').textContent();
        console.log('Final due date:', finalDueDate);
        
        if (initialDueDate === finalDueDate) {
            console.log('BUG CONFIRMED: Next due date did not advance');
        }
    }
  });
});
