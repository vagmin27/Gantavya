import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Dialog from './ui/Dialog';
import Input from './ui/Input';
import Button from './ui/Button';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isRegisterMode ? 'Create Account' : 'Welcome to Gantavya'}
      description={
        isRegisterMode
          ? 'Join the intelligent multimodal travel platform'
          : 'Sign in to access your collaborative trips'
      }
      maxWidth="max-w-md"
    >
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => {
            setIsRegisterMode(false);
            setError(null);
          }}
          className={`flex items-center gap-2 pb-1.5 text-xs md:text-sm font-semibold transition-colors ${
            !isRegisterMode
              ? 'text-primary border-b-2 border-primary -mb-[13px]'
              : 'text-muted hover:text-main'
          }`}
        >
          <LogIn className="w-4 h-4" /> Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRegisterMode(true);
            setError(null);
          }}
          className={`flex items-center gap-2 pb-1.5 text-xs md:text-sm font-semibold transition-colors ml-4 ${
            isRegisterMode
              ? 'text-primary border-b-2 border-primary -mb-[13px]'
              : 'text-muted hover:text-main'
          }`}
        >
          <UserPlus className="w-4 h-4" /> Create Account
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {isRegisterMode && (
          <div>
            <Input
              label="Full Name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Aarav Sharma"
            />
          </div>
        )}

        <div>
          <Input
            label="Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="explorer@gantavya.io"
          />
        </div>

        <div>
          <Input
            label="Password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            className="w-full"
            leftIcon={isRegisterMode ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          >
            {submitting
              ? isRegisterMode
                ? 'Creating account...'
                : 'Signing in...'
              : isRegisterMode
              ? 'Create Account'
              : 'Sign In'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
