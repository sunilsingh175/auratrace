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
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);

  const [isConnected, setIsConnected] = useState(false);
  const [latestToast, setLatestToast] = useState<LiveNotification | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addNotification = useCallback(
    (item: Omit<LiveNotification, "id" | "timestamp" | "read">) => {
      setNotifications((prev) => {
        const now = Date.now();
        // Deduplicate: if same link or same (title + service_id) was added within 15 seconds, skip duplicate
        const isDuplicate = prev.some((n) => {
          const timeDiff = now - new Date(n.timestamp).getTime();
          if (timeDiff < 15000) {
            if (item.link && n.link && item.link === n.link) return true;
            if (n.title === item.title && n.service_id === item.service_id) return true;
          }
          return false;
        });

        if (isDuplicate) {
          return prev;
        }

        const newNotification: LiveNotification = {
          ...item,
          id: `notif-${now}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
          read: false,
        };

        setLatestToast(newNotification);

        // Auto dismiss toast after 5 seconds
        setTimeout(() => {
          setLatestToast((curr) => (curr?.id === newNotification.id ? null : curr));
        }, 5000);

        return [newNotification, ...prev].slice(0, 50);
      });
    },
    []
  );

  const connectWebSocket = useCallback(() => {
    if (typeof window === "undefined") return;

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

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
        console.log("[Trace] Real-time notification socket connected.");
      };

      ws.onmessage = (event) => {
        try {
          if (event.data === "pong") return;
          const raw = JSON.parse(event.data);
          const data = raw.data || raw;
          const eventType = raw.type || raw.event;

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("aura:telemetry_event", {
                detail: { type: eventType, data },
              })
            );
            if (eventType === "INCIDENT_DIAGNOSED") {
              window.dispatchEvent(
                new CustomEvent("aura:incident_diagnosed", { detail: data })
              );
            }
          }

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
              link: data.incident_id ? `/incidents/${data.incident_id}` : "/incidents",
            });
          }
        } catch (err) {
          // Parse error ignore
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(connectWebSocket, 4000);
      };

      ws.onerror = () => {
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      };
    } catch (e) {
      wsRef.current = null;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(connectWebSocket, 4000);
    }
  }, [addNotification]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
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
