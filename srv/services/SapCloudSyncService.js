import https from 'https';

const SAP_HOST = 'my421238-api.s4hana.cloud.sap';
const SAP_USER = process.env.SAP_USERNAME || 'PROD_API_USER';
const SAP_PASS = process.env.SAP_PASSWORD || 'Pr0d@Order#SAP2026!API';
const AUTH_HEADER = 'Basic ' + Buffer.from(`${SAP_USER}:${SAP_PASS}`).toString('base64');

class SapCloudSyncService {
  /**
   * Fetch CSRF Token, Cookies, and ETag for an order from SAP S/4HANA Public Cloud
   */
  async _fetchSapContext(orderNumber) {
    return new Promise((resolve, reject) => {
      const path = `/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2('${encodeURIComponent(orderNumber)}')?$format=json`;
      
      const req = https.request({
        hostname: SAP_HOST,
        port: 443,
        path: path,
        method: 'GET',
        headers: {
          'Authorization': AUTH_HEADER,
          'Accept': 'application/json',
          'x-csrf-token': 'Fetch'
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(body);
              const d = data.d || data;
              const token = res.headers['x-csrf-token'];
              const cookies = res.headers['set-cookie'] ? res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';
              const etag = res.headers['etag'] || (d.LastChangeDateTime ? `W/"'${d.LastChangeDateTime}'"` : null);

              resolve({ token, cookies, etag, orderData: d });
            } catch (err) {
              reject(new Error(`Failed to parse SAP order response: ${err.message}`));
            }
          } else {
            reject(new Error(`SAP GET Order ${orderNumber} failed with status ${res.statusCode}: ${body.substring(0, 200)}`));
          }
        });
      });

      req.on('error', err => reject(err));
      req.end();
    });
  }

  /**
   * Helper: format JS date or ISO string into SAP OData v2 /Date(timestamp)/ format
   */
  _formatSapDate(dateVal) {
    if (!dateVal) return undefined;
    if (typeof dateVal === 'string' && dateVal.startsWith('/Date(')) return dateVal;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return undefined;
    return `/Date(${d.getTime()})/`;
  }

  /**
   * Helper: Parse SAP OData error response JSON into human readable text
   */
  _parseSapErrorMessage(body) {
    if (!body) return 'Unknown SAP S/4HANA Cloud error';
    try {
      const json = typeof body === 'string' ? JSON.parse(body) : body;
      const msg = json.error?.message?.value || json.error?.message;
      const code = json.error?.code;
      if (msg && code) return `${msg} (SAP Code: ${code})`;
      if (msg) return msg;
    } catch (e) {
      // Ignore JSON parse error
    }
    return typeof body === 'string' ? body.substring(0, 300) : String(body);
  }

  /**
   * Send a PATCH request to update header fields (Planned Dates, TotalQuantity) on SAP S/4HANA Public Cloud
   */
  async patchOrder(orderNumber, payload) {
    try {
      const ctx = await this._fetchSapContext(orderNumber);
      const path = `/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2('${encodeURIComponent(orderNumber)}')`;
      
      const formattedPayload = { ...payload };
      if (formattedPayload.MfgOrderPlannedStartDate) {
        formattedPayload.MfgOrderPlannedStartDate = this._formatSapDate(formattedPayload.MfgOrderPlannedStartDate);
      }
      if (formattedPayload.MfgOrderPlannedEndDate) {
        formattedPayload.MfgOrderPlannedEndDate = this._formatSapDate(formattedPayload.MfgOrderPlannedEndDate);
      }
      if (formattedPayload.MfgOrderScheduledStartDate) {
        formattedPayload.MfgOrderScheduledStartDate = this._formatSapDate(formattedPayload.MfgOrderScheduledStartDate);
      }
      if (formattedPayload.MfgOrderScheduledEndDate) {
        formattedPayload.MfgOrderScheduledEndDate = this._formatSapDate(formattedPayload.MfgOrderScheduledEndDate);
      }
      if (formattedPayload.TotalQuantity !== undefined && formattedPayload.TotalQuantity !== null) {
        formattedPayload.TotalQuantity = String(formattedPayload.TotalQuantity);
      }

      const dataStr = JSON.stringify(formattedPayload);

      return new Promise((resolve, reject) => {
        const req = https.request({
          hostname: SAP_HOST,
          port: 443,
          path: path,
          method: 'PATCH',
          headers: {
            'Authorization': AUTH_HEADER,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-csrf-token': ctx.token,
            'Cookie': ctx.cookies,
            'If-Match': ctx.etag || '*'
          }
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`[SAP CLOUD SYNC] Order ${orderNumber} successfully PATCHed in Public Cloud:`, payload);
              resolve({ success: true, statusCode: res.statusCode });
            } else {
              const cleanErr = this._parseSapErrorMessage(body);
              console.warn(`[SAP CLOUD SYNC] Order ${orderNumber} PATCH notice (${res.statusCode}): ${cleanErr}`);
              resolve({ success: false, statusCode: res.statusCode, error: cleanErr });
            }
          });
        });

        req.on('error', err => reject(err));
        req.write(dataStr);
        req.end();
      });
    } catch (err) {
      console.warn(`[SAP CLOUD SYNC] patchOrder exception for ${orderNumber}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch full authoritative order record from SAP S/4HANA Public Cloud
   */
  async fetchOrderFromSap(orderNumber) {
    try {
      const ctx = await this._fetchSapContext(orderNumber);
      return { success: true, data: ctx.orderData };
    } catch (err) {
      console.warn(`[SAP CLOUD SYNC] fetchOrderFromSap error for ${orderNumber}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Explicit SAP Production Order Action Mapping Registry (API_PRODUCTION_ORDER_2_SRV)
   */
  static SAP_ACTION_MAPPINGS = {
    TECHNICAL_COMPLETE: {
      uiLabel: 'Technically Complete (TECO)',
      sapFunction: 'TechlyCmpltOrder',
      targetStatus: 'TECO'
    },
    REVOKE_TECHNICAL_COMPLETE: {
      uiLabel: 'Revoke Technical Completion',
      sapFunction: 'RevokeTechlyCmpltOrder',
      targetStatus: 'REL'
    },
    CLOSE_ORDER: {
      uiLabel: 'Close Order (CLSD)',
      sapFunction: 'CloseOrder',
      targetStatus: 'CLSD'
    },
    REVOKE_CLOSE_ORDER: {
      uiLabel: 'Revoke Close Order',
      sapFunction: 'RevokeCloseOrder',
      targetStatus: 'TECO'
    },
    RELEASE_ORDER: {
      uiLabel: 'Release Production Order (REL)',
      sapFunction: 'ReleaseOrder',
      targetStatus: 'REL'
    }
  };

  /**
   * Synchronize order status change to SAP S/4HANA Public Cloud
   */
  async syncStatusToSap(orderNumber, targetStatus) {
    console.log(`[SAP CLOUD SYNC] Propagating status change for order ${orderNumber} -> ${targetStatus} to SAP Public Cloud...`);
    try {
      if (targetStatus === 'CRTD') {
        return { success: true, targetStatus: 'CRTD' };
      } else if (targetStatus === 'REL') {
        return await this.callFunctionImport(orderNumber, 'ReleaseOrder');
      } else if (targetStatus === 'TECO') {
        return await this.callFunctionImport(orderNumber, 'TechlyCmpltOrder');
      } else if (targetStatus === 'CLSD') {
        return await this.callFunctionImport(orderNumber, 'CloseOrder');
      }
      return { success: true };
    } catch (err) {
      console.warn(`[SAP CLOUD SYNC] syncStatusToSap error for order ${orderNumber}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send a POST Function Import request (TechlyCmpltOrder, CloseOrder, ReleaseOrder, etc.)
   */
  async callFunctionImport(orderNumber, functionKeyOrName) {
    try {
      // Resolve function name using explicit mapping registry if a key was provided
      let sapFunctionName = functionKeyOrName;
      if (SapCloudSyncService.SAP_ACTION_MAPPINGS[functionKeyOrName]) {
        sapFunctionName = SapCloudSyncService.SAP_ACTION_MAPPINGS[functionKeyOrName].sapFunction;
      } else if (functionKeyOrName === 'TechnicallyComplete') {
        // Enforce replacement of legacy incorrect endpoint
        sapFunctionName = 'TechlyCmpltOrder';
      }

      // STEP 1: Fetch fresh SAP context to retrieve current ETag, CSRF token, and cookies
      const ctx = await this._fetchSapContext(orderNumber);
      const path = `/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/${sapFunctionName}?ManufacturingOrder='${encodeURIComponent(orderNumber)}'`;

      return new Promise((resolve, reject) => {
        const req = https.request({
          hostname: SAP_HOST,
          port: 443,
          path: path,
          method: 'POST',
          headers: {
            'Authorization': AUTH_HEADER,
            'Accept': 'application/json',
            'x-csrf-token': ctx.token,
            'Cookie': ctx.cookies,
            'If-Match': ctx.etag || '*'
          }
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            const timestamp = new Date().toISOString();
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`[SAP CLOUD SYNC] [${timestamp}] Function ${sapFunctionName} for order ${orderNumber} succeeded (HTTP ${res.statusCode}).`);
              resolve({ success: true, statusCode: res.statusCode });
            } else {
              const cleanErr = this._parseSapErrorMessage(body);
              let userFacingError = cleanErr;

              if (res.statusCode === 404 && body.includes('Resource not found for the segment')) {
                userFacingError = 'SAP integration configuration error: the requested Production Order API function is not available.';
              } else if (res.statusCode === 412) {
                userFacingError = 'Order data was modified concurrently in SAP. Please retry with latest state.';
              } else if (res.statusCode === 401 || res.statusCode === 403) {
                userFacingError = 'SAP authorization error: insufficient privileges for action.';
              }

              console.error(`[SAP CLOUD SYNC LOG] [${timestamp}]
  Order Number : ${orderNumber}
  Service Name : API_PRODUCTION_ORDER_2_SRV
  HTTP Method  : POST
  Path         : ${path}
  HTTP Status  : ${res.statusCode}
  SAP Message  : ${cleanErr}`);

              resolve({ success: false, statusCode: res.statusCode, error: userFacingError, rawSapError: cleanErr });
            }
          });
        });

        req.on('error', err => reject(err));
        req.end();
      });
    } catch (err) {
      console.warn(`[SAP CLOUD SYNC] ${functionKeyOrName} exception for ${orderNumber}:`, err.message);
      return { success: false, error: err.message };
    }
  }
}

export const sapCloudSync = new SapCloudSyncService();

