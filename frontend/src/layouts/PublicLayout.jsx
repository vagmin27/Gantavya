import React from 'react';
import ThemeToggle from '../components/ui/ThemeToggle';
import Button from '../components/ui/Button';
import { LogIn, ShieldCheck } from 'lucide-react';

export default function PublicLayout({ children, onSignInClick }) {
  return (
    <div className="min-h-screen bg-bg text-main flex flex-col justify-between transition-colors">
      {/* Public Top Navbar */}
      <header className="sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur-md border-b border-border px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-black text-white text-lg shadow-sm font-heading">
            G
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight font-heading text-main">
              Gantavya
            </h1>
            <p className="text-[10px] text-muted -mt-0.5">
              Intelligent Multimodal Travel Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {onSignInClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSignInClick}
              leftIcon={<LogIn className="w-3.5 h-3.5" />}
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 space-y-8">
        {children}
      </main>

      {/* Travel SaaS Footer */}
      <footer className="border-t border-border bg-surface/60 py-6 px-6 md:px-12 text-xs text-muted">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-main">Gantavya Platform</span>
            <span>&bull;</span>
            <span>Multimodal Travel Intelligence Engine</span>
          </div>

          <div className="flex items-center gap-4 text-muted">
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Enterprise Reliability &bull; Stateless FastAPI
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
