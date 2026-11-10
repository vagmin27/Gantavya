import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripService } from '../../services/trip.service';
import { useToast } from '../../context/ToastContext';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import {
  Compass,
  Plus,
  Calendar,
  CheckCircle2,
  MapPin,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export default function AddToTripModal({
  isOpen,
  onClose,
  destination,
  onStartNewTrip
}) {
  const navigate = useNavigate();
  const toast = useToast();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setSelectedTripId(null);
      TripService.listTrips()
        .then((res) => setTrips(res.data || []))
        .catch((err) => setError(err.message || 'Failed to load user trips'))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen || !destination) return null;

  const handleAttachToExistingTrip = async () => {
    if (!selectedTripId) return;
    try {
      setSubmitting(true);
      setError(null);
      await TripService.updateTrip(selectedTripId, {
        destinationId: destination._id
      });
      toast.success(`Destination linked to trip successfully!`);
      onClose();
      navigate(`/trips/${selectedTripId}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to link destination to trip');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartNew = () => {
    onClose();
    if (onStartNewTrip) {
      onStartNewTrip(destination);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Add "${destination.name}" to Trip`}
      description="Select an existing journey to link this destination, or create a brand new plan."
      maxWidth="max-w-lg"
    >
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Option 1: Start New Trip */}
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs md:text-sm font-bold font-heading text-main">
              Create a Brand New Trip
            </h4>
            <p className="text-[11px] text-muted">
              Start an itinerary dedicated to {destination.name}, {destination.country}.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleStartNew}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Start New Trip
          </Button>
        </div>

        {/* Option 2: Add to Existing Trip */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold font-heading text-main flex items-center justify-between">
            <span>Or Link to an Existing Trip</span>
            <span className="text-[11px] font-normal text-muted">({trips.length} trips)</span>
          </h4>

          {loading ? (
            <div className="py-8 text-center">
              <Spinner size="md" className="mx-auto text-primary" />
              <p className="text-xs text-muted mt-2">Loading your trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-card-muted border border-border text-xs text-muted">
              You do not have any existing trips. Use &ldquo;Start New Trip&rdquo; above.
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {trips.map((trip) => {
                const isSelected = selectedTripId === trip._id;
                const startDate = new Date(trip.startDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                });

                return (
                  <div
                    key={trip._id}
                    onClick={() => setSelectedTripId(trip._id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                        : 'bg-card border-border hover:border-primary/40 hover:bg-card-muted/60'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-main truncate">{trip.title}</span>
                        <Badge variant="default" size="sm">
                          {trip.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {startDate}
                        </span>
                        <span className="truncate">
                          Current: {trip.destinationId?.name || 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-border" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dialog Actions */}
        <div className="pt-3 border-t border-border flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!selectedTripId || submitting}
            loading={submitting}
            onClick={handleAttachToExistingTrip}
          >
            Confirm & Attach
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

