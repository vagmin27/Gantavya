import React, { useState } from 'react';
import { TripService } from '../services/trip.service';
import Dialog from './ui/Dialog';
import Input from './ui/Input';
import Button from './ui/Button';
import { Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Trip Invitation"
      description="Join a collaborative travel planning space"
      maxWidth="max-w-md"
    >
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-500 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-500 text-xs">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Input
            label="Invitation Token"
            placeholder="Paste invitation token here"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="font-mono"
            leftIcon={<Mail className="w-4 h-4 text-muted" />}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleAction('decline')}
            disabled={loading || !token.trim()}
            className="flex-1"
            leftIcon={<XCircle className="w-4 h-4" />}
          >
            Decline
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => handleAction('accept')}
            disabled={loading || !token.trim()}
            className="flex-1"
            leftIcon={<CheckCircle className="w-4 h-4" />}
          >
            {loading ? 'Processing...' : 'Accept'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
