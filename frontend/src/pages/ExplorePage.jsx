import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripService } from '../services/trip.service';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CreateTripModal from '../components/CreateTripModal';
import {
  Search,
  MapPin,
  Compass,
  ArrowRight,
  Filter,
  Sparkles,
  Layers,
  Globe2,
  Plus
} from 'lucide-react';

export default function ExplorePage() {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDestinationForTrip, setSelectedDestinationForTrip] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const categories = [
    { id: 'all', label: 'All Destinations' },
    { id: 'nature', label: 'Nature & Trekking' },
    { id: 'culture', label: 'Culture & Heritage' },
    { id: 'adventure', label: 'Adventure Sports' },
    { id: 'urban', label: 'Urban & Cities' }
  ];

  useEffect(() => {
    let isMounted = true;
    async function fetchDestinations() {
      try {
        setLoading(true);
        setError(null);
        const res = await TripService.getDestinations();
        if (isMounted) {
          setDestinations(res.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load destinations from backend');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDestinations();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredDestinations = useMemo(() => {
    return destinations.filter((dest) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (dest.name && dest.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (dest.country && dest.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (dest.city && dest.city.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' ||
        (Array.isArray(dest.categories) &&
          dest.categories.some((c) =>
            c.toLowerCase().includes(selectedCategory.toLowerCase())
          )) ||
        (dest.category && dest.category.toLowerCase().includes(selectedCategory.toLowerCase()));

      return matchesSearch && matchesCategory;
    });
  }, [destinations, searchTerm, selectedCategory]);

  const handlePlanTripTo = (e, dest) => {
    e.stopPropagation();
    setSelectedDestinationForTrip(dest);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500/10 via-card to-card border border-border p-6 md:p-8 shadow-xs">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 font-semibold">
            <Globe2 className="w-4 h-4" />
            <span>Destination Discovery</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-main tracking-tight">
            Explore Handcrafted Destinations
          </h1>
          <p className="text-xs md:text-sm text-muted">
            Browse verified destinations, inspect curated attractions, and initiate intelligent multimodal itinerary synthesis with one click.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by destination name, city, or country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-xs md:text-sm text-main placeholder-muted focus:outline-none focus:border-primary transition-colors"
          />
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-fg shadow-xs font-bold'
                  : 'text-muted hover:text-main hover:bg-card-muted'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs">
          {error}
        </div>
      )}

      {/* Destinations Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-5 bg-card border border-border rounded-2xl space-y-3">
              <Skeleton className="h-44 w-full rounded-xl" />
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
              : 'No destinations have been seeded in MongoDB Atlas yet. Check back soon or add one via the backend API.'
          }
          actionLabel={searchTerm || selectedCategory !== 'all' ? 'Reset Filters' : undefined}
          onAction={() => {
            setSearchTerm('');
            setSelectedCategory('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDestinations.map((dest) => (
            <div
              key={dest._id}
              onClick={() => navigate(`/destinations/${dest._id}`)}
              className="group bg-card hover:bg-card-muted/80 border border-border hover:border-primary/50 rounded-2xl overflow-hidden transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <div>
                {/* Visual Header / Cover */}
                <div className="h-44 bg-gradient-to-br from-primary/15 via-indigo-500/10 to-accent/10 relative p-4 flex flex-col justify-between overflow-hidden">
                  <div className="flex justify-between items-start">
                    <Badge variant="accent" size="sm">
                      {dest.country || 'Region'}
                    </Badge>
                    {dest.city && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-900/60 backdrop-blur-xs text-white border border-white/20">
                        {dest.city}
                      </span>
                    )}
                  </div>

                  <div className="text-white/80 group-hover:scale-105 transition-transform origin-bottom-left flex items-center justify-center h-16">
                    <MapPin className="w-12 h-12 text-primary/70" />
                  </div>
                </div>

                <div className="p-5 space-y-2.5">
                  <h3 className="text-lg font-bold font-heading text-main group-hover:text-primary transition-colors">
                    {dest.name}
                  </h3>

                  <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                    {dest.description ||
                      `Experience the scenic beauty, culture, and rich local attractions of ${dest.name}, ${dest.country}.`}
                  </p>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Array.isArray(dest.categories) && dest.categories.length > 0 ? (
                      dest.categories.map((cat, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-card-muted text-muted border border-border capitalize"
                        >
                          {cat}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-card-muted text-muted border border-border">
                        Travel Destination
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-border bg-card/40 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handlePlanTripTo(e, dest)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Plan Trip
                </Button>

                <span className="text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  View Places <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Trip Modal Pre-filled with Destination */}
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

