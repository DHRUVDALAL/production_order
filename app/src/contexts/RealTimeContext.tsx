import React, { createContext, useContext, useEffect, useState } from 'react';

export interface RealTimeEvent {
  source: string;
  eventType: string;
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
}

interface RealTimeContextType {
  isConnected: boolean;
  lastEvent: RealTimeEvent | null;
  supportedEvents: string[];
  triggerSync: () => void;
}

const RealTimeContext = createContext<RealTimeContextType>({
  isConnected: false,
  lastEvent: null,
  supportedEvents: [],
  triggerSync: () => {}
});

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealTimeEvent | null>(null);
  const [supportedEvents, setSupportedEvents] = useState<string[]>([]);

  const triggerSync = () => {
    setLastEvent({
      source: 'MANUAL_USER_TRIGGER',
      eventType: 'ProductionOrder.ManualSyncRequested',
      timestamp: new Date().toISOString()
    });
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

        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          if (isUnmounted) {
            socket?.close();
            return;
          }
          console.log('[WebSocket Client]: Connected to S/4HANA Real-Time Event Sync Engine');
          setIsConnected(true);
        };

        socket.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const data: RealTimeEvent = JSON.parse(event.data);
            const clientReceivedTimestamp = new Date().toISOString();

            if (data.telemetry?.sapEventTimestamp) {
              const totalPipelineMs = new Date(clientReceivedTimestamp).getTime() - new Date(data.telemetry.sapEventTimestamp).getTime();
              data.telemetry.clientReceivedTimestamp = clientReceivedTimestamp;
              data.telemetry.totalPipelineLatencyMs = totalPipelineMs;
              console.log(`[WebSocket Telemetry]: End-to-End Event Latency = ${totalPipelineMs}ms (CAP Processing: ${data.telemetry.capProcessingLatencyMs}ms)`);
            } else {
              console.log('[WebSocket Client]: Live event received:', data);
            }
            
            if (data.eventType === 'CONNECTED' && data.supportedEvents) {
              setSupportedEvents(data.supportedEvents);
            } else {
              setLastEvent(data);
            }
          } catch (err) {
            console.error('[WebSocket Client]: Failed to parse event payload', err);
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          if (!isUnmounted) {
            console.log('[WebSocket Client]: Disconnected. Reconnecting in 3 seconds...');
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

        socket.onerror = (err) => {
          console.error('[WebSocket Client]: Error observed:', err);
        };
      } catch (err) {
        console.error('[WebSocket Client]: Connection exception:', err);
        if (!isUnmounted) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null; // Prevent onclose reconnect trigger during unmount
        socket.close();
      }
    };
  }, []);

  return (
    <RealTimeContext.Provider value={{ isConnected, lastEvent, supportedEvents, triggerSync }}>
      {children}
    </RealTimeContext.Provider>
  );
};

export const useRealTime = () => useContext(RealTimeContext);
