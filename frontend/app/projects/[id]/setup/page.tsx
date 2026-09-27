'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { storage } from '@/lib/api';

export default function SetupPage() {
  const [apiKey, setApiKey] = useState('');
  const [tab, setTab] = useState<'python' | 'node'>('python');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setApiKey(storage.getApiKey() || '');
  }, []);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const installCmd = tab === 'python' ? 'pip install auratrace-sdk' : 'npm install @auratrace/node';

  const initCode = tab === 'python'
    ? `from auratrace import init\n\ninit(api_key="${apiKey}")`
    : `const auratrace = require('@auratrace/node');\n\nauratrace.init({ apiKey: '${apiKey}' });`;

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <h1 className="text-2xl font-bold mb-1">Setup Guide</h1>
      <p className="text-sm text-gray-500 mb-6">3 steps to start capturing crashes.</p>

      {/* Step 1: API Key */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">1</span>
          <h2 className="text-sm font-semibold">Your API Key</h2>
        </div>
        <div className="flex gap-2">
          <code className="flex-1 bg-gray-50 border border-gray-200 p-2.5 rounded-md text-xs font-mono overflow-x-auto">
            {apiKey}
          </code>
          <button
            onClick={() => copy(apiKey, 'key')}
            className="px-3 py-2 bg-gray-900 hover:bg-black text-white rounded-md text-xs font-medium flex items-center gap-1.5"
          >
            {copied === 'key' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied === 'key' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Step 2: Install */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">2</span>
          <h2 className="text-sm font-semibold">Install the SDK</h2>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab('python')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${tab === 'python' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
          >
            Python
          </button>
          <button
            onClick={() => setTab('node')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${tab === 'node' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
          >
            Node.js
          </button>
        </div>

        <div className="flex gap-2">
          <code className="flex-1 bg-gray-900 text-gray-100 p-3 rounded-md text-xs font-mono">
            {installCmd}
          </code>
          <button
            onClick={() => copy(installCmd, 'install')}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium flex items-center gap-1.5"
          >
            {copied === 'install' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Step 3: Initialize */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">3</span>
          <h2 className="text-sm font-semibold">Add to your app</h2>
        </div>

        <div className="flex gap-2">
          <pre className="flex-1 bg-gray-900 text-gray-100 p-3 rounded-md text-xs font-mono overflow-x-auto">
            {initCode}
          </pre>
          <button
            onClick={() => copy(initCode, 'init')}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium flex items-center gap-1.5 h-fit"
          >
            {copied === 'init' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          That&apos;s it. Every crash is now captured automatically.
        </p>
      </div>

      <div className="text-center text-xs text-gray-400 mt-6">
        Need more? <a href="http://localhost:8000/docs" target="_blank" className="text-red-600 hover:underline">API docs</a>
      </div>
    </div>
  );
}
