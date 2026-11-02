import React, { useState, useEffect } from 'react';
import { checkBackendHealth } from './services/api';
import { ShieldCheck, Activity, Cpu, Database } from 'lucide-react';

export default function App() {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [backendInfo, setBackendInfo] = useState(null);

  useEffect(() => {
    checkBackendHealth()
      .then((res) => {
        setBackendStatus('online');
        setBackendInfo(res.data);
      })
      .catch(() => {
        setBackendStatus('offline');
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-6 md:p-12">
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span className="p-2 bg-sky-500 rounded-lg text-slate-900 font-black text-xl">G</span>
            Gantavya
          </h1>
          <p className="text-slate-400 text-sm mt-1">Travel Intelligence Platform &bull; Architecture Foundation</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Milestone 1 Active</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full my-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Frontend Card */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 bg-sky-500/10 text-sky-400 rounded-lg">
                <Activity className="w-5 h-5" />
              </span>
              <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-medium">Ready</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Frontend Client</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">React + Vite + Tailwind CSS</p>
            <div className="text-xs font-mono text-slate-300 space-y-1">
              <div>Port: 5173</div>
              <div>Test Suite: Vitest + RTL</div>
              <div>Auth Cookie: HTTP-Only Ready</div>
            </div>
          </div>

          {/* Backend Card */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Database className="w-5 h-5" />
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                backendStatus === 'online' ? 'bg-emerald-500/10 text-emerald-400' :
                backendStatus === 'offline' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-300'
              }`}>
                {backendStatus.toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">Backend Monolith</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">Node.js + Express (ES Modules)</p>
            <div className="text-xs font-mono text-slate-300 space-y-1">
              <div>Port: 5000</div>
              <div>Database: MongoDB Primary</div>
              <div>Docs: <a href="http://localhost:5000/api/docs" target="_blank" rel="noreferrer" className="text-sky-400 underline">/api/docs</a></div>
            </div>
          </div>

          {/* Intelligence Service Card */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 bg-purple-500/10 text-purple-400 rounded-lg">
                <Cpu className="w-5 h-5" />
              </span>
              <span className="text-xs px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-full font-medium">Stateless</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Intelligence Engine</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">Python + FastAPI</p>
            <div className="text-xs font-mono text-slate-300 space-y-1">
              <div>Port: 8000</div>
              <div>Data Store: None (Stateless)</div>
              <div>Docs: <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="text-purple-400 underline">/docs</a></div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-slate-800/30 border border-slate-800 rounded-xl p-6 text-sm text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Foundational modules initialized: <code className="text-slate-200">health</code>, <code className="text-slate-200">auth</code>, <code className="text-slate-200">users</code>.</span>
          </div>
          <span className="text-xs font-mono text-slate-500">Zero Redis &bull; No Bloat</span>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto w-full border-t border-slate-800 pt-6 text-xs text-slate-500 flex justify-between">
        <span>Gantavya Project &bull; Architectural Blueprint Milestone 1</span>
        <span>Environment: Development</span>
      </footer>
    </div>
  );
}

