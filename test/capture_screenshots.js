import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function capture() {
  const targetDir = path.resolve('docs/assets/screenshots');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5
  });
  const page = await context.newPage();

  async function loginAs(user, pass) {
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.fill('input[type="text"]', user);
    await page.fill('input[type="password"]', pass);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1200);
  }

  console.log('1. Capturing Landing Page...');
  await page.goto('http://localhost:5173/landing', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(targetDir, '01_landing_page.png') });

  console.log('2. Capturing Login Screen...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(targetDir, '02_login_screen.png') });

  console.log('3. Logging in as Planner (planner1)...');
  await loginAs('planner1', 'planner123');

  console.log('4. Capturing Dashboard...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(targetDir, '03_dashboard.png') });

  console.log('5. Capturing Production Orders Monitor...');
  await page.goto('http://localhost:5173/orders', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(targetDir, '04_production_orders_monitor.png') });

  console.log('6. Capturing Create Order Modal...');
  const createBtn = page.locator('button:has-text("Create Production Order")').first();
  if (await createBtn.isVisible()) {
    await createBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(targetDir, '05_create_order_modal.png') });
    await page.goto('http://localhost:5173/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
  }

  console.log('7. Capturing Order Detail...');
  const orderRow = page.locator('table tbody tr').first();
  if (await orderRow.isVisible()) {
    await orderRow.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(targetDir, '06_order_detail_header.png') });

    // Scroll to operations
    const opHeader = page.locator('text=Production Operations').first();
    if (await opHeader.isVisible()) {
      await opHeader.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(targetDir, '07_order_detail_operations.png') });
    }

    // Scroll to components
    const compHeader = page.locator('text=Components & Bill of Materials').first();
    if (await compHeader.isVisible()) {
      await compHeader.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(targetDir, '08_order_detail_components.png') });
    }

    // Scroll to goods movements
    const gmHeader = page.locator('text=Associated Goods Movements').first();
    if (await gmHeader.isVisible()) {
      await gmHeader.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(targetDir, '09_order_detail_goods_movements.png') });
    }
  }

  console.log('8. Capturing Operations Confirmation Screen (Operator)...');
  await loginAs('operator1', 'operator123');
  await page.goto('http://localhost:5173/operations', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(targetDir, '10_operations_confirmation.png') });

  console.log('9. Capturing Quality Control Screen (Inspector)...');
  await loginAs('inspector1', 'inspector123');
  await page.goto('http://localhost:5173/quality', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(targetDir, '11_quality_control.png') });

  console.log('10. Capturing Goods Movement MIGO Screen (Purchaser)...');
  await loginAs('purchaser1', 'purchaser123');
  await page.goto('http://localhost:5173/goods-issue', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(targetDir, '12_goods_movement_migo.png') });

  console.log('11. Capturing Stock & Inventory Screen (Supervisor)...');
  await loginAs('supervisor1', 'super123');
  await page.goto('http://localhost:5173/inventory', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(targetDir, '13_stock_inventory.png') });

  await browser.close();
  console.log('✓ All 13 authentic application screenshots successfully captured!');
}

capture().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
