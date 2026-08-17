import https from 'https';
import http from 'http';

const SAP_HOST = 'my421238-api.s4hana.cloud.sap';
const SAP_USER = 'PROD_API_USER';
const SAP_PASS = 'Pr0d@Order#SAP2026!API';
const AUTH_HEADER = 'Basic ' + Buffer.from(`${SAP_USER}:${SAP_PASS}`).toString('base64');

async function runTest() {
  console.log('=== Step 1: Querying CAP Local SQLite for Order 600128 ===');
  
  // 1. Get order ID from CAP local service
  const capOrder = await new Promise((resolve) => {
    http.get('http://localhost:4004/odata/v4/production/ProductionOrders?$filter=orderNumber%20eq%20%27600128%27', (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body).value[0]));
    });
  });

  console.log('Local CAP Order:', capOrder ? { ID: capOrder.ID, orderNumber: capOrder.orderNumber, status: capOrder.status, plannedStartDate: capOrder.plannedStartDate, plannedEndDate: capOrder.plannedEndDate } : 'NOT FOUND');

  if (!capOrder) {
    console.error('Order 600128 not found in local CAP database.');
    return;
  }

  console.log('\n=== Step 2: Triggering Read PP Master Data Action on CAP Portal ===');
  const postData = JSON.stringify({
    orderId: capOrder.ID,
    productionVersion: 'PV01',
    basicStart: '2026-08-14',
    basicFinish: '2026-08-21',
    newRouting: true,
    newBOM: true
  });

  const actionRes = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4004,
      path: '/odata/v4/production/readPPMasterData',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: body }));
    });
    req.write(postData);
    req.end();
  });

  console.log('readPPMasterData Action Response:', actionRes.statusCode, actionRes.body);

  console.log('\n=== Step 3: Querying SAP S/4HANA Public Cloud Directly for Order 600128 ===');
  const sapOrder = await new Promise((resolve) => {
    https.get({
      hostname: SAP_HOST,
      port: 443,
      path: `/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2('600128')?$format=json`,
      headers: {
        'Authorization': AUTH_HEADER,
        'Accept': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const d = JSON.parse(body).d;
          resolve(d);
        } catch(e) {
          resolve(body);
        }
      });
    });
  });

  console.log('Live SAP Public Cloud Order 600128:');
  console.log('  ManufacturingOrder:', sapOrder.ManufacturingOrder);
  console.log('  TotalQuantity:', sapOrder.TotalQuantity);
  console.log('  Planned Start Date:', sapOrder.MfgOrderPlannedStartDate);
  console.log('  Planned End Date:', sapOrder.MfgOrderPlannedEndDate);
  console.log('  OrderIsReleased:', sapOrder.OrderIsReleased);
}

runTest().catch(console.error);
