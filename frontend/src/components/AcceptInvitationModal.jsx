import React, { useState } from 'react';
import { TripService } from '../services/trip.service';
import { Mail, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export default function AcceptInvitationModal({ isOpen, onClose, onInvitationProcessed }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isOpen) return null;

  const handleAction = async (action) => {
    setError(null);
    setSuccessMessage(null);
    if (!token.trim()) {
      setError('Please provide a valid invitation token');
      return;
    }

    try {
      setLoading(true);
      if (action === 'accept') {
        const res = await TripService.acceptInvitation(token.trim());
        setSuccessMessage('Invitation accepted! You are now part of the trip.');
        onInvitationProcessed && onInvitationProcessed(res.data);
      } else {
        await TripService.declineInvitation(token.trim());
        setSuccessMessage('Invitation declined.');
        onInvitationProcessed && onInvitationProcessed(null);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Trip Invitation</h2>
            <p className="text-xs text-slate-400">Join a collaborative travel planning space</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Invitation Token</label>
            <input
              type="text"
              placeholder="Paste invitation token here"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleAction('decline')}
              disabled={loading || !token.trim()}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" /> Decline
            </button>
            <button
              type="button"
              onClick={() => handleAction('accept')}
              disabled={loading || !token.trim()}
              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" /> Accept Invitation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

