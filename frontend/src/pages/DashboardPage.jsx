import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TripService } from '../services/trip.service';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CreateTripModal from '../components/CreateTripModal';
import {
  Compass,
  Plus,
  Calendar,
  Users,
  DollarSign,
  MapPin,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  Navigation,
  Globe2,
  ShieldCheck
} from 'lucide-react';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [trips, setTrips] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError(null);
        const [tripsRes, destsRes] = await Promise.allSettled([
          TripService.listTrips(),
          TripService.getDestinations()
        ]);

        if (isMounted) {
          if (tripsRes.status === 'fulfilled') {
            setTrips(tripsRes.value?.data || []);
          }
          if (destsRes.status === 'fulfilled') {
            setDestinations(destsRes.value?.data || []);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load dashboard data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute actual real-time travel statistics
  const stats = useMemo(() => {
    const total = trips.length;
    const now = new Date();
    const upcoming = trips.filter((t) => {
      const sDate = new Date(t.startDate);
      return sDate >= now || t.status === 'planning' || t.status === 'confirmed';
    });

    const uniqueCollaborators = new Set();
    let totalBudget = 0;
    const currencies = new Set();

    trips.forEach((t) => {
      if (t.budget?.targetAmount) {
        totalBudget += Number(t.budget.targetAmount);
        if (t.budget.currency) currencies.add(t.budget.currency);
      }
      if (Array.isArray(t.participants)) {
        t.participants.forEach((p) => {
          const uid = p.userId?._id || p.userId || p._id;
          if (uid) uniqueCollaborators.add(uid.toString());
        });
      }
    });

    const primaryCurrency = currencies.size > 0 ? Array.from(currencies)[0] : 'USD';

    return {
      totalTrips: total,
      upcomingCount: upcoming.length,
      collaboratorCount: uniqueCollaborators.size,
      totalBudget,
      primaryCurrency
    };
  }, [trips]);

  // Upcoming journeys (sorted soonest first)
  const upcomingTrips = useMemo(() => {
    const now = new Date();
    return trips
      .filter((t) => {
        const sDate = new Date(t.startDate);
        return sDate >= now || t.status === 'planning' || t.status === 'confirmed';
      })
      .sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0))
      .slice(0, 3);
  }, [trips]);

  // Recent trips
  const recentTrips = useMemo(() => {
    return [...trips]
      .sort((a, b) => new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0))
      .slice(0, 4);
  }, [trips]);

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Personalized Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-card to-card border border-border p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-primary font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{todayFormatted}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-main tracking-tight">
              Welcome back, {user?.name || 'Explorer'}
            </h1>
            <p className="text-xs md:text-sm text-muted max-w-xl">
              Here is the live overview of your multimodal journeys, group collaborations, and itinerary intelligence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/explore')}
              leftIcon={<Globe2 className="w-4 h-4 text-primary" />}
            >
              Explore Destinations
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create New Trip
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Real Travel Statistics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Trips */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Total Trips</span>
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Compass className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-16 rounded" />
            ) : (
              <div className="text-2xl font-black font-heading text-main">{stats.totalTrips}</div>
            )}
            <p className="text-[11px] text-muted mt-1">Managed travel itineraries</p>
          </div>
        </Card>

        {/* Upcoming Journeys */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Upcoming Journeys</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-16 rounded" />
            ) : (
              <div className="text-2xl font-black font-heading text-main">
                {stats.upcomingCount}
              </div>
            )}
            <p className="text-[11px] text-muted mt-1">Confirmed & in planning</p>
          </div>
        </Card>

        {/* Collaborators */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Travel Network</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-16 rounded" />
            ) : (
              <div className="text-2xl font-black font-heading text-main">
                {stats.collaboratorCount}
              </div>
            )}
            <p className="text-[11px] text-muted mt-1">Collaborators in your groups</p>
          </div>
        </Card>

        {/* Total Planned Budget */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Planned Budget</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-24 rounded" />
            ) : (
              <div className="text-2xl font-black font-heading text-main">
                {stats.primaryCurrency} {stats.totalBudget.toLocaleString()}
              </div>
            )}
            <p className="text-[11px] text-muted mt-1">Cumulative target amounts</p>
          </div>
        </Card>
      </div>

      {/* 3. Upcoming Trips & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Journeys (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Navigation className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold font-heading text-main">Upcoming Journeys</h2>
            </div>
            <Link
              to="/trips"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View all trips <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 bg-card border border-border rounded-2xl space-y-2">
                  <Skeleton className="h-5 w-40 rounded" />
                  <Skeleton className="h-4 w-60 rounded" />
                </div>
              ))}
            </div>
          ) : upcomingTrips.length === 0 ? (
            <Card className="p-8 text-center space-y-3 border-dashed">
              <Compass className="w-10 h-10 text-muted mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-main">No upcoming journeys scheduled</h3>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Ready for your next adventure? Create a trip to generate multimodal schedules and invite friends.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Plan a New Trip
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingTrips.map((trip) => {
                const startDate = new Date(trip.startDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                });
                const endDate = new Date(trip.endDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });

                return (
                  <div
                    key={trip._id}
                    onClick={() => navigate(`/trips/${trip._id}`)}
                    className="p-4 bg-card hover:bg-card-muted/80 border border-border hover:border-primary/50 rounded-2xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm md:text-base font-bold font-heading text-main">
                          {trip.title}
                        </h3>
                        <Badge
                          variant={trip.status === 'confirmed' ? 'success' : 'primary'}
                          size="sm"
                        >
                          {trip.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          {trip.destinationId?.name || 'Destination'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {startDate} &ndash; {endDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-emerald-500" />
                          {trip.participants?.length || 1} members
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-main">
                        {trip.budget?.currency} {trip.budget?.targetAmount?.toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/trips/${trip._id}`);
                        }}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        Workspace
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Navigation & System Status (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold font-heading text-main">Quick Shortcuts</h2>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-card-muted/60 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Plus className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-bold text-main">Create Trip</div>
                  <div className="text-[11px] text-muted">Initialize journey & invite friends</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => navigate('/explore')}
              className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-card-muted/60 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Globe2 className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-bold text-main">Explore Destinations</div>
                  <div className="text-[11px] text-muted">Discover verified places & POIs</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-card-muted/60 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Avatar name={user?.name} size="sm" />
                </span>
                <div>
                  <div className="text-xs font-bold text-main">Traveller Profile</div>
                  <div className="text-[11px] text-muted">Styles, interests & settings</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          {/* System Assurance Pill */}
          <div className="p-4 rounded-2xl bg-card-muted/60 border border-border text-xs text-muted space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-main">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Gantavya Multimodal Engine</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Powered by NetworkX graph pathfinding, Pareto multi-objective ranking, and real-time live transportation adapters.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Suggested Destinations (Real backend data) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Globe2 className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold font-heading text-main">Discover Featured Destinations</h2>
          </div>
          <Link
            to="/explore"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Browse all ({destinations.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-card border border-border rounded-2xl space-y-2">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : destinations.length === 0 ? (
          <Card className="p-6 text-center text-xs text-muted">
            No featured destinations currently seeded in MongoDB database.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {destinations.slice(0, 4).map((dest) => (
              <div
                key={dest._id}
                onClick={() => navigate(`/destinations/${dest._id}`)}
                className="group p-4 bg-card hover:bg-card-muted/80 border border-border hover:border-primary/50 rounded-2xl transition-all cursor-pointer flex flex-col justify-between shadow-xs space-y-3"
              >
                <div>
                  <div className="h-24 rounded-xl bg-gradient-to-br from-primary/10 via-card-muted to-accent/10 border border-border/60 flex items-center justify-center text-muted group-hover:scale-[1.02] transition-transform">
                    <MapPin className="w-8 h-8 text-primary/60" />
                  </div>
                  <h3 className="text-sm font-bold font-heading text-main mt-3 group-hover:text-primary transition-colors">
                    {dest.name}
                  </h3>
                  <p className="text-xs text-muted">
                    {dest.city ? `${dest.city}, ` : ''}{dest.country}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-primary font-semibold pt-1">
                  <span>Explore Places</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTripCreated={(newTrip) => {
          setTrips([newTrip, ...trips]);
          navigate(`/trips/${newTrip._id}`);
        }}
      />
    </div>
  );
}

