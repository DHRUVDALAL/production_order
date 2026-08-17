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
    const sapEventTimestamp = eventPayload.time || eventPayload.timestamp || new Date().toISOString();
    const capReceivedTimestamp = new Date().toISOString();

    // Check if event payload directly contains state changes (e.g. status or targetQty)
    const eventStatus = eventPayload.data?.OrderIsReleased ? 'REL' :
                        eventPayload.data?.OrderIsClosed ? 'CLSD' :
                        eventPayload.data?.OrderIsTechnicallyCompleted ? 'TECO' :
                        eventPayload.data?.OrderIsConfirmed ? 'CNF' :
                        eventPayload.data?.OrderIsPartiallyConfirmed ? 'PCNF' : null;

    const eventTargetQty = eventPayload.data?.TotalQuantity ? parseFloat(eventPayload.data.TotalQuantity) : undefined;

    // Fast-path: Update local DB immediately if state is present in payload
    if (orderNumber && (eventStatus || eventTargetQty)) {
      try {
        const { ProductionOrders } = cds.entities('sap.production.portal');
        const updateData = {};
        if (eventStatus) updateData.status = eventStatus;
        if (eventTargetQty) updateData.targetQty = eventTargetQty;
        
        await cds.run(
          UPDATE(ProductionOrders)
            .set(updateData)
            .where({ orderNumber: orderNumber })
        );
      } catch (fastErr) {
        console.warn(`[SAP INBOUND SYNC] Fast-path DB update error for ${orderNumber}:`, fastErr.message);
      }
    }

    const capBroadcastTimestamp = new Date().toISOString();

    // Broadcast immediately over WebSocket (Zero blocking latency)
    broadcastEvent({
      source: 'SAP_S4HANA_EVENT_MESH',
      eventType: eventType,
      orderId: orderNumber,
      status: eventStatus,
      targetQty: eventTargetQty,
      telemetry: {
        sapEventTimestamp,
        capReceivedTimestamp,
        capBroadcastTimestamp,
        capProcessingLatencyMs: new Date(capBroadcastTimestamp).getTime() - new Date(capReceivedTimestamp).getTime()
      },
      payload: eventPayload
    });

    res.status(200).json({ 
      status: 'SUCCESS', 
      message: 'SAP Event received and broadcasted immediately to UI',
      telemetry: {
        capProcessingLatencyMs: new Date(capBroadcastTimestamp).getTime() - new Date(capReceivedTimestamp).getTime()
      }
    });

    // Background Async Reconciliation with SAP S/4HANA (Non-blocking)
    if (orderNumber && !eventStatus) {
      setImmediate(async () => {
        try {
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

            // Secondary broadcast with confirmed authoritative SAP state
            broadcastEvent({
              source: 'SAP_S4HANA_RECONCILIATION',
              eventType: eventType,
              orderId: orderNumber,
              status: targetStatus,
              targetQty: parseFloat(sapOrder.TotalQuantity || 0) || undefined,
              telemetry: {
                sapEventTimestamp,
                capReceivedTimestamp,
                capReconciledTimestamp: new Date().toISOString()
              }
            });
          }
        } catch (syncErr) {
          console.warn(`[SAP INBOUND SYNC] Background reconciliation error for ${orderNumber}:`, syncErr.message);
        }
      });
    }
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

