import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ThemeToggle from '../components/ui/ThemeToggle';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
  Cpu,
  Database,
  LogOut,
  Sliders,
  CheckCircle2
} from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Settings Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-card-muted via-card to-card border border-border p-6 md:p-8 shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-primary font-semibold">
            <Sliders className="w-4 h-4" />
            <span>Preferences & System Control</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-main tracking-tight">
            Application Settings
          </h1>
          <p className="text-xs md:text-sm text-muted max-w-xl">
            Configure visual themes, inspect your architecture session parameters, and manage account state.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Body (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appearance & Themes */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold font-heading text-main">Interface Theme</h2>
                <p className="text-xs text-muted mt-0.5">
                  Select your preferred color theme across the entire application workspace.
                </p>
              </div>
              <ThemeToggle />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {[
                {
                  id: 'light',
                  label: 'Light Mode',
                  icon: Sun,
                  desc: 'Clean, high-contrast crisp surfaces (#F7F9FC)'
                },
                {
                  id: 'dark',
                  label: 'Dark Mode',
                  icon: Moon,
                  desc: 'Deep navy SaaS aesthetic (#090D16)'
                },
                {
                  id: 'system',
                  label: 'System Preference',
                  icon: Laptop,
                  desc: 'Synchronizes with operating system scheme'
                }
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`p-4 rounded-2xl border text-left transition-all space-y-2 ${
                      isSelected
                        ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                        : 'bg-card border-border hover:border-primary/40 hover:bg-card-muted/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`p-2 rounded-xl ${isSelected ? 'bg-primary text-white' : 'bg-card-muted text-muted'}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold font-heading text-main">{opt.label}</div>
                      <div className="text-[11px] text-muted mt-0.5">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Architecture & Infrastructure Status */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h2 className="text-base font-bold font-heading text-main">
                Architecture Blueprint & Reliability
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-card-muted/60 border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-primary" />
                  <div>
                    <span className="font-bold text-main">Persistence Engine:</span>
                    <span className="text-muted ml-1.5">MongoDB Atlas (Zero Redis Invariant)</span>
                  </div>
                </div>
                <Badge variant="success" size="sm">Active</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-card-muted/60 border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <div>
                    <span className="font-bold text-main">Compute Engine:</span>
                    <span className="text-muted ml-1.5">Stateless FastAPI Intelligence Service</span>
                  </div>
                </div>
                <Badge variant="accent" size="sm">Stateless</Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Account Actions (1 col) */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold font-heading text-main">Account Session</h3>
            <p className="text-xs text-muted leading-relaxed">
              Logged in as <strong className="text-main">{user?.email}</strong>. Terminate your active browser session and revoke refresh tokens.
            </p>

            <Button
              variant="danger"
              size="md"
              className="w-full"
              onClick={logout}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Sign Out of Gantavya
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

