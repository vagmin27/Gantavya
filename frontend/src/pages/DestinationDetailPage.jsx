import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TripService } from '../services/trip.service';
import {
  getDestinationCover,
  getDestinationGallery,
  getPlacePhoto
} from '../utils/destination-assets';
import { addRecentlyViewedDestination } from '../utils/recent-destinations';
import {
  DestinationMap,
  PhotoGallery,
  AddToTripModal
} from '../components/destinations';
import CreateTripModal from '../components/CreateTripModal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  Compass,
  Sparkles,
  Globe2,
  Calendar,
  SunMedium,
  Thermometer,
  Layers,
  ChevronRight,
  Plus,
  Share2,
  BookmarkPlus
} from 'lucide-react';

export default function DestinationDetailPage() {
  const { id: destinationId } = useParams();
  const navigate = useNavigate();

  const [destination, setDestination] = useState(null);
  const [places, setPlaces] = useState([]);
  const [allDestinations, setAllDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddToTripOpen, setIsAddToTripOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch destination details, places, and all destinations for related suggestions
        const [destsRes, placesRes] = await Promise.allSettled([
          TripService.getDestinations(),
          TripService.getPlaces(destinationId)
        ]);

        if (isMounted) {
          if (destsRes.status === 'fulfilled') {
            const list = destsRes.value?.data || [];
            setAllDestinations(list);
            const found = list.find(
              (d) => d._id === destinationId || d.id === destinationId
            );
            if (found) {
              setDestination(found);
              addRecentlyViewedDestination(found);
            }
          }

          if (placesRes.status === 'fulfilled') {
            const fetchedPlaces = placesRes.value?.data || [];
            setPlaces(fetchedPlaces);
            if (fetchedPlaces.length > 0) {
              setSelectedPlaceId(fetchedPlaces[0]._id);
            }
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

  // Gallery Photos
  const galleryPhotos = useMemo(() => {
    return destination ? getDestinationGallery(destination) : [];
  }, [destination]);

  // Related Destinations (sharing country or category)
  const relatedDestinations = useMemo(() => {
    if (!destination || allDestinations.length === 0) return [];
    return allDestinations
      .filter((d) => d._id !== destination._id)
      .filter((d) => {
        const sameCountry = d.country === destination.country;
        const sharedCat =
          Array.isArray(d.categories) &&
          Array.isArray(destination.categories) &&
          d.categories.some((c) => destination.categories.includes(c));
        return sameCountry || sharedCat;
      })
      .slice(0, 3);
  }, [destination, allDestinations]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <Skeleton className="h-6 w-36 rounded" />
        <Skeleton className="h-96 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
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

  const bestSeasons = destination.bestVisitingPeriods?.seasons || [];
  const bestMonths = destination.bestVisitingPeriods?.months || [];
  const seasonDesc = destination.bestVisitingPeriods?.description;
  const avgBudget = destination.metadata?.averageDailyBudget?.amount;
  const currency = destination.metadata?.averageDailyBudget?.currency || 'USD';
  const timeZone = destination.metadata?.timeZone;
  const climateType = destination.metadata?.climateType;

  return (
    <div className="space-y-10 animate-in fade-in duration-200">
      {/* 1. Breadcrumbs Navigation */}
      <nav className="flex items-center gap-2 text-xs text-muted">
        <button
          onClick={() => navigate('/explore')}
          className="hover:text-main transition-colors flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Explore
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-muted/60" />
        <span className="text-muted">{destination.country}</span>
        <ChevronRight className="w-3.5 h-3.5 text-muted/60" />
        <span className="font-bold text-main truncate max-w-xs">Overview</span>
      </nav>

      {/* 2. Immersive Destination Hero */}
      <div className="relative rounded-3xl overflow-hidden min-h-[360px] sm:min-h-[420px] flex flex-col justify-end p-6 sm:p-10 text-white bg-slate-950 shadow-xl">
        <img
          src={getDestinationCover(destination)}
          alt={destination.name}
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" size="sm">
                {destination.country}
              </Badge>
              {destination.city && (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20">
                  {destination.city}
                </span>
              )}
              {Array.isArray(destination.categories) &&
                destination.categories.slice(0, 2).map((c, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-md text-white capitalize border border-white/20"
                  >
                    {c}
                  </span>
                ))}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black font-heading tracking-tight drop-shadow-md">
              {destination.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-xl drop-shadow-sm">
              {destination.description ||
                `Explore points of interest, cultural landmarks, and multimodal transportation connections for ${destination.name}.`}
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsAddToTripOpen(true)}
              className="bg-slate-900/70 border-white/30 text-white hover:bg-slate-900"
              leftIcon={<BookmarkPlus className="w-4 h-4 text-emerald-400" />}
            >
              Add to Existing Trip
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Plan Trip Here
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Travel Intelligence & Seasonality Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Best Season */}
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Best Season</span>
            <SunMedium className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-bold font-heading text-main capitalize">
            {bestSeasons.length > 0 ? bestSeasons.join(', ') : 'All Year'}
          </div>
          {bestMonths.length > 0 && (
            <div className="text-[10px] text-muted font-mono">
              Months: {bestMonths.join(', ')}
            </div>
          )}
        </Card>

        {/* Daily Budget */}
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Avg Daily Budget</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-sm font-bold font-heading text-main">
            {avgBudget ? `${currency} ${avgBudget}` : 'Flexible'}
          </div>
          <div className="text-[10px] text-muted font-mono">Lodging & food est.</div>
        </Card>

        {/* Time Zone */}
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Time Zone</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="text-sm font-bold font-heading text-main truncate">
            {timeZone || 'Standard Time'}
          </div>
          <div className="text-[10px] text-muted font-mono">Multimodal sync</div>
        </Card>

        {/* Coordinates */}
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Coordinates</span>
            <MapPin className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xs font-mono font-bold text-main">
            {destination.location?.coordinates
              ? `${destination.location.coordinates[1]?.toFixed(2)}°N, ${destination.location.coordinates[0]?.toFixed(2)}°E`
              : destination.coordinates
              ? `${destination.coordinates.latitude?.toFixed(2)}°N, ${destination.coordinates.longitude?.toFixed(2)}°E`
              : 'Mapped Region'}
          </div>
          <div className="text-[10px] text-muted font-mono">NetworkX node</div>
        </Card>
      </div>

      {/* Seasonality Detail Note if present */}
      {seasonDesc && (
        <div className="p-4 rounded-2xl bg-card border border-border text-xs text-muted flex items-start gap-3">
          <SunMedium className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-main">Seasonal Recommendation: </strong>
            {seasonDesc}
          </p>
        </div>
      )}

      {/* 4. Photo Gallery Component */}
      <PhotoGallery
        photos={galleryPhotos}
        destinationName={destination.name}
      />

      {/* 5. Interactive Map & Attractions Split Layout */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-main flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary" />
              Places & Attractions ({places.length})
            </h2>
            <p className="text-xs text-muted">
              Interactive map visualization synchronized with verified points of interest
            </p>
          </div>
        </div>

        {/* Map Integration */}
        <DestinationMap
          destination={destination}
          places={places}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={setSelectedPlaceId}
        />

        {/* Attractions Cards List */}
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
            {places.map((place) => {
              const isSelected = selectedPlaceId === place._id;
              const photo = getPlacePhoto(place);

              return (
                <div
                  key={place._id}
                  onClick={() => setSelectedPlaceId(place._id)}
                  className={`group p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-card border-primary ring-2 ring-primary/20 shadow-md'
                      : 'bg-card border-border hover:border-primary/50 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Attraction Cover Thumbnail */}
                    <div className="relative h-32 w-full rounded-xl overflow-hidden bg-card-muted">
                      <img
                        src={photo}
                        alt={place.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge variant="accent" size="sm">
                          {place.category || 'Sightseeing'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-bold font-heading text-main group-hover:text-primary transition-colors">
                        {place.name}
                      </h3>
                      {place.description && (
                        <p className="text-xs text-muted leading-relaxed line-clamp-2">
                          {place.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
                    <span className="flex items-center gap-1 font-mono text-amber-500 font-semibold">
                      <DollarSign className="w-3.5 h-3.5" />
                      Cost: {place.priceInfo?.estimatedCost ?? place.estimatedCost ?? 0}
                    </span>

                    {place.estimatedDurationMinutes && (
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3 text-muted" />
                        {place.estimatedDurationMinutes} mins
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Related Destinations Carousel */}
      {relatedDestinations.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-border">
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-heading text-main">
              Similar Destinations You Might Like
            </h2>
            <p className="text-xs text-muted">
              Other recommended travel nodes in {destination.country} or similar geographic profiles
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {relatedDestinations.map((rel) => (
              <div
                key={rel._id}
                onClick={() => {
                  navigate(`/destinations/${rel._id}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group p-3.5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer shadow-xs space-y-2.5"
              >
                <div className="h-32 rounded-xl overflow-hidden bg-card-muted relative">
                  <img
                    src={getDestinationCover(rel)}
                    alt={rel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <Badge variant="primary" size="sm" className="absolute top-2 left-2">
                    {rel.country}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold font-heading text-main group-hover:text-primary transition-colors">
                    {rel.name}
                  </h4>
                  <p className="text-[11px] text-muted line-clamp-1 mt-0.5">
                    {rel.city ? `${rel.city}, ` : ''}{rel.country}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add To Existing Trip Modal */}
      <AddToTripModal
        isOpen={isAddToTripOpen}
        onClose={() => setIsAddToTripOpen(false)}
        destination={destination}
        onStartNewTrip={() => {
          setIsAddToTripOpen(false);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Create New Trip Modal */}
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
