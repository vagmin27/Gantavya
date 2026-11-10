import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';
import { LogIn, AlertCircle, Compass, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-main flex flex-col justify-between p-4 sm:p-8 transition-colors">
      {/* Top Bar with Brand & Theme Toggle */}
      <header className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <Link to="/" className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-black text-white text-lg shadow-sm font-heading">
            G
          </span>
          <span className="font-extrabold text-xl tracking-tight font-heading text-main">
            Gantavya
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Login Form Container */}
      <main className="w-full max-w-md mx-auto my-12 animate-in zoom-in-95 duration-200">
        <Card className="p-8 shadow-xl border-border space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <LogIn className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold font-heading text-main tracking-tight">
              Sign In to Gantavya
            </h1>
            <p className="text-xs text-muted">
              Enter your credentials to access your multimodal trips and workspace
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="explorer@gantavya.io"
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full"
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </div>
          </form>

          <div className="pt-4 border-t border-border text-center text-xs text-muted">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Create an Account
            </Link>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted py-4">
        Enterprise Reliability &bull; Stateless FastAPI &bull; MongoDB Atlas
      </footer>
    </div>
  );
}

