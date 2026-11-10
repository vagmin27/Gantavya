import React, { useState, useEffect } from 'react';
import { TripService } from '../services/trip.service';
import Dialog from './ui/Dialog';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import { Calendar, DollarSign, MapPin, Sparkles, AlertCircle } from 'lucide-react';

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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Trip"
      description="Initialize a collaborative journey"
      maxWidth="max-w-lg"
    >
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-500 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Trip Title"
            type="text"
            placeholder="e.g. Pokhara Annapurna Trek"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-main mb-1.5">Destination</label>
          <div className="relative">
            <select
              value={formData.destinationId}
              onChange={(e) => setFormData({ ...formData, destinationId: e.target.value })}
              className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs md:text-sm text-main focus:outline-none focus:border-primary appearance-none transition-colors"
              required
            >
              <option value="">Select a Destination...</option>
              {destinations.map((d) => (
                <option key={d._id} value={d._id} className="bg-surface text-main">
                  {d.name} ({d.city ? `${d.city}, ` : ''}{d.country})
                </option>
              ))}
            </select>
            <MapPin className="w-4 h-4 text-muted absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
          </div>

          <div>
            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input
              label="Budget Target"
              type="number"
              min="0"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              leftIcon={<DollarSign className="w-3.5 h-3.5" />}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-main mb-1.5">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs md:text-sm text-main focus:outline-none focus:border-primary transition-colors"
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
          <label className="block text-xs font-semibold text-main mb-1.5">Visibility</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-main">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={formData.visibility === 'private'}
                onChange={() => setFormData({ ...formData, visibility: 'private' })}
                className="text-primary focus:ring-0"
              />
              Private (Only invited members)
            </label>
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-main">
              <input
                type="radio"
                name="visibility"
                value="shared"
                checked={formData.visibility === 'shared'}
                onChange={() => setFormData({ ...formData, visibility: 'shared' })}
                className="text-primary focus:ring-0"
              />
              Shared (Collaborative group)
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {loading ? 'Creating...' : 'Create Trip'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
