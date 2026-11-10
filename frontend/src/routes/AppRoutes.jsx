import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkBackendHealth } from '../services/api';
import { AuthenticatedLayout, PublicLayout } from '../layouts';
import { Card } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import AuthModal from '../components/AuthModal';
import TripsDashboard from '../components/TripsDashboard';
import TripWorkspace from '../components/TripWorkspace';
import {
  DashboardPage,
  ExplorePage,
  DestinationDetailPage,
  LoginPage,
  RegisterPage,
  ProfilePage,
  SettingsPage,
  NotFoundPage
} from '../pages';
import {
  Activity,
  Database,
  Cpu,
  ShieldCheck,
  Sparkles,
  LogIn,
  Compass,
  ArrowRight
} from 'lucide-react';

export function ArchitectureCards({ backendStatus = 'online' }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Frontend Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Activity className="w-5 h-5" />
            </span>
            <Badge variant="success">Ready</Badge>
          </div>
          <h3 className="text-lg font-bold font-heading text-main">Frontend Client</h3>
          <p className="text-xs text-muted mt-1 mb-4">React + Vite + Tailwind CSS</p>
          <div className="text-xs font-mono text-muted space-y-1">
            <div>Port: 5173</div>
            <div>Auth Context: Active</div>
            <div>Design System: Phase 1 & 2</div>
          </div>
        </Card>

        {/* Backend Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Database className="w-5 h-5" />
            </span>
            <Badge
              variant={
                backendStatus === 'online'
                  ? 'success'
                  : backendStatus === 'offline'
                  ? 'warning'
                  : 'default'
              }
            >
              {backendStatus.toUpperCase()}
            </Badge>
          </div>
          <h3 className="text-lg font-bold font-heading text-main">Backend Monolith</h3>
          <p className="text-xs text-muted mt-1 mb-4">Node.js + Express (ES Modules)</p>
          <div className="text-xs font-mono text-muted space-y-1">
            <div>Port: 5000</div>
            <div>Auth: JWT + HTTP-Only Cookies</div>
            <div>
              Docs:{' '}
              <a
                href="http://localhost:5000/api/docs"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                /api/docs
              </a>
            </div>
          </div>
        </Card>

        {/* Intelligence Service Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
              <Cpu className="w-5 h-5" />
            </span>
            <Badge variant="accent">Stateless</Badge>
          </div>
          <h3 className="text-lg font-bold font-heading text-main">Intelligence Engine</h3>
          <p className="text-xs text-muted mt-1 mb-4">Python + FastAPI</p>
          <div className="text-xs font-mono text-muted space-y-1">
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
        </Card>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 text-sm text-muted flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span>
            Collaborative Planning & Intelligence Architecture:{' '}
            <code className="text-main font-semibold">Trip Engine</code>,{' '}
            <code className="text-main font-semibold">FastAPI Planning</code>,{' '}
            <code className="text-main font-semibold">Role ACL</code>.
          </span>
        </div>
        <span className="text-xs font-mono text-muted">Zero Redis &bull; No Bloat</span>
      </div>
    </div>
  );
}

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

// Adaptive layout for semi-public pages (Explore, DestinationDetail)
function AdaptiveLayout({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
  }

  return (
    <PublicLayout onSignInClick={() => setIsAuthModalOpen(true)}>
      {children}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </PublicLayout>
  );
}

// Public Landing Page (preserves test selectors & hero)
function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState('checking');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    checkBackendHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PublicLayout onSignInClick={() => setIsAuthModalOpen(true)}>
      {/* Hero Guest Welcome Card */}
      <Card className="p-8 text-center space-y-4 border-primary/20 bg-gradient-to-b from-card to-card-muted/60 shadow-md">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-xs">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold font-heading text-main tracking-tight">
            Trip Planning & Group Collaboration Engine
          </h2>
          <p className="text-xs md:text-sm text-muted max-w-lg mx-auto leading-relaxed">
            Sign in or create an account to create multimodal travel itineraries, invite participants with role-based access, and synthesize daily plans using FastAPI.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            size="md"
            variant="primary"
            onClick={() => setIsAuthModalOpen(true)}
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            Sign In / Register
          </Button>

          <Button
            size="md"
            variant="outline"
            onClick={() => navigate('/explore')}
            leftIcon={<Compass className="w-4 h-4 text-primary" />}
          >
            Explore Destinations
          </Button>
        </div>
      </Card>

      {/* Foundational Architecture Status Cards */}
      <ArchitectureCards backendStatus={backendStatus} />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </PublicLayout>
  );
}

export default function AppRoutes() {
  const [backendStatus, setBackendStatus] = useState('online');

  useEffect(() => {
    checkBackendHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Adaptive discovery routes */}
      <Route
        path="/explore"
        element={
          <AdaptiveLayout>
            <ExplorePage />
          </AdaptiveLayout>
        }
      />
      <Route
        path="/destinations/:id"
        element={
          <AdaptiveLayout>
            <DestinationDetailPage />
          </AdaptiveLayout>
        }
      />

      {/* Authenticated routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips"
        element={
          <ProtectedRoute>
            <TripsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips/:tripId"
        element={
          <ProtectedRoute>
            <TripWorkspace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/architecture"
        element={
          <ProtectedRoute>
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold font-heading text-main">Architecture Blueprint</h1>
                <p className="text-xs text-muted">Core service status and decoupled monolith overview</p>
              </div>
              <ArchitectureCards backendStatus={backendStatus} />
            </div>
          </ProtectedRoute>
        }
      />

      {/* 404 Catch-All */}
      <Route
        path="*"
        element={
          <AdaptiveLayout>
            <NotFoundPage />
          </AdaptiveLayout>
        }
      />
    </Routes>
  );
}

