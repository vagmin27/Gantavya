import React, { useState, useEffect } from 'react';
import { TripService } from '../services/trip.service';
import { X, Calendar, DollarSign, MapPin, Sparkles, AlertCircle } from 'lucide-react';

export default function CreateTripModal({ isOpen, onClose, onTripCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    destinationId: '',
    startDate: '',
    endDate: '',
    visibility: 'private',
    currency: 'USD',
    targetAmount: 1000
  });
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      TripService.getDestinations()
        .then((res) => {
          if (res?.data) setDestinations(res.data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Trip title is required');
      return;
    }
    if (!formData.destinationId) {
      setError('Please select a destination');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Start and End dates are required');
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End date cannot be earlier than start date');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: formData.title.trim(),
        destinationId: formData.destinationId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        visibility: formData.visibility,
        budget: {
          currency: formData.currency,
          targetAmount: Number(formData.targetAmount)
        }
      };

      const res = await TripService.createTrip(payload);
      onTripCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Create New Trip</h2>
            <p className="text-xs text-slate-400">Initialize a collaborative journey</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Trip Title</label>
            <input
              type="text"
              placeholder="e.g. Pokhara Annapurna Trek"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Destination</label>
            <div className="relative">
              <select
                value={formData.destinationId}
                onChange={(e) => setFormData({ ...formData, destinationId: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500 appearance-none"
                required
              >
                <option value="">Select a Destination...</option>
                {destinations.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.city ? `${d.city}, ` : ''}{d.country})
                  </option>
                ))}
              </select>
              <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Budget Target</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="USD">USD ($)</option>
                <option value="NPR">NPR (Rs)</option>
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Visibility</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={formData.visibility === 'private'}
                  onChange={() => setFormData({ ...formData, visibility: 'private' })}
                  className="text-sky-500 focus:ring-0"
                />
                Private (Only invited members)
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="shared"
                  checked={formData.visibility === 'shared'}
                  onChange={() => setFormData({ ...formData, visibility: 'shared' })}
                  className="text-sky-500 focus:ring-0"
                />
                Shared (Collaborative group)
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-900 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

