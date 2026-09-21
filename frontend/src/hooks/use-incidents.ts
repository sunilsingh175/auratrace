"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchIncidents,
  fetchSystemStats,
  Incident,
  SystemStats,
} from "@/lib/api-client";

export function useIncidents(pollIntervalMs: number = 5000) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    total_logs_ingested: 0,
    ingestion_rate_per_sec: 0,
    error_rate_percent: 0,
    p95_latency_ms: 0,
    open_incidents_count: 0,
    active_services_count: 0,
  });
  const [loading, setLoading] = useState(false);
  const isInitialMount = useRef(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const minWait = new Promise((resolve) => setTimeout(resolve, 400));
    try {
      const [incList, sysStats] = await Promise.all([
        fetchIncidents({ limit: 50 }).catch(() => []),
        fetchSystemStats().catch(() => ({
          total_logs_ingested: 0,
          ingestion_rate_per_sec: 0,
          error_rate_percent: 0,
          p95_latency_ms: 0,
          open_incidents_count: 0,
          active_services_count: 0,
        })),
        minWait,
      ]);
      setIncidents(incList);
      setStats(sysStats);
    } catch (err) {
      console.warn("Failed to load incidents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      void loadData();
    }
    const interval = setInterval(() => {
      void loadData();
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [loadData, pollIntervalMs]);

  return { incidents, stats, loading, refresh: loadData };
}

