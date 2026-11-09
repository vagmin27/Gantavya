import React, { useState, useEffect } from 'react';
import { checkBackendHealth } from './services/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import TripsDashboard from './components/TripsDashboard';
import {
  ShieldCheck,
  Activity,
  Cpu,
  Database,
  User,
  LogIn,
  LogOut,
  Compass,
  Sparkles,
  Layers
} from 'lucide-react';

function Dashboard() {
  const { user, profile, isAuthenticated, logout } = useAuth();
  const [backendStatus, setBackendStatus] = useState('checking');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('trips'); // 'trips' or 'architecture'

  useEffect(() => {
    checkBackendHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-6 md:p-12">
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span className="p-2 bg-sky-500 rounded-lg text-slate-900 font-black text-xl">G</span>
            Gantavya
          </h1>
          <p className="text-slate-400 text-sm mt-1">Intelligent Multimodal Travel Platform &bull; Milestone 2.3</p>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-white">{user.name}</div>
                <div className="text-[10px] text-slate-400">{user.email}</div>
              </div>
              <button
                onClick={logout}
                className="ml-2 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold text-xs rounded-xl transition-colors shadow-md"
            >
              <LogIn className="w-4 h-4" /> Sign In / Register
            </button>
          )}

          <div className="hidden md:flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Milestone 2.3 Active</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full my-8 space-y-8 flex-1">
        {/* User Session Banner if Logged In */}
        {isAuthenticated ? (
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-sky-950/40 via-slate-800/40 to-purple-950/30 border border-sky-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl">
                  <Compass className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    Welcome back, {user.name}
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded-full">
                      {user.role}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Plan trips, invite team members, and synthesize itineraries with the Python Intelligence Engine
                  </p>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700/60 text-xs">
                <button
                  onClick={() => setActiveTab('trips')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === 'trips'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" /> Trip Planner
                </button>
                <button
                  onClick={() => setActiveTab('architecture')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === 'architecture'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Architecture
                </button>
              </div>
            </div>

            {/* Active View */}
            {activeTab === 'trips' ? (
              <TripsDashboard />
            ) : null}
          </div>
        ) : (
          <div className="p-6 bg-slate-800/40 border border-slate-700/60 rounded-2xl text-center space-y-3 mb-6">
            <Sparkles className="w-8 h-8 text-sky-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Trip Planning & Group Collaboration Engine</h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Sign in or create an account to create multimodal travel itineraries, invite participants with role-based access, and synthesize daily plans using FastAPI.
            </p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="mt-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold text-xs rounded-xl transition-all shadow-lg"
            >
              Sign In to Start Planning
            </button>
          </div>
        )}

        {/* Foundational Architecture Status Cards (always shown for architecture verification) */}
        {(!isAuthenticated || activeTab === 'architecture') && (
          <div className="space-y-6">
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
                  <div>Auth Context: Active</div>
                  <div>Session: {isAuthenticated ? 'Authenticated' : 'Guest'}</div>
                </div>
              </div>

              {/* Backend Card */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <Database className="w-5 h-5" />
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      backendStatus === 'online'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : backendStatus === 'offline'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {backendStatus.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">Backend Monolith</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">Node.js + Express (ES Modules)</p>
                <div className="text-xs font-mono text-slate-300 space-y-1">
                  <div>Port: 5000</div>
                  <div>Auth: JWT + HTTP-Only Cookies</div>
                  <div>
                    Docs:{' '}
                    <a
                      href="http://localhost:5000/api/docs"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 underline"
                    >
                      /api/docs
                    </a>
                  </div>
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
                  <div>
                    Docs:{' '}
                    <a
                      href="http://localhost:8000/docs"
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 underline"
                    >
                      /docs
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-6 text-sm text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>
                  Collaborative Planning & Intelligence Architecture: <code className="text-slate-200">Trip Engine</code>, <code className="text-slate-200">FastAPI Planning</code>, <code className="text-slate-200">Role ACL</code>.
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500">Zero Redis &bull; No Bloat</span>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto w-full border-t border-slate-800 pt-6 text-xs text-slate-500 flex justify-between">
        <span>Gantavya Project &bull; Architectural Blueprint Milestone 2.3</span>
        <span>Environment: Development</span>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
