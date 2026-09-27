'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, FileCode, Target, Search, GitPullRequest, Sparkles } from 'lucide-react';
import { api, IncidentDetail } from '@/lib/api';
import { StatusBadge } from '../../page';

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      api
        .getIncident(id)
        .then(setIncident)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="text-sm text-gray-400 py-16 text-center">Loading incident details...</div>;
  if (!incident) return <div className="text-sm text-red-600 py-16 text-center">Incident not found</div>;

  // Safe parsing for diagnosis JSON string or object
  let diag: any = {};
  if (incident.diagnosis) {
    if (typeof incident.diagnosis === 'object') {
      diag = incident.diagnosis;
    } else if (typeof incident.diagnosis === 'string') {
      try {
        diag = JSON.parse(incident.diagnosis);
      } catch (e) {
        console.error('Failed to parse diagnosis:', e);
      }
    }
  }

  const whatHappened = diag.what_happened;
  const rootCause = diag.root_cause || (incident as any).root_cause;
  const suggestedFix = incident.suggested_fix || incident.suggested_patch || diag.suggested_fix || diag.suggested_patch;
  const fixExplanation = incident.fix_explanation || diag.fix_explanation;

  let similarIncidents = diag.similar_incidents || (incident as any).similar_incidents || [];
  if (typeof similarIncidents === 'string') {
    try {
      similarIncidents = JSON.parse(similarIncidents);
    } catch {
      similarIncidents = [];
    }
  }

  const copyFix = () => {
    if (suggestedFix) {
      navigator.clipboard.writeText(suggestedFix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl">
      <Link
        href="/incidents"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to incidents
      </Link>

      <header className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{incident.error_type}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {incident.service_name} · {incident.environment || 'production'}
          </p>
        </div>
        <StatusBadge status={incident.status} />
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Metric label="Severity" value={incident.severity} />
        <Metric label="Anomaly Score" value={(incident.anomaly_score || 0).toFixed(2)} />
        <Metric
          label="Fix Confidence"
          value={incident.fix_confidence ? `${(incident.fix_confidence * 100).toFixed(0)}%` : 'N/A'}
        />
        <Metric label="Occurrences" value={incident.event_count || 1} />
      </div>

      <Card title="Error Message">
        <p className="text-sm text-gray-800">{incident.error_message}</p>
      </Card>

      {incident.stack_trace && (
        <Card title="Stack Trace">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-80">
            {incident.stack_trace}
          </pre>
        </Card>
      )}

      {whatHappened && (
        <Card title="What Happened" icon={<FileCode className="w-4 h-4 text-blue-600" />}>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {whatHappened}
          </p>
        </Card>
      )}

      {rootCause && (
        <Card title="Root Cause" icon={<Target className="w-4 h-4 text-red-600" />}>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {rootCause}
          </p>
        </Card>
      )}

      {(suggestedFix || fixExplanation) && (
        <Card
          title="AI Suggested Fix & Remediation"
          icon={<Sparkles className="w-4 h-4 text-amber-500" />}
          action={
            suggestedFix ? (
              <button
                onClick={copyFix}
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Patch
                  </>
                )}
              </button>
            ) : null
          }
        >
          {fixExplanation && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
              {fixExplanation}
            </p>
          )}
          {suggestedFix && (
            <pre className="bg-gray-900 text-green-300 p-4 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-80">
              {suggestedFix}
            </pre>
          )}
        </Card>
      )}

      {similarIncidents && similarIncidents.length > 0 && (
        <Card
          title={`Similar Past Incidents (${similarIncidents.length})`}
          icon={<Search className="w-4 h-4 text-indigo-600" />}
        >
          <div className="space-y-2">
            {similarIncidents.map((s: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100"
              >
                <div>
                  <p className="text-sm font-medium">{s.error_type || 'Known Crash'}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {s.id ? s.id.slice(0, 8) : `Match #${i + 1}`}
                  </p>
                </div>
                <span className="text-sm text-blue-600 font-medium tabular-nums">
                  {s.similarity !== undefined ? `${(s.similarity * 100).toFixed(0)}% match` : 'High match'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {incident.pr_url && (
        <Card title="Pull Request" icon={<GitPullRequest className="w-4 h-4 text-purple-600" />}>
          <a
            href={incident.pr_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 underline break-all font-mono"
          >
            {incident.pr_url}
          </a>
          {incident.ci_status && (
            <p className="text-xs text-gray-500 mt-2">
              CI Status: <span className="font-medium">{incident.ci_status}</span>
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function Card({
  title,
  children,
  icon,
  action,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="card p-5 mb-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3.5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-base font-semibold capitalize">{value}</p>
    </div>
  );
}
