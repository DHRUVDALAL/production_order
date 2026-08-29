import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

export interface RealTimeEvent {
  source: string;
  eventType: string;
  eventId?: string;
  orderId?: string;
  status?: string;
  targetQty?: number;
  timestamp?: string;
  telemetry?: {
    sapEventTimestamp?: string;
    capReceivedTimestamp?: string;
    capBroadcastTimestamp?: string;
    capProcessingLatencyMs?: number;
    clientReceivedTimestamp?: string;
    totalPipelineLatencyMs?: number;
  };
  payload?: any;
  message?: string;
  supportedEvents?: string[];
  isUserFacing?: boolean;
}

export const SYSTEM_EVENT_TYPES = [
  'CONNECTED',
  'DISCONNECTED',
  'BackgroundSyncCompleted',
  'ProductionOrder.BackgroundSyncCompleted',
  'HEARTBEAT',
  'PING',
  'SYNC_STARTED',
  'SYNC_COMPLETED'
];

export const isUserFacingEvent = (event: RealTimeEvent | null): boolean => {
  if (!event || !event.eventType) return false;
  
  const type = event.eventType.trim();
  const isSystem = SYSTEM_EVENT_TYPES.some(sysType => 
    type === sysType || 
    type.endsWith(`.${sysType}`) ||
    type.includes('BackgroundSyncCompleted') ||
    type.includes('CONNECTED') ||
    type.includes('DISCONNECTED') ||
    type.includes('HEARTBEAT') ||
    type.includes('PING')
  );
  
  return !isSystem;
};

interface RealTimeContextType {
  isConnected: boolean;
  lastEvent: RealTimeEvent | null;
  userFacingEvent: RealTimeEvent | null;
  supportedEvents: string[];
  triggerSync: () => void;
}

const RealTimeContext = createContext<RealTimeContextType>({
  isConnected: false,
  lastEvent: null,
  userFacingEvent: null,
  supportedEvents: [],
  triggerSync: () => {}
});

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealTimeEvent | null>(null);
  const [userFacingEvent, setUserFacingEvent] = useState<RealTimeEvent | null>(null);
  const [supportedEvents, setSupportedEvents] = useState<string[]>([]);
  
  // Deduplication cache to prevent duplicate toasts for identical events within a 10s window
  const processedEventKeysRef = useRef<Map<string, number>>(new Map());

  const triggerSync = () => {
    const manualEvent: RealTimeEvent = {
      source: 'MANUAL_USER_TRIGGER',
      eventType: 'ProductionOrder.ManualSyncRequested',
      timestamp: new Date().toISOString(),
      isUserFacing: true
    };
    setLastEvent(manualEvent);
    setUserFacingEvent(manualEvent);
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:4004/ws/production-orders`;
    let socket: WebSocket | null = null;
    let reconnectTimer: any = null;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;

      try {
        if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
          return;
        }

        console.log('[WS] Creating connection to:', wsUrl);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          if (isUnmounted) {
            console.log('[WS] Closed early due to component unmount');
            socket?.close();
            return;
          }
          console.log('[WS] Connection opened successfully');
          setIsConnected(true);
        };

        socket.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const data: RealTimeEvent = JSON.parse(event.data);
            const clientReceivedTimestamp = new Date().toISOString();
            
            console.log(`[WS] Event received:`, data.eventType, data);

            if (data.telemetry?.sapEventTimestamp) {
              const totalPipelineMs = new Date(clientReceivedTimestamp).getTime() - new Date(data.telemetry.sapEventTimestamp).getTime();
              data.telemetry.clientReceivedTimestamp = clientReceivedTimestamp;
              data.telemetry.totalPipelineLatencyMs = totalPipelineMs;
              console.log(`[WebSocket Telemetry]: End-to-End Event Latency = ${totalPipelineMs}ms (CAP Processing: ${data.telemetry.capProcessingLatencyMs}ms)`);
            }

            if (data.eventType === 'CONNECTED' && data.supportedEvents) {
              console.log('[WS] Event classified: SYSTEM_EVENT (CONNECTED)');
              setSupportedEvents(data.supportedEvents);
              return;
            }

            // Centralized Event Classification
            const isUserFacing = isUserFacingEvent(data);
            data.isUserFacing = isUserFacing;

            if (isUserFacing) {
              console.log(`[WS] Event classified: BUSINESS_EVENT (${data.eventType})`);

              // Event Deduplication logic using eventId or stable composite key + time window
              const now = Date.now();
              const dedupKey = data.eventId || `${data.eventType}_${data.orderId || ''}_${data.status || ''}`;
              const lastProcessedTime = processedEventKeysRef.current.get(dedupKey);

              // Clean up stale cache keys older than 30 seconds
              processedEventKeysRef.current.forEach((time, key) => {
                if (now - time > 30000) processedEventKeysRef.current.delete(key);
              });

              if (lastProcessedTime && now - lastProcessedTime < 10000) {
                console.log(`[WS] Duplicate business event suppressed within deduplication window: ${dedupKey}`);
                setLastEvent(data); // still allow data refresh
                return;
              }

              processedEventKeysRef.current.set(dedupKey, now);
              console.log(`[WS] Notification displayed for business event: ${data.eventType}`);
              setLastEvent(data);
              setUserFacingEvent(data);
            } else {
              console.log(`[WS] Event classified: SYSTEM_EVENT (${data.eventType})`);
              console.log(`[WS] Notification suppressed: ${data.eventType}`);
              setLastEvent(data); // allow data refresh if needed without toast
            }
          } catch (err) {
            console.error('[WS] Failed to parse event payload:', err);
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          if (!isUnmounted) {
            console.log('[WS] Connection closed. Reconnecting in 3 seconds...');
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

        socket.onerror = (err) => {
          console.error('[WS] Error observed:', err);
        };
      } catch (err) {
        console.error('[WS] Connection exception:', err);
        if (!isUnmounted) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      console.log('[WS] Component unmounting — cleaning up WebSocket connection & listeners');
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null; // Prevent onclose reconnect trigger during unmount
        socket.close();
      }
    };
  }, []);

  return (
    <RealTimeContext.Provider value={{ isConnected, lastEvent, userFacingEvent, supportedEvents, triggerSync }}>
      {children}
    </RealTimeContext.Provider>
  );
};

export const useRealTime = () => useContext(RealTimeContext);
