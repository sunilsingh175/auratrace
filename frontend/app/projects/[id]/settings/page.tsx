'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Check, AlertTriangle, GitBranch, ArrowLeft } from 'lucide-react';
import { api, Project } from '@/lib/api';

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [original, setOriginal] = useState<Project | null>(null);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (id) {
      api
        .getProject(id)
        .then((data) => {
          const clean = {
            ...data,
            github_repo: data.github_repo || '',
          };
          setProject(clean);
          setOriginal(clean);
        })
        .catch(console.error);
    }
  }, [id]);

  const hasChanges = Boolean(
    original &&
      project &&
      (project.auto_repair_enabled !== original.auto_repair_enabled ||
        project.auto_merge_enabled !== original.auto_merge_enabled ||
        (project.github_repo || '').trim() !== (original.github_repo || '').trim() ||
        token.trim() !== '')
  );

  const save = async () => {
    if (!project || !original || !hasChanges) return;
    setSaving(true);
    try {
      const payload: any = {
        auto_repair_enabled: project.auto_repair_enabled,
        auto_merge_enabled: project.auto_merge_enabled,
      };

      if (project.github_repo && project.github_repo.trim() !== '') {
        payload.github_repo = project.github_repo.trim();
      }

      await api.updateProject(id!, payload);
      setSaved(true);
      setOriginal({ ...project });
      setToken('');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!project) return <div className="text-sm text-gray-400 py-16 text-center">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Auto-Repair Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Control how AuraTrace fixes issues automatically</p>
      </header>

      <div className="card p-6 mb-6">
        <div className="space-y-4">
          <Toggle
            label="Auto-Repair"
            desc="Generate fix patches and create pull requests automatically"
            value={project.auto_repair_enabled}
            onChange={(v) => setProject({ ...project, auto_repair_enabled: v })}
          />

          <Toggle
            label="Auto-Merge and Deploy"
            desc="Merge PRs and deploy if all tests pass"
            value={project.auto_merge_enabled}
            onChange={(v) => setProject({ ...project, auto_merge_enabled: v })}
            danger
          />

          {project.auto_merge_enabled && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <strong className="font-semibold">Warning:</strong> AuraTrace will merge and
                deploy without human review. The regression guard auto-reverts within 20
                minutes if errors increase.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold">GitHub Integration</h2>
        </div>

        <label className="block text-sm font-medium mb-1.5">Repository</label>
        <input
          type="text"
          value={project.github_repo || ''}
          onChange={(e) => setProject({ ...project, github_repo: e.target.value })}
          placeholder="your-org/your-repo"
          className="input"
        />

        <label className="block text-sm font-medium mb-1.5 mt-4">Personal Access Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          className="input"
        />
        <p className="text-xs text-gray-500 mt-2">
          Leave empty to keep the existing token. Tokens are encrypted with AES-256 before storage.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={saving || !hasChanges}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            saving || !hasChanges
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-200'
              : 'btn-primary'
          }`}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <Check className="w-4 h-4" />
            Settings saved
          </span>
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  desc,
  value,
  onChange,
  danger,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 pr-4">
        <p className="font-medium text-gray-900 text-sm">{label}</p>
        <p className={`text-xs mt-0.5 ${danger ? 'text-red-600' : 'text-gray-500'}`}>{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          value ? 'bg-red-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
