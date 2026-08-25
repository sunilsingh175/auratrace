"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [incList, sysStats] = await Promise.all([
      fetchIncidents({ limit: 50 }),
      fetchSystemStats(),
    ]);
    setIncidents(incList);
    setStats(sysStats);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, pollIntervalMs);
    return () => clearInterval(interval);
  }, [loadData, pollIntervalMs]);

  return { incidents, stats, loading, refresh: loadData };
}
