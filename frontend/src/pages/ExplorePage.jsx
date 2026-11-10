import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TripService } from '../services/trip.service';
import {
  DESTINATION_CATEGORIES,
  getDestinationCover
} from '../utils/destination-assets';
import {
  getRecentlyViewedDestinations
} from '../utils/recent-destinations';
import {
  DestinationCard,
  DestinationSearch,
  AddToTripModal
} from '../components/destinations';
import CreateTripModal from '../components/CreateTripModal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import {
  Compass,
  MapPin,
  TrendingUp,
  Sparkles,
  Flame,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  Navigation,
  Globe2,
  SlidersHorizontal,
  Plus
} from 'lucide-react';

export default function ExplorePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Modals
  const [selectedDestinationForTrip, setSelectedDestinationForTrip] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddToTripOpen, setIsAddToTripOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const res = await TripService.getDestinations();
        if (isMounted) {
          setDestinations(res.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to retrieve destinations');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    setRecentlyViewed(getRecentlyViewedDestinations());

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter destinations based on search term & category selection
  const filteredDestinations = useMemo(() => {
    return destinations.filter((dest) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        (dest.name && dest.name.toLowerCase().includes(term)) ||
        (dest.country && dest.country.toLowerCase().includes(term)) ||
        (dest.city && dest.city.toLowerCase().includes(term)) ||
        (Array.isArray(dest.categories) &&
          dest.categories.some((c) => c.toLowerCase().includes(term)));

      let matchesCategory = true;
      if (selectedCategory !== 'all') {
        const catObj = DESTINATION_CATEGORIES.find((c) => c.id === selectedCategory);
        const targetBackend = (catObj?.backendCategory || selectedCategory).toLowerCase();
        const selCat = selectedCategory.toLowerCase();

        const matchCat = (cat1, cat2) => {
          if (!cat1 || !cat2) return false;
          const a = cat1.toLowerCase().trim();
          const b = cat2.toLowerCase().trim();
          if (a === b) return true;
          if (a.includes(b) || b.includes(a)) return true;
          // Stem matching for culture/cultural, history/historical, etc.
          const stemA = a.slice(0, Math.min(a.length, 5));
          const stemB = b.slice(0, Math.min(b.length, 5));
          return stemA.length >= 4 && stemA === stemB;
        };

        matchesCategory =
          (Array.isArray(dest.categories) &&
            dest.categories.some((c) => {
              return matchCat(c, targetBackend) || matchCat(c, selCat);
            })) ||
          (dest.category &&
            (matchCat(dest.category, targetBackend) || matchCat(dest.category, selCat)));
      }

      return matchesSearch && matchesCategory;
    });
  }, [destinations, searchTerm, selectedCategory]);

  // Trending destinations (top rated or first items)
  const trendingDestinations = useMemo(() => {
    return destinations.slice(0, 3);
  }, [destinations]);

  // Recommended destinations (matched to user profile interests or curated)
  const recommendedDestinations = useMemo(() => {
    const userInterests = Array.isArray(profile?.travelInterests)
      ? profile.travelInterests.map((i) => i.toLowerCase())
      : [];

    if (userInterests.length > 0) {
      const matched = destinations.filter((d) =>
        Array.isArray(d.categories) &&
        d.categories.some((c) => userInterests.some((ui) => ui.includes(c) || c.includes(ui)))
      );
      if (matched.length > 0) return matched.slice(0, 4);
    }

    return destinations.slice(1, 5);
  }, [destinations, profile]);

  const handlePlanTrip = (destination) => {
    setSelectedDestinationForTrip(destination);
    setIsAddToTripOpen(true);
  };

  const handleStartNewTripFromModal = (destination) => {
    setSelectedDestinationForTrip(destination);
    setIsAddToTripOpen(false);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-200">
      {/* 1. Hero Discovery Section with Search */}
      <div className="relative rounded-3xl overflow-hidden min-h-[380px] sm:min-h-[440px] flex items-center justify-center p-6 sm:p-12 text-center text-white bg-slate-950">
        {/* Cinematic Backdrop Image */}
        <img
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80"
          alt="Travel Exploration Header"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-slate-950/60 to-slate-950/80" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-sky-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Multimodal Destination Discovery</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-black font-heading tracking-tight leading-tight">
              Explore Handcrafted Destinations
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Discover verified mountain ranges, historic heritage sanctuaries, and coastal routes. Synthesize multimodal travel itineraries with live provider intelligence.
            </p>
          </div>

          {/* Interactive Search Bar & Suggestions */}
          <div className="max-w-xl mx-auto pt-2">
            <DestinationSearch
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              destinations={destinations}
              placeholder="Search by destination name, city, or country..."
            />
          </div>
        </div>
      </div>

      {/* 2. Explore by Category Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-main flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary" />
              Explore by Category
            </h2>
            <p className="text-xs text-muted">
              Filter verified travel destinations by geographic and experiential themes
            </p>
          </div>

          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Reset to All
            </button>
          )}
        </div>

        {/* Category Cards Carousel / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {DESTINATION_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`group relative h-28 sm:h-32 rounded-2xl overflow-hidden p-3.5 text-left transition-all border ${
                  isSelected
                    ? 'ring-2 ring-primary border-primary shadow-md'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                <div className="relative z-10 h-full flex flex-col justify-end text-white">
                  <div className="text-xs font-bold font-heading drop-shadow-sm">
                    {cat.label}
                  </div>
                  {isSelected && (
                    <div className="text-[10px] text-sky-400 font-mono flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Active Filter
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Destinations Catalog Grid */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-bold font-heading text-main">
              {selectedCategory === 'all'
                ? 'All Verified Destinations'
                : `Destinations in ${
                    DESTINATION_CATEGORIES.find((c) => c.id === selectedCategory)?.label ||
                    selectedCategory
                  }`}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Showing {filteredDestinations.length} destination{filteredDestinations.length === 1 ? '' : 's'} ready for multimodal routing
            </p>
          </div>

          {/* Quick Clear Filter Pill */}
          {(searchTerm || selectedCategory !== 'all') && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Filtered by:</span>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
                className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
              >
                Clear Filters ✕
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
                <div className="pt-2 flex justify-between">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDestinations.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No destinations found"
            description={
              searchTerm || selectedCategory !== 'all'
                ? 'No destinations match your active filters. Try broadening your search or resetting category filters.'
                : 'No destinations have been seeded in MongoDB Atlas yet. Add one via backend API or inspect seed scripts.'
            }
            actionLabel={searchTerm || selectedCategory !== 'all' ? 'Reset Filters' : undefined}
            onAction={() => {
              setSearchTerm('');
              setSelectedCategory('all');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDestinations.map((dest) => (
              <DestinationCard
                key={dest._id}
                destination={dest}
                onPlanTrip={handlePlanTrip}
              />
            ))}
          </div>
        )}
      </div>

      {/* 4. Trending & Recommended Destinations Highlights */}
      {!searchTerm && selectedCategory === 'all' && destinations.length > 2 && (
        <div className="space-y-5 pt-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-xl font-bold font-heading text-main">Trending Journeys</h2>
              <p className="text-xs text-muted">Most planned travel corridors this month</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {trendingDestinations.map((dest) => (
              <DestinationCard
                key={dest._id}
                destination={dest}
                featured={true}
                onPlanTrip={handlePlanTrip}
              />
            ))}
          </div>
        </div>
      )}

      {/* 5. Recently Viewed Destinations */}
      {recentlyViewed.length > 0 && !searchTerm && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-bold font-heading text-main">Recently Viewed</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {recentlyViewed.map((item) => (
              <div
                key={item._id}
                onClick={() => navigate(`/destinations/${item._id}`)}
                className="p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer space-y-1.5 group"
              >
                <div className="h-16 rounded-lg bg-card-muted overflow-hidden relative">
                  <img
                    src={getDestinationCover(item)}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="text-xs font-bold font-heading text-main truncate group-hover:text-primary transition-colors">
                  {item.name}
                </div>
                <div className="text-[10px] text-muted truncate">
                  {item.city ? `${item.city}, ` : ''}{item.country}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Travel Inspiration Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary/10 via-card to-accent/10 border border-border p-6 sm:p-10 shadow-xs">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Gantavya Intelligence Advantage
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-main tracking-tight">
            Why Explore with Multimodal Route Optimization?
          </h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            Unlike static travel booking tools, Gantavya builds time-expanded NetworkX graphs across road, rail, air, and walking legs. We compute Pareto-optimal frontiers balancing travel duration, financial expenditure, and transfer fatigue.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Start Your Journey
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/trips')}
            >
              View My Trips
            </Button>
          </div>
        </div>
      </div>

      {/* Add To Trip Modal */}
      <AddToTripModal
        isOpen={isAddToTripOpen}
        onClose={() => setIsAddToTripOpen(false)}
        destination={selectedDestinationForTrip}
        onStartNewTrip={handleStartNewTripFromModal}
      />

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedDestinationForTrip(null);
        }}
        onTripCreated={(newTrip) => {
          navigate(`/trips/${newTrip._id}`);
        }}
      />
    </div>
  );
}
