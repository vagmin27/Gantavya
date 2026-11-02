import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, X, AlertCircle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegisterMode) {
        await register(formData);
      } else {
        await login({ email: formData.email, password: formData.password });
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
          <button
            onClick={() => {
              setIsRegisterMode(false);
              setError(null);
            }}
            className={`flex items-center gap-2 pb-2 text-sm font-semibold transition-colors ${
              !isRegisterMode
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
          <button
            onClick={() => {
              setIsRegisterMode(true);
              setError(null);
            }}
            className={`flex items-center gap-2 pb-2 text-sm font-semibold transition-colors ml-4 ${
              isRegisterMode
                ? 'text-sky-400 border-b-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Aarav Sharma"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="aarav@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Min 8 chars with uppercase & symbol"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 mt-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold rounded-lg text-sm transition-colors shadow-md disabled:opacity-50"
          >
            {submitting
              ? 'Processing...'
              : isRegisterMode
              ? 'Register with Gantavya'
              : 'Sign In to Gantavya'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Protected by HTTP-only secure cookie sessions &bull; CSRF guarded
        </p>
      </div>
    </div>
  );
}

