"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export interface LiveNotification {
  id: string;
  title: string;
  message: string;
  service_id?: string;
  type: "critical" | "warning" | "info" | "success";
  timestamp: string;
  read: boolean;
  link?: string;
}

interface NotificationContextType {
  notifications: LiveNotification[];
  unreadCount: number;
  isConnected: boolean;
  latestToast: LiveNotification | null;
  dismissToast: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notification: Omit<LiveNotification, "id" | "timestamp" | "read">) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<LiveNotification[]>([
    {
      id: "init-1",
      title: "Diagnostics Engine Live",
      message: "Streaming pipeline connected: Redis Stream → pgvector → AI Doctor",
      type: "success",
      timestamp: new Date().toISOString(),
      read: false,
      link: "/dashboard",
    },
    {
      id: "init-2",
      title: "Isolation Forest Active",
      message: "Real-time outlier detection model active with 0.05 contamination rate",
      type: "info",
      timestamp: new Date(Date.now() - 60000).toISOString(),
      read: false,
      link: "/telemetry",
    },
  ]);

  const [isConnected, setIsConnected] = useState(false);
  const [latestToast, setLatestToast] = useState<LiveNotification | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addNotification = useCallback(
    (item: Omit<LiveNotification, "id" | "timestamp" | "read">) => {
      const newNotification: LiveNotification = {
        ...item,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
      setLatestToast(newNotification);

      // Auto dismiss toast after 5 seconds
      setTimeout(() => {
        setLatestToast((curr) => (curr?.id === newNotification.id ? null : curr));
      }, 5000);
    },
    []
  );

  const connectWebSocket = useCallback(() => {
    if (typeof window === "undefined") return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NEXT_PUBLIC_WS_HOST || window.location.hostname;
    const port = process.env.NEXT_PUBLIC_WS_PORT || "8000";
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      `${protocol}//${host}:${port}/ws/telemetry`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log("[AuraTrace] Real-time notification socket connected.");
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const data = raw.data || raw;
          const eventType = raw.type || raw.event;

          if (
            eventType === "ANOMALY_ALERT" ||
            eventType === "ANOMALY_DETECTED" ||
            eventType === "anomaly"
          ) {
            const score = data.anomaly_score ? Math.round(data.anomaly_score * 100) : 80;
            const service = data.service_id || "hdfs-service";
            const errType = data.error_type || data.title || "Anomaly Detected";

            addNotification({
              title: `Critical Anomaly in ${service}`,
              message: `${errType} flagged with ${score}% outlier score.`,
              service_id: service,
              type: "critical",
              link: data.incident_id ? `/incidents/${data.incident_id}` : "/incidents",
            });
          } else if (eventType === "INCIDENT_DIAGNOSED") {
            const service = data.service_id || "backend";
            addNotification({
              title: `AI Diagnosis Ready: ${service}`,
              message: "Gemini RAG generated root-cause analysis and recovery patch.",
              service_id: service,
              type: "success",
              link: data.incident_id ? `/incidents/${data.incident_id}` : "/incidents",
            });
          } else if (data.level === "ERROR" || data.level === "CRITICAL") {
            addNotification({
              title: `Error Captured from ${data.service_id || "Service"}`,
              message: data.message?.slice(0, 100) || "Exception trace ingested.",
              service_id: data.service_id,
              type: "warning",
              link: "/telemetry",
            });
          }
        } catch (err) {
          // Parse error ignore
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(connectWebSocket, 4000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(connectWebSocket, 4000);
    }
  }, [addNotification]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const dismissToast = () => {
    setLatestToast(null);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        latestToast,
        dismissToast,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
