'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ArrowRight,
  Inbox,
  Terminal,
  Settings,
} from 'lucide-react';
import { api, Incident, storage } from '@/lib/api';

export default function Home() {
  const [health, setHealth] = useState<any>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.health().then(setHealth).catch(console.error);
    const pid = storage.getProjectId();
    setProjectId(pid);
    if (pid) fetchIncidents(pid);
  }, []);

  const fetchIncidents = async (pid: string) => {
    try {
      const data = await api.listIncidents(pid);
      setIncidents(data.incidents);
    } catch {}
  };

  const createProject = async () => {
    if (!projectName.trim()) return;
    setCreating(true);
    try {
      const project = await api.createProject(projectName, 'dev@example.com');
      storage.setProjectId(project.id);
      if (project.api_key) storage.setApiKey(project.api_key);
      setProjectId(project.id);
      await fetchIncidents(project.id);
    } finally {
      setCreating(false);
    }
  };

  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;
  const activeCount = incidents.filter((i) => i.status !== 'resolved').length;
  const fixedCount = incidents.filter((i) =>
    ['merged', 'resolved', 'auto_merged'].includes(i.status)
  ).length;

  return (
    <div>
      <header className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time observability and autonomous repair
          </p>
        </div>
        {projectId && (
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}/setup`}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Terminal className="w-4 h-4" />
              Setup Guide
            </Link>
            <Link
              href={`/projects/${projectId}/settings`}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Settings className="w-4 h-4" />
              Auto-Repair Settings
            </Link>
          </div>
        )}
      </header>

      {!projectId && (
        <div className="card p-6 max-w-lg mb-6">
          <h2 className="text-base font-semibold mb-1">Create your first project</h2>
          <p className="text-sm text-gray-500 mb-4">
            Get an API key and start capturing crashes in seconds.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-app"
              className="input"
              onKeyDown={(e) => e.key === 'Enter' && createProject()}
            />
            <button onClick={createProject} disabled={creating} className="btn-primary whitespace-nowrap">
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {projectId && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="API Status"
              value={health?.status === 'ok' ? 'Online' : 'Checking'}
              tone={health?.status === 'ok' ? 'success' : 'warning'}
              icon={<Activity className="w-4 h-4" />}
            />
            <StatCard
              label="Critical"
              value={criticalCount}
              tone={criticalCount > 0 ? 'danger' : 'success'}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <StatCard
              label="Active"
              value={activeCount}
              tone="warning"
              icon={<Zap className="w-4 h-4" />}
            />
            <StatCard
              label="Auto-Fixed"
              value={fixedCount}
              tone="success"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
          </div>

          <div className="card">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold">Recent Incidents</h2>
              <Link
                href="/incidents"
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {incidents.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No incidents yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Send a crash via SDK or API to see it here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {incidents.slice(0, 5).map((inc) => (
                  <IncidentRow key={inc.id} incident={inc} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  tone: 'success' | 'warning' | 'danger';
  icon: React.ReactNode;
}) {
  const colors = {
    success: 'text-green-600 bg-green-50',
    warning: 'text-amber-600 bg-amber-50',
    danger: 'text-red-600 bg-red-50',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colors[tone]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function IncidentRow({ incident }: { incident: Incident }) {
  const severityStyles: Record<string, string> = {
    critical: 'bg-red-50 text-red-700 border-red-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <Link
      href={`/incidents/${incident.id}`}
      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{incident.error_type}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${
              severityStyles[incident.severity] || severityStyles.low
            }`}
          >
            {incident.severity}
          </span>
        </div>
        <p className="text-sm text-gray-500 truncate">
          {incident.service_name} · {incident.error_message?.slice(0, 80)}
        </p>
      </div>
      <div className="text-right ml-4 flex-shrink-0">
        <StatusBadge status={incident.status} />
        <p className="text-xs text-gray-400 mt-1">
          {new Date(incident.last_seen).toLocaleString()}
        </p>
      </div>
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: 'bg-gray-100 text-gray-700',
    detecting: 'bg-amber-100 text-amber-700',
    diagnosing: 'bg-blue-100 text-blue-700',
    fix_ready: 'bg-purple-100 text-purple-700',
    pr_created: 'bg-indigo-100 text-indigo-700',
    merged: 'bg-green-100 text-green-700',
    auto_merged: 'bg-green-100 text-green-700',
    resolved: 'bg-green-100 text-green-700',
    reverted: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-md font-medium ${
        map[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
