import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';
import { UserPlus, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({ name, email, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-main flex flex-col justify-between p-4 sm:p-8 transition-colors">
      {/* Top Bar */}
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

      {/* Main Container */}
      <main className="w-full max-w-md mx-auto my-12 animate-in zoom-in-95 duration-200">
        <Card className="p-8 shadow-xl border-border space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold font-heading text-main tracking-tight">
              Create an Account
            </h1>
            <p className="text-xs text-muted">
              Start planning collaborative journeys with AI-powered itinerary intelligence
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
              label="Full Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aarav Sharma"
              autoComplete="name"
            />

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
              autoComplete="new-password"
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full"
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Create Account
              </Button>
            </div>
          </form>

          <div className="pt-4 border-t border-border text-center text-xs text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign In
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

