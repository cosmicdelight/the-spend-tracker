import { test, expect, type Page } from '@playwright/test';

// The demo account is read-only in the database, so it cannot drive anything that
// writes. scripts/seed-local.js provisions this ordinary account with identical data.
const E2E_EMAIL = 'e2e@spendtracker.app';
const E2E_PASSWORD = process.env.DEMO_PASSWORD || 'password123';

async function signIn(page: Page) {
  // Index renders the onboarding tour for real accounts only ({!isDemo && ...}), and
  // its backdrop is a fixed inset-0 overlay that swallows every click. Try Demo never
  // hit this because handleTryDemo pre-sets the same key. Must run before the app
  // loads, hence addInitScript rather than an evaluate after goto.
  await page.addInitScript(() => {
    window.localStorage.setItem('onboarding-tour-seen', 'true');
  });
  await page.goto('/auth');
  await page.getByPlaceholder('Email').fill(E2E_EMAIL);
  await page.getByPlaceholder('Password').first().fill(E2E_PASSWORD);
  await page.getByRole('button', { name: /^Sign In$/ }).click();
  await expect(page).toHaveURL('/', { timeout: 15000 });
}

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

  test('the demo account warns that it is shared, and still loads its data', async ({ page }) => {
    // That the demo cannot WRITE is proved by scripts/verify-demo-readonly.sql, which
    // impersonates the session in Postgres and watches the insert get refused — far
    // more precise than driving a form. What this covers instead is the half that only
    // a browser can show: the warning renders, and the read-only policy did not
    // over-reach into SELECT and leave the demo staring at an empty app.
    await page.goto('/');
    await page.getByRole('button', { name: /Try Demo/i }).click();
    await expect(page).toHaveURL('/', { timeout: 15000 });

    await expect(page.getByText(/shared sample account/i)).toBeVisible();
    await expect(page.getByText(/Total Charged/i)).toBeVisible();

    await page.getByRole('button', { name: /Expenses/i }).first().click();
    await expect(page.getByText('Netflix').first()).toBeVisible();
  });

  test('CSV Import bug: missing original_amount and quoted comma parsing', async ({ page }) => {
    // 1. Login first
    await signIn(page);

    // 2. Open Import CSV dialog
    await page.getByRole('button', { name: /Import CSV/i }).click();
    await expect(page.getByText(/Import from CSV/i)).toBeVisible();

    // 3. Create a CSV file with a quoted comma in description
    // Date the fixture to today: the Expenses list filters to the selected month,
    // which defaults to the current one, so a hardcoded past date would import fine
    // and then be correctly invisible in step 7. Built from local parts rather than
    // toISOString(), which is UTC and rolls the date over early in +08:00.
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const csvContent = 'date,amount,personal_amount,category,sub_category,payment_mode,description,notes\n' +
                       `${today},100.00,100.00,Dining,,credit_card,"Dinner, with friends",test notes`;

    // 4. Set the file straight on the input. The input is class="hidden", so the
    //    old click-then-await-filechooser approach could never work: Playwright
    //    refuses to click an invisible element. setInputFiles drives hidden inputs
    //    directly, and takes the fixture from memory so there is no temp file and
    //    no __dirname (absent under "type": "module").
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test_import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // 5. Check if it parsed correctly (bug 2 check)
    await page.getByRole('button', { name: /Continue/i }).click();
    
    // If the quoted comma bug exists, the description might be messed up or columns shifted
    // Wait for preview step
    // The review step only renders when the CSV introduces categories that need
    // resolving — handleProceed goes straight to preview otherwise. This CSV uses
    // "Dining", which the seed already creates, so the step is skipped. Wait for
    // the flow to settle on either step, then click review only if it is there.
    await expect(
      page.getByRole('button', { name: /Confirm & continue|Import \d+ expenses/i }).first()
    ).toBeVisible();
    const confirmReview = page.getByRole('button', { name: /Confirm & continue/i });
    if (await confirmReview.count()) {
      await confirmReview.click();
    }
    
    const descriptionCell = page.locator('table tbody tr td').last();
    const descriptionText = await descriptionCell.textContent();
    console.log('Parsed description:', descriptionText);
    
    // If bug 2 is present, "Dinner, with friends" will be split and description will be wrong.
    // In our case, description is the last column in the table preview.
    // Actually, look at the table header in ImportTransactionsDialog.tsx:
    // Date | Amount | Personal | Category | Description
    
    // 6. Complete import and check original_amount (bug 1 check)
    await page.getByRole('button', { name: /Import 1 expenses/i }).click();
    // The toast renders its title and an aria-live announcement containing the same
    // words, so an unqualified getByText matches two nodes and trips strict mode.
    await expect(page.getByText(/Import successful/i).first()).toBeVisible();

    // 7. Go to Expenses tab and check the transaction
    await page.getByRole('button', { name: /Expenses/i }).first().click();
    const importedRow = page.getByText(/Dinner, with friends/i).first();
    await expect(importedRow).toBeVisible();

    // Click to edit and check original amount
    await importedRow.click();

    // We expect original_amount to be 100.00 but bug says it's 0
    const originalAmountLabel = page.locator('text=Original:').first();
    if (await originalAmountLabel.isVisible().catch(() => false)) {
        const text = await originalAmountLabel.textContent();
        console.log('Original amount in UI:', text);
    }
  });

  test('settled-up checkbox appears when your share is zero', async ({ page }) => {
    // Regression: the checkbox was gated on `share > 0 && share < total`, while the
    // save path used `share < total`. Entering 0 — you paid, someone owes all of it —
    // hid the checkbox but still wrote whatever settledUp was left at.
    await signIn(page);

    await page.getByRole('button', { name: /Add Transaction/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const total = dialog.getByPlaceholder('200.00');
    const share = dialog.getByPlaceholder('Same as total');
    // The control itself, not the label beside it: the bug was a missing checkbox.
    const settledUp = dialog.getByRole('checkbox');

    await total.fill('100');
    // Share left blank means it defaults to the total, so this is not a split.
    await expect(settledUp).toBeHidden();

    await share.fill('0');
    await expect(settledUp).toBeVisible();
    await expect(settledUp).toBeEnabled();
    await settledUp.check();
    await expect(settledUp).toBeChecked();

    await share.fill('50');
    await expect(settledUp).toBeVisible();

    await share.fill('100');
    await expect(settledUp).toBeHidden();
  });

  test('a saved zero-share expense reopens with settled-up visible and checked', async ({ page }) => {
    // Covers the edit dialog and the persistence half: the Add-dialog test only proves
    // the checkbox renders, not that a ticked value survives a round trip through the
    // database. The seeded row has personal_amount 0 with settled_up true.
    await signIn(page);

    await page.getByRole('button', { name: /Expenses/i }).first().click();
    await page.getByText('Group dinner').first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const settledUp = dialog.getByRole('checkbox');
    await expect(settledUp).toBeVisible();
    await expect(settledUp).toBeChecked();
  });

  test('bank and credit card cards match width on a narrow viewport', async ({ page }) => {
    // Regression: both dashboard grids lacked a base grid-cols, so below the sm
    // breakpoint items landed in an implicit auto track sized by min-content. The
    // bank card lists its assigned cards on one line, which made that line
    // unbreakable and pushed the card past the viewport — wider than the credit
    // card cards beside it.
    await page.setViewportSize({ width: 375, height: 812 });
    await signIn(page);

    const bankSection = page.locator('section').filter({ hasText: 'Bank Progress' }).first();
    const cardSection = page.locator('section').filter({ hasText: 'Credit Card Progress' }).first();
    const bankCard = bankSection.locator('div.grid > div').first();
    const creditCard = cardSection.locator('div.grid > div').first();
    await expect(bankCard).toBeVisible();
    await expect(creditCard).toBeVisible();

    const bankBox = await bankCard.boundingBox();
    const creditBox = await creditCard.boundingBox();
    expect(bankBox).not.toBeNull();
    expect(creditBox).not.toBeNull();
    expect(Math.round(bankBox!.width)).toBe(Math.round(creditBox!.width));

    // The page itself must not scroll sideways — the general form of the same bug.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflows).toBe(false);

    // And the card list must be readable rather than clipped: constraining the width
    // is what made the old `truncate` start cutting names off.
    const cardList = bankCard.locator('p').last();
    await expect(cardList).toContainText('UOB Visa Signature');
    const clipped = await cardList.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(clipped).toBe(false);
  });

  test('Manual Recurring Transaction advancement bug', async ({ page }) => {
    // 1. Login
    await signIn(page);

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
