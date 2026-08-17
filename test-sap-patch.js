import https from 'https';

const user = 'PROD_API_USER';
const pass = 'Pr0d@Order#SAP2026!API';
const auth = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');

console.log('--- Testing Plain String Date "2026-08-13" on SAP S/4HANA Public Cloud ---');

const getReq = https.request({
  hostname: 'my421238-api.s4hana.cloud.sap',
  port: 443,
  path: "/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2('600128')?$format=json",
  method: 'GET',
  headers: {
    'Authorization': auth,
    'Accept': 'application/json',
    'x-csrf-token': 'Fetch'
  }
}, (res) => {
  const token = res.headers['x-csrf-token'];
  const cookies = res.headers['set-cookie'];
  const responseEtag = res.headers['etag'];

  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    const orderData = data.d || data;
    const etag = responseEtag || `W/"'${orderData.LastChangeDateTime}'"`;

    const patchPayload = JSON.stringify({
      MfgOrderPlannedStartDate: "2026-08-13"
    });

    const patchReq = https.request({
      hostname: 'my421238-api.s4hana.cloud.sap',
      port: 443,
      path: "/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2('600128')",
      method: 'PATCH',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-csrf-token': token,
        'Cookie': cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '',
        'If-Match': etag
      }
    }, (patchRes) => {
      console.log('PATCH Status Code:', patchRes.statusCode);
      let patchBody = '';
      patchRes.on('data', chunk => patchBody += chunk);
      patchRes.on('end', () => {
        console.log('PATCH Response:', patchBody || '(204 SUCCESS)');
      });
    });

    patchReq.write(patchPayload);
    patchReq.end();
  });
});

getReq.end();
