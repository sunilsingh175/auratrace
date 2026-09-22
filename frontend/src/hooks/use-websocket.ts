"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface LogEvent {
  id?: string;
  service_id: string;
  timestamp: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
  latency_ms?: number;
  error_type?: string;
  message?: string;
  log_message?: string;
  stack_trace?: string;
  raw_stack_trace?: string;
  anomaly_score?: number;
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

function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname || "localhost";
    const port = process.env.NEXT_PUBLIC_WS_PORT || "8000";
    return `${protocol}//${host}:${port}/ws/telemetry`;
  }
  return "ws://localhost:8000/ws/telemetry";
}

export function useWebSocket(onAnomalyAlert?: (alert: AnomalyAlertEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertCallbackRef = useRef(onAnomalyAlert);

  alertCallbackRef.current = onAnomalyAlert;

  // Initial fetch of recent telemetry logs from Redis stream
  useEffect(() => {
    let active = true;
    async function loadRecent() {
      try {
        const res = await fetch("/api/aura?path=telemetry/recent", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && active && data.length > 0) {
            setLogs((prev) => {
              const existingIds = new Set(prev.map((l) => l.id || l.timestamp));
              const newItems = data.filter((item: LogEvent) => !existingIds.has(item.id || item.timestamp));
              return [...prev, ...newItems].slice(0, 300);
            });
          }
        }
      } catch (err) {
        // Fallback gracefully to live stream
      }
    }
    loadRecent();
    return () => {
      active = false;
    };
  }, []);

  const connect = useCallback(() => {
    const wsUrl = getWsUrl();
    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        console.log("[Trace] Connected to Live WebSocket Stream:", wsUrl);

        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send("ping");
          }
        }, 15000);
      };

      socket.onmessage = (event) => {
        try {
          if (event.data === "pong") return;
          const payload = JSON.parse(event.data);
          const alertData = payload.data || payload;

          if (payload.type === "TELEMETRY_LOG" && payload.data) {
            setLogs((prev) => [payload.data, ...prev].slice(0, 300));
          } else if (
            payload.type === "ANOMALY_ALERT" ||
            payload.type === "ANOMALY_DETECTED" ||
            payload.type === "INCIDENT_DIAGNOSED"
          ) {
            if (alertCallbackRef.current) {
              alertCallbackRef.current(alertData);
            }
          } else if (payload.service_id && payload.timestamp) {
            setLogs((prev) => [payload, ...prev].slice(0, 300));
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
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
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const clearLogs = () => setLogs([]);

  return { isConnected, logs, clearLogs };
}
