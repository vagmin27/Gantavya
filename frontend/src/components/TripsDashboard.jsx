import React, { useState, useEffect, useMemo } from 'react';
import { TripService } from '../services/trip.service';
import CreateTripModal from './CreateTripModal';
import AcceptInvitationModal from './AcceptInvitationModal';
import TripWorkspace from './TripWorkspace';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import Skeleton from './ui/Skeleton';
import ConfirmDialog from './ui/ConfirmDialog';
import {
  Compass,
  Plus,
  Mail,
  Calendar,
  Users,
  DollarSign,
  Search,
  Filter,
  ArrowRight,
  MapPin,
  Trash2,
  Clock,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';

export default function TripsDashboard({ onSelectTrip, activeTripId: propActiveTripId }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'upcoming' | 'completed' | 'draft'
  const [sortBy, setSortBy] = useState('startDateAsc');
  const [activeTripId, setActiveTripId] = useState(propActiveTripId || null);

  // Modals & Dialogs
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
      const res = await TripService.listTrips(params);
      setTrips(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTrips();
  };

  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return;
    try {
      setIsDeleting(true);
      await TripService.deleteTrip(tripToDelete._id);
      setTrips(trips.filter((t) => t._id !== tripToDelete._id));
      setTripToDelete(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete trip');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and sort trips locally
  const filteredAndSortedTrips = useMemo(() => {
    let result = [...trips];

    // Filter by tab
    const now = new Date();
    if (activeTab === 'upcoming') {
      result = result.filter((t) => {
        const start = new Date(t.startDate);
        return start >= now || t.status === 'confirmed' || t.status === 'planning';
      });
    } else if (activeTab === 'completed') {
      result = result.filter((t) => t.status === 'completed' || new Date(t.endDate) < now);
    } else if (activeTab === 'draft') {
      result = result.filter((t) => t.status === 'draft');
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'startDateAsc') {
        return new Date(a.startDate || 0) - new Date(b.startDate || 0);
      }
      if (sortBy === 'startDateDesc') {
        return new Date(b.startDate || 0) - new Date(a.startDate || 0);
      }
      if (sortBy === 'titleAsc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'budgetDesc') {
        return (b.budget?.targetAmount || 0) - (a.budget?.targetAmount || 0);
      }
      return 0;
    });

    return result;
  }, [trips, activeTab, sortBy]);

  const handleCardClick = (tripId) => {
    if (onSelectTrip) {
      onSelectTrip(tripId);
    } else {
      setActiveTripId(tripId);
    }
  };

  if (activeTripId) {
    return (
      <TripWorkspace
        tripId={activeTripId}
        onBack={() => {
          setActiveTripId(null);
          fetchTrips();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-main flex items-center gap-2.5">
            <span className="p-2 bg-primary/10 text-primary rounded-xl">
              <Compass className="w-5 h-5" />
            </span>
            Your Collaborative Trips
          </h2>
          <p className="text-xs md:text-sm text-muted mt-1">
            Plan itineraries, manage group access, and trigger AI travel synthesis
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsInviteModalOpen(true)}
            leftIcon={<Mail className="w-4 h-4 text-emerald-500" />}
          >
            Accept Invite
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Trip
          </Button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card/60 border border-border rounded-2xl p-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Trips', count: trips.length },
            {
              id: 'upcoming',
              label: 'Upcoming',
              count: trips.filter(
                (t) =>
                  new Date(t.startDate) >= new Date() ||
                  t.status === 'confirmed' ||
                  t.status === 'planning'
              ).length
            },
            {
              id: 'completed',
              label: 'Completed',
              count: trips.filter((t) => t.status === 'completed').length
            },
            {
              id: 'draft',
              label: 'Drafts',
              count: trips.filter((t) => t.status === 'draft').length
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-fg shadow-xs font-bold'
                  : 'text-muted hover:text-main hover:bg-card-muted'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-card-muted text-muted'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <form onSubmit={handleSearch} className="relative w-full sm:w-60">
            <input
              type="text"
              placeholder="Search trips..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-1.5 text-xs text-main placeholder-muted focus:outline-none focus:border-primary transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2 pointer-events-none" />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-card border border-border text-muted hover:text-main text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="planning">Planning</option>
              <option value="confirmed">Confirmed</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto bg-card border border-border text-muted hover:text-main text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-primary transition-colors"
              title="Sort trips"
            >
              <option value="startDateAsc">Soonest First</option>
              <option value="startDateDesc">Latest First</option>
              <option value="titleAsc">Title A-Z</option>
              <option value="budgetDesc">Highest Budget</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs">
          {error}
        </div>
      )}

      {/* Trip Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
                <Skeleton className="h-4 w-1/3 rounded" />
              </div>
              <div className="pt-3 border-t border-border flex justify-between">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedTrips.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No trips found"
          description={
            searchTerm || statusFilter || activeTab !== 'all'
              ? 'No trips matched your active search or filters. Try resetting the criteria.'
              : "You don't have any trips yet. Create your first journey or accept an invite to get started."
          }
          actionLabel="Create Your First Trip"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSortedTrips.map((trip) => {
            const startDate = new Date(trip.startDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric'
            });
            const endDate = new Date(trip.endDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            const participantsCount = trip.participants?.length || 1;

            return (
              <div
                key={trip._id}
                onClick={() => handleCardClick(trip._id)}
                className="group relative bg-card hover:bg-card-muted/80 border border-border hover:border-primary/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <Badge
                      variant={
                        trip.status === 'confirmed'
                          ? 'success'
                          : trip.status === 'planning'
                          ? 'primary'
                          : trip.status === 'completed'
                          ? 'default'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {trip.status}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-card-muted text-muted border border-border">
                        {trip.visibility}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTripToDelete(trip);
                        }}
                        className="text-muted hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                        title="Delete trip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold font-heading text-main group-hover:text-primary transition-colors">
                    {trip.title}
                  </h3>

                  <div className="mt-3.5 space-y-2 text-xs text-muted">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{trip.destinationId?.name || 'Destination'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted shrink-0" />
                      <span>
                        {startDate} &ndash; {endDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-medium text-main">
                        {trip.budget?.currency} {trip.budget?.targetAmount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs text-muted">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {participantsCount} {participantsCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  <span className="text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold text-[11px]">
                    Open Workspace <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!tripToDelete}
        onClose={() => setTripToDelete(null)}
        onConfirm={confirmDeleteTrip}
        title="Delete Trip"
        message={`Are you sure you want to delete "${tripToDelete?.title}"? All itinerary days, activities, and multimodal routing configurations will be permanently removed.`}
        confirmText="Delete Trip"
        loading={isDeleting}
        variant="danger"
      />

      {/* Modals */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTripCreated={(newTrip) => {
          setTrips([newTrip, ...trips]);
          handleCardClick(newTrip._id);
        }}
      />

      <AcceptInvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvitationProcessed={() => {
          fetchTrips();
        }}
      />
    </div>
  );
}
