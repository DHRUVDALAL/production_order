import { chromium } from 'playwright';
import path from 'path';

async function captureDetails() {
  const targetDir = path.resolve('docs/assets/screenshots');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5
  });
  const page = await context.newPage();

  // Login as planner
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.fill('input[type="text"]', 'planner1');
  await page.fill('input[type="password"]', 'planner123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);

  // Navigate to orders
  await page.goto('http://localhost:5173/orders', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // Click the first link
  const link = page.locator('table tbody tr td a').first();
  await link.click();
  await page.waitForTimeout(2000);

  // Operations
  const opHeader = page.locator('text=Routing & Sequence Operations').first();
  if (await opHeader.isVisible()) {
    await opHeader.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(targetDir, '07_order_detail_operations.png') });
    console.log('✓ 07_order_detail_operations.png captured');
  }

  // Components
  const compHeader = page.locator('text=Bill of Materials').first();
  if (await compHeader.isVisible()) {
    await compHeader.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(targetDir, '08_order_detail_components.png') });
    console.log('✓ 08_order_detail_components.png captured');
  }

  // Goods movements
  const gmHeader = page.locator('text=Associated Goods Movements').first();
  if (await gmHeader.isVisible()) {
    await gmHeader.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(targetDir, '09_order_detail_goods_movements.png') });
    console.log('✓ 09_order_detail_goods_movements.png captured');
  }

  await browser.close();
}

captureDetails().catch(console.error);
