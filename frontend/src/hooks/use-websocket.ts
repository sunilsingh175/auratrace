"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface LogEvent {
  service_id: string;
  timestamp: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
  latency_ms: number;
  error_type?: string;
  message?: string;
  stack_trace?: string;
  metadata?: Record<string, any>;
}

export interface AnomalyAlertEvent {
  incident_id?: string;
  service_id: string;
  anomaly_score: number;
  error_type: string;
  message?: string;
  stack_trace?: string;
  reason?: string;
  ai_root_cause?: string;
  ai_suggested_patch?: string;
  is_diagnosed?: boolean;
  timestamp: string;
}

export function useWebSocket(onAnomalyAlert?: (alert: AnomalyAlertEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const alertCallbackRef = useRef(onAnomalyAlert);

  alertCallbackRef.current = onAnomalyAlert;

  const connect = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/telemetry";
    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        console.log("Connected to AuraTrace Live WebSocket Stream.");
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "TELEMETRY_LOG" && payload.data) {
            setLogs((prev) => [payload.data, ...prev].slice(0, 300));
          } else if (payload.type === "ANOMALY_ALERT" && payload.data) {
            if (alertCallbackRef.current) {
              alertCallbackRef.current(payload.data);
            }
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      socket.onerror = (err) => {
        console.warn("WebSocket error:", err);
        socket.close();
      };
    } catch (err) {
      console.error("WebSocket connection initiation failed:", err);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const clearLogs = () => setLogs([]);

  return { isConnected, logs, clearLogs };
}
