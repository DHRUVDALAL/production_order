import cds from '@sap/cds';
import { WebSocketServer, WebSocket } from 'ws';
import { sapCloudSync } from './services/SapCloudSyncService.js';

let wss = null;

// Helper to broadcast event updates to all connected clients
export function broadcastEvent(eventData) {
  if (!wss) return;
  const message = JSON.stringify(eventData);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Custom server bootstrap to register CORS middleware & Webhook endpoints
cds.on('bootstrap', (app) => {
  // Middleware for CORS
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-user-role');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-user-role'
      });
      res.end();
      return;
    }
    next();
  });

  // Webhook endpoint to receive SAP Event Mesh notifications
  app.post('/api/events/sap-production-order', expressJsonMiddleware, async (req, res) => {
    const eventPayload = req.body;
    console.log('[SAP Event Mesh webhook received]:', JSON.stringify(eventPayload));

    // Extract SAP event details (e.g. sap.s4.beh.productionorder.v1.ProductionOrder.Created.v1)
    const eventType = eventPayload.type || eventPayload.eventType || 'ProductionOrder.Changed';
    const orderNumber = eventPayload.data?.ManufacturingOrder || eventPayload.ManufacturingOrder || eventPayload.id;

    if (orderNumber) {
      try {
        // Fetch authoritative state from SAP S/4HANA Public Cloud
        const sapRes = await sapCloudSync.fetchOrderFromSap(orderNumber);
        if (sapRes.success && sapRes.data) {
          const sapOrder = sapRes.data;
          const { ProductionOrders } = cds.entities('sap.production.portal');
          
          let targetStatus = 'CRTD';
          if (sapOrder.OrderIsClosed) targetStatus = 'CLSD';
          else if (sapOrder.OrderIsTechnicallyCompleted) targetStatus = 'TECO';
          else if (sapOrder.OrderIsConfirmed) targetStatus = 'CNF';
          else if (sapOrder.OrderIsPartiallyConfirmed) targetStatus = 'PCNF';
          else if (sapOrder.OrderIsReleased) targetStatus = 'REL';

          await cds.run(
            UPDATE(ProductionOrders)
              .set({
                status: targetStatus,
                targetQty: parseFloat(sapOrder.TotalQuantity || 0) || undefined
              })
              .where({ orderNumber: orderNumber })
          );
          console.log(`[SAP INBOUND SYNC] Order ${orderNumber} updated in CAP local DB from SAP event (${targetStatus}).`);
        }
      } catch (syncErr) {
        console.warn(`[SAP INBOUND SYNC] Failed to update CAP DB for ${orderNumber}:`, syncErr.message);
      }
    }

    // Broadcast to UI web socket clients
    broadcastEvent({
      source: 'SAP_S4HANA_EVENT_MESH',
      eventType: eventType,
      orderId: orderNumber,
      timestamp: new Date().toISOString(),
      payload: eventPayload
    });

    res.status(200).json({ status: 'SUCCESS', message: 'SAP Event processed, DB synced, and broadcasted to UI clients' });
  });
});

// Express body parser middleware helper
function expressJsonMiddleware(req, res, next) {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    try {
      req.body = data ? JSON.parse(data) : {};
    } catch (e) {
      req.body = {};
    }
    next();
  });
}

// Bind WebSocket server to HTTP server once CAP starts listening
cds.on('listening', (app) => {
  const server = app.server;
  if (server) {
    wss = new WebSocketServer({ server, path: '/ws/production-orders' });
    console.log('[Real-Time Engine]: WebSocket server initialized on path /ws/production-orders');

    wss.on('connection', (ws, req) => {
      console.log('[Real-Time Engine]: Client connected to Production Order live stream');
      ws.send(JSON.stringify({
        source: 'SYSTEM',
        eventType: 'CONNECTED',
        message: 'Connected to SAP Production Order Real-Time Sync Service',
        supportedEvents: [
          'ProductionOrder.Created',
          'ProductionOrder.Changed',
          'ProductionOrder.Released',
          'ProductionOrder.Confirmed',
          'ProductionOrder.TechnicallyCompleted',
          'ProductionOrder.Closed',
          'ProductionOrder.Cancelled'
        ]
      }));

      ws.on('close', () => {
        console.log('[Real-Time Engine]: Client disconnected');
      });
    });
  }
});

export default cds.server;

