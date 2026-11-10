import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TripService } from '../services/trip.service';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CreateTripModal from '../components/CreateTripModal';
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  Compass,
  Sparkles,
  Globe2,
  Navigation,
  Plus
} from 'lucide-react';

export default function DestinationDetailPage() {
  const { id: destinationId } = useParams();
  const navigate = useNavigate();

  const [destination, setDestination] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch destination details & places
        const [destsRes, placesRes] = await Promise.allSettled([
          TripService.getDestinations(),
          TripService.getPlaces(destinationId)
        ]);

        if (isMounted) {
          if (destsRes.status === 'fulfilled') {
            const found = destsRes.value?.data?.find(
              (d) => d._id === destinationId || d.id === destinationId
            );
            setDestination(found || null);
          }
          if (placesRes.status === 'fulfilled') {
            setPlaces(placesRes.value?.data || []);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load destination details');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (destinationId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [destinationId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="py-16 text-center space-y-4">
        <EmptyState
          icon={Compass}
          title="Destination Not Found"
          description="The destination you requested could not be located in MongoDB Atlas."
          actionLabel="Back to Destinations"
          onAction={() => navigate('/explore')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/explore')}
          className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-main transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Destinations
        </button>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-card to-card border border-border p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                {destination.country}
              </Badge>
              {destination.city && (
                <span className="text-xs font-mono text-muted">&bull; {destination.city}</span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-heading text-main tracking-tight">
              {destination.name}
            </h1>
            <p className="text-xs md:text-sm text-muted max-w-2xl leading-relaxed">
              {destination.description ||
                `Explore points of interest, cultural landmarks, and multimodal transportation connections for ${destination.name}.`}
            </p>

            {destination.coordinates && (
              <div className="flex items-center gap-2 text-xs font-mono text-muted pt-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>
                  Lat: {destination.coordinates.latitude?.toFixed(4)}, Lon:{' '}
                  {destination.coordinates.longitude?.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Plan Trip Here
            </Button>
          </div>
        </div>
      </div>

      {/* Places of Interest List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Compass className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold font-heading text-main">
              Places & Attractions ({places.length})
            </h2>
          </div>
        </div>

        {places.length === 0 ? (
          <Card className="p-8 text-center space-y-2 border-dashed">
            <MapPin className="w-8 h-8 text-muted mx-auto" />
            <h3 className="text-sm font-semibold text-main">No specific places recorded yet</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              You can still create a trip to {destination.name} and add custom activities and transit legs directly in the workspace.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {places.map((place) => (
              <Card key={place._id} className="p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="accent" size="sm">
                      {place.category || 'Sightseeing'}
                    </Badge>
                    {place.estimatedDurationMinutes && (
                      <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {place.estimatedDurationMinutes} mins
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold font-heading text-main">{place.name}</h3>
                  {place.description && (
                    <p className="text-xs text-muted leading-relaxed line-clamp-3">
                      {place.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
                  <div className="flex items-center gap-1 font-mono text-amber-500 font-semibold">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Est. Cost: {place.estimatedCost ?? 0}</span>
                  </div>

                  {place.coordinates && (
                    <span className="text-[10px] font-mono text-muted">
                      {place.coordinates.latitude?.toFixed(2)}°N,{' '}
                      {place.coordinates.longitude?.toFixed(2)}°E
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTripCreated={(newTrip) => {
          navigate(`/trips/${newTrip._id}`);
        }}
      />
    </div>
  );
}

