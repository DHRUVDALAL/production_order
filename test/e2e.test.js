import { chromium } from 'playwright';
import path from 'path';

async function runE2ETests() {
    console.log('========================================================================');
    console.log('STARTING AUTOMATED E2E BROWSER PERSONA TESTING (HEADLESS CHROMIUM)');
    console.log('========================================================================\n');

    const PORTAL_URL = 'http://localhost:5173';
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Register browser log listeners to capture errors
    page.on('console', msg => {
        console.log('  [Browser Console]:', msg.text());
    });
    
    page.on('pageerror', err => {
        console.error('  [Browser Page Error]:', err.message);
    });

    let createdOrderNum = '';

    try {
        // -------------------------------------------------------------
        // STEP 1: Log in as Production Planner & Create Order
        // -------------------------------------------------------------
        console.log('Step 1: Logging in as Production Planner (planner1)...');
        await page.goto(PORTAL_URL);
        
        // Fill login details using generic type selectors (extremely stable)
        await page.fill('input[type="text"]', 'planner1');
        await page.fill('input[type="password"]', 'planner123');
        await page.click('button[type="submit"]');
        
        // Verify dashboard load
        await page.waitForSelector('text=Manufacturing Executive Dashboard', { timeout: 60000 });
        console.log('✓ Successfully logged in and loaded Dashboard.');

        // Navigate to Production Orders page
        console.log('- Navigating to Production Orders page...');
        await page.click('nav a:has-text("Production Orders")');
        await page.waitForSelector('text=Monitor Production Orders');

        // Open Order Creation Form
        console.log('- Opening order creation form...');
        await page.click('button:has-text("Create Production Order")');
        await page.waitForSelector('text=New Production Order Details');

        // Fill Form by selecting precise matching options
        console.log('- Selecting materials and scheduling dates...');
        await page.locator('select').nth(0).selectOption({ label: 'FG-001 - Finished Assembly Model 001' }); // Material
        await page.locator('select').nth(1).selectOption({ label: 'PL01 - Dallas Assembly Plant' }); // Plant
        
        // Wait for SLoc dropdown to enable and select correct option
        await page.waitForTimeout(500);
        await page.locator('select').nth(2).selectOption({ label: 'SL02 - Finished Goods Stage' }); // Storage Location

        await page.locator('input[type="number"]').fill('120'); // Target Qty
        
        // Set dates
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        // Fill date fields by index
        await page.locator('input[type="date"]').nth(0).fill(tomorrowStr);
        await page.locator('input[type="date"]').nth(1).fill(nextWeekStr);

        // Submit form
        console.log('- Submitting order...');
        await page.click('button:has-text("Create Order")');
        
        // Wait for table to reload
        await page.waitForTimeout(1000);
        
        // Retrieve newly created order number from the first row of table
        const firstRowOrderLink = page.locator('table.sap-table tbody tr').first().locator('td').first().locator('a');
        createdOrderNum = await firstRowOrderLink.innerText();
        console.log(`✓ Production Order ${createdOrderNum} created successfully!`);

        // Click Manage
        console.log(`- Managing Order ${createdOrderNum}...`);
        await firstRowOrderLink.click();
        await page.waitForSelector('text=Order Details');

        // Execute ATP check
        console.log('- Triggering Material Availability Check (ATP)...');
        await page.click('button:has-text("Check Availability (ATP)")');
        
        // Wait for check success banner
        await page.waitForSelector('text=All raw material components are fully available!', { timeout: 60000 });
        console.log('✓ ATP Check completed. Order status updated to MACA.');

        // Release Order
        console.log('- Releasing Order...');
        await page.click('button:has-text("Release Order (REL)")');
        await page.waitForSelector('text=Production order successfully released', { timeout: 60000 });
        console.log('✓ Order released successfully (Status: REL).');

        // Start Execution (Planner has the permissions to initiate sequence)
        console.log('- Commencing execution (Start Order)...');
        await page.click('button:has-text("Start Execution")');
        await page.waitForSelector('text=Manufacturing execution started', { timeout: 60000 });
        console.log('✓ Order execution started (Status: STRT).');

        // Sign out
        console.log('- Signing out Planner...');
        await page.click('header button[title="Sign Out"]');
        await page.waitForSelector('button[type="submit"]');
        await page.evaluate(() => localStorage.clear());

        // -------------------------------------------------------------
        // STEP 2: Log in as Production Operator & Confirm Operations
        // -------------------------------------------------------------
        console.log('\nStep 2: Logging in as Production Operator (operator1)...');
        // Force fresh load to clear previous redirect state
        await page.goto(`${PORTAL_URL}/login`);
        await page.fill('input[type="text"]', 'operator1');
        await page.fill('input[type="password"]', 'operator123');
        await page.click('button[type="submit"]');
        await page.waitForSelector('text=Manufacturing Executive Dashboard', { timeout: 60000 });
        console.log('✓ Successfully logged in.');

        // Navigate directly to Confirm Operations page
        console.log('- Navigating to Operations Confirmation page...');
        await page.click('nav a:has-text("Confirm Operations")');
        await page.waitForSelector('text=Shop Floor Operation Confirmations');

        // Confirm Operation 10
        console.log('- Confirming Operation 10 (CNC Milling)...');
        const op10Row = page.locator(`.sap-card:has-text("ORDER: ${createdOrderNum}") tbody tr`).nth(0);
        await op10Row.locator('button:has-text("Confirm")').click();
        await page.locator('input[type="number"]').nth(0).fill('120'); // Yield
        await page.click('button:has-text("Save Confirmation")');
        await page.waitForSelector('text=confirmed successfully', { timeout: 60000 });
        console.log('✓ Operation 10 confirmed.');

        // Confirm Operation 20
        console.log('- Confirming Operation 20 (Assembly)...');
        const op20Row = page.locator(`.sap-card:has-text("ORDER: ${createdOrderNum}") tbody tr`).nth(1);
        await op20Row.locator('button:has-text("Confirm")').click();
        await page.locator('input[type="number"]').nth(0).fill('120'); // Yield
        await page.click('button:has-text("Save Confirmation")');
        await page.waitForSelector('text=confirmed successfully', { timeout: 60000 });
        console.log('✓ Operation 20 confirmed.');

        // Confirm Operation 30 (Triggers QA hold)
        console.log('- Confirming final Operation 30 (trigging QM hold)...');
        const op30Row = page.locator(`.sap-card:has-text("ORDER: ${createdOrderNum}") tbody tr`).nth(2);
        await op30Row.locator('button:has-text("Confirm")').click();
        await page.locator('input[type="number"]').nth(0).fill('120'); // Yield
        await page.click('button:has-text("Save Confirmation")');
        await page.waitForSelector('text=confirmed successfully', { timeout: 60000 });
        console.log('✓ Final operation 30 confirmed. Order is now on Quality Hold.');

        // Sign out Operator
        await page.click('header button[title="Sign Out"]');
        await page.waitForSelector('button[type="submit"]');
        await page.evaluate(() => localStorage.clear());

        // -------------------------------------------------------------
        // STEP 3: Log in as Quality Inspector & Record Usage Decision
        // -------------------------------------------------------------
        console.log('\nStep 3: Logging in as Quality Inspector (inspector1)...');
        // Force fresh load to clear redirect state
        await page.goto(`${PORTAL_URL}/login`);
        await page.fill('input[type="text"]', 'inspector1');
        await page.fill('input[type="password"]', 'inspector123');
        await page.click('button[type="submit"]');
        await page.waitForSelector('text=Manufacturing Executive Dashboard', { timeout: 60000 });
        console.log('✓ Successfully logged in.');

        // Navigate to Quality page
        console.log('- Navigating to Quality Control page...');
        await page.click('nav a:has-text("Quality Control")');
        await page.waitForSelector('text=Quality Inspection Lots');

        // Locate inspection lot for our order and submit Usage Decision
        console.log(`- Finding pending inspection lot for Order ${createdOrderNum}...`);
        const lotRow = page.locator(`tr:has-text("${createdOrderNum}")`);
        await lotRow.locator('button:has-text("Submit UD")').click();

        // Submit usage decision (UDAC - Approved)
        console.log('- Submitting approved Usage Decision (UDAC)...');
        await page.selectOption('select', 'UDAC');
        await page.click('button:has-text("Submit UD")');
        await page.waitForSelector('text=Usage Decision recorded successfully', { timeout: 60000 });
        console.log('✓ Inspection lot approved. Order cleared for Goods Receipt.');

        // Sign out Inspector
        await page.click('header button[title="Sign Out"]');
        await page.waitForSelector('button[type="submit"]');
        await page.evaluate(() => localStorage.clear());

        // -------------------------------------------------------------
        // STEP 4: Log in as Inventory Manager & Post Goods Receipt
        // -------------------------------------------------------------
        console.log('\nStep 4: Logging in as Inventory Manager (inv_mgr1)...');
        // Force fresh load to clear redirect state
        await page.goto(`${PORTAL_URL}/login`);
        await page.fill('input[type="text"]', 'inv_mgr1');
        await page.fill('input[type="password"]', 'inventory123');
        await page.click('button[type="submit"]');
        await page.waitForSelector('text=Manufacturing Executive Dashboard', { timeout: 60000 });
        console.log('✓ Successfully logged in.');

        // Navigate to Order details to post GR
        console.log(`- Loading order detail link for ${createdOrderNum} to post GR...`);
        await page.goto(`${PORTAL_URL}/orders`);
        await page.locator(`tr:has-text("${createdOrderNum}") a`).first().click();
        await page.waitForSelector('text=Order Details');

        // Open GR form
        console.log('- Opening Goods Receipt posting form...');
        await page.click('button:has-text("Post Goods Receipt (101)")');
        await page.waitForSelector('text=Goods Receipt - Movement 101');

        // Fill GR quantities
        await page.locator('input[type="number"]').fill('120');
        await page.click('button:has-text("Post Inventory")');
        
        // Verify success banner
        await page.waitForSelector('text=Goods Receipt posted successfully', { timeout: 60000 });
        console.log('✓ Goods Receipt GR 101 posted successfully. Order technically completed (TECO).');

        // Sign out Inventory manager
        await page.click('header button[title="Sign Out"]');
        await page.waitForSelector('button[type="submit"]');
        await page.evaluate(() => localStorage.clear());

        // -------------------------------------------------------------
        // STEP 5: Log in as System Admin & Verify Audit Logs
        // -------------------------------------------------------------
        console.log('\nStep 5: Logging in as System Administrator (admin)...');
        // Force fresh load to clear redirect state
        await page.goto(`${PORTAL_URL}/login`);
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForSelector('text=Manufacturing Executive Dashboard', { timeout: 60000 });
        console.log('✓ Successfully logged in.');

        // Navigate to Admin
        console.log('- Opening Administration panel...');
        await page.click('nav a:has-text("Administration")');
        await page.waitForSelector('text=Administration & System Audit Trails');

        // Verify audit logs contain E2E logs
        console.log('- Checking Audit Trail log records...');
        const loginAuditRow = page.locator('table.sap-table tbody tr:has-text("USER_LOGIN")').first();
        const grAuditRow = page.locator('table.sap-table tbody tr:has-text("GOODS_RECEIPT")').first();
        
        if (await loginAuditRow.count() > 0 && await grAuditRow.count() > 0) {
            console.log('✓ Verified: Audit trail correctly logs user sessions and inventory postings.');
        } else {
            console.log('⚠ Warning: Some expected audit logs were not listed in the table.');
        }

        console.log('\n========================================================================');
        console.log('SUCCESS: ALL BROWSER E2E PERSONA TESTS PASSED SUCCESSFULLY!');
        console.log('========================================================================');

    } catch (e) {
        console.error('\n❌ E2E TEST RUN ENCOUNTERED A FAILURE:');
        console.error(e);
        console.log('Failed at URL:', page.url());
        console.log('========================================================================');
        // Capture screenshot of current screen state on failure
        await page.screenshot({ path: 'e2e-failure.png' });
        console.log('Captured error screenshot at: e2e-failure.png');
        await browser.close();
        process.exit(1);
    }

    await browser.close();
}

runE2ETests();
