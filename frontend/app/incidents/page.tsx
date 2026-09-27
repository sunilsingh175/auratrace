'use client';

import { useEffect, useState } from 'react';
import { Inbox, Search } from 'lucide-react';
import { api, Incident, storage } from '@/lib/api';
import { IncidentRow } from '../page';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'detecting', label: 'Detecting' },
  { key: 'fix_ready', label: 'Fix Ready' },
  { key: 'pr_created', label: 'PR Created' },
  { key: 'merged', label: 'Merged' },
  { key: 'resolved', label: 'Resolved' },
];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pid = storage.getProjectId();
    if (!pid) { setLoading(false); return; }
    loadIncidents(pid, filter);
  }, [filter]);

  const loadIncidents = async (pid: string, status: string) => {
    setLoading(true);
    try {
      const data = await api.listIncidents(pid, status === 'all' ? undefined : status);
      setIncidents(data.incidents);
    } finally {
      setLoading(false);
    }
  };

  const filtered = incidents.filter(
    (i) =>
      !search ||
      i.error_type?.toLowerCase().includes(search.toLowerCase()) ||
      i.service_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Auto-detected crashes and anomalies
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-subtle)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incidents..."
            className="input pl-9 bg-[var(--bg-muted)] border-transparent focus:bg-white"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition ${
              filter === f.key
                ? 'bg-[var(--accent)] text-white'
                : 'bg-white border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-sm text-[var(--text-subtle)]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-muted)] flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-5 h-5 text-[var(--text-subtle)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)]">No incidents match</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((inc) => (
              <IncidentRow key={inc.id} incident={inc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
