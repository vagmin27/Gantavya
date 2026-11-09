import React, { useState, useEffect } from 'react';
import { TripService } from '../services/trip.service';
import CreateTripModal from './CreateTripModal';
import AcceptInvitationModal from './AcceptInvitationModal';
import TripWorkspace from './TripWorkspace';
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
  Trash2
} from 'lucide-react';

export default function TripsDashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTripId, setActiveTripId] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

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

  const handleDeleteTrip = async (e, tripId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this trip and its itinerary?')) return;
    try {
      await TripService.deleteTrip(tripId);
      setTrips(trips.filter((t) => t._id !== tripId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete trip');
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
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-sky-400" />
            Your Collaborative Trips
          </h2>
          <p className="text-xs text-slate-400">Plan itineraries, manage group access, and trigger AI travel synthesis</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <Mail className="w-4 h-4 text-emerald-400" /> Accept Invite
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" /> New Trip
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search trips..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </form>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="planning">Planning</option>
            <option value="confirmed">Confirmed</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Trip Cards Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-xs text-slate-400">Loading trips...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="py-16 text-center bg-slate-800/20 border border-dashed border-slate-800 rounded-2xl">
          <Compass className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No trips found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You don&apos;t have any trips matching your criteria. Create a new trip or accept an invite to get started.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-4 py-2 bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 rounded-xl text-xs font-semibold"
          >
            Create Your First Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip) => {
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
                onClick={() => setActiveTripId(trip._id)}
                className="group relative bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 hover:border-sky-500/50 rounded-2xl p-5 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {trip.status}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">
                        {trip.visibility}
                      </span>
                      <button
                        onClick={(e) => handleDeleteTrip(e, trip._id)}
                        className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete trip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                    {trip.title}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      <span>{trip.destinationId?.name || 'Destination'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {startDate} &ndash; {endDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400/80" />
                      <span>
                        {trip.budget?.currency} {trip.budget?.targetAmount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-700/40 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {participantsCount} {participantsCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  <span className="text-sky-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold text-[11px]">
                    Open Workspace <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTripCreated={(newTrip) => {
          setTrips([newTrip, ...trips]);
          setActiveTripId(newTrip._id);
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

