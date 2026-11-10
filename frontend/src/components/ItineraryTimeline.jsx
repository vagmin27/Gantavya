import React, { useState, useEffect } from 'react';
import { TripService } from '../services/trip.service';
import {
  Clock,
  Navigation,
  Car,
  Plane,
  Train,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  MapPin,
  DollarSign
} from 'lucide-react';

export default function ItineraryTimeline({
  dayId,
  dayNumber,
  tripId,
  currency = 'INR',
  canEdit = false,
  onTimelineUpdated
}) {
  const [timeline, setTimeline] = useState([]);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [travelStats, setTravelStats] = useState({ distanceKm: 0, durationMinutes: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTimeline = async () => {
    if (!dayId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await TripService.getDayTimeline(dayId);
      const data = res.data || {};
      setTimeline(data.timeline || []);
      setHasConflicts(Boolean(data.hasConflicts));
      setConflicts(data.conflicts || []);
      setTravelStats({
        distanceKm: data.travelDistanceKm || 0,
        durationMinutes: data.travelDurationMinutes || 0
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [dayId]);

  const handleIntegrateTransportation = async () => {
    if (!canEdit) return;
    try {
      setActionLoading(true);
      setError(null);
      await TripService.integrateTransportation(dayId);
      await loadTimeline();
      if (onTimelineUpdated) onTimelineUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to integrate transportation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecalculateSchedule = async () => {
    if (!canEdit) return;
    try {
      setActionLoading(true);
      setError(null);
      await TripService.recalculateTrip(tripId, dayNumber);
      await loadTimeline();
      if (onTimelineUpdated) onTimelineUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to recalculate schedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAlternative = async (transitionId, routeCategory) => {
    if (!canEdit) return;
    try {
      setActionLoading(true);
      await TripService.selectTransitAlternative(dayId, { transitionId, routeCategory });
      await loadTimeline();
      if (onTimelineUpdated) onTimelineUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to switch alternative route');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTransitionLock = async (transitionId, currentLocked) => {
    if (!canEdit) return;
    try {
      await TripService.lockTransition(dayId, transitionId, !currentLocked);
      await loadTimeline();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle transition lock');
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getModeIcon = (item) => {
    const title = (item.title || '').toLowerCase();
    if (title.includes('flight') || title.includes('air')) return <Plane className="w-4 h-4 text-sky-400" />;
    if (title.includes('train') || title.includes('rail')) return <Train className="w-4 h-4 text-amber-400" />;
    return <Car className="w-4 h-4 text-emerald-400" />;
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
        Loading Day {dayNumber} timeline...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Toolbar & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 text-xs">
        <div className="flex items-center gap-4 text-slate-300">
          <span className="font-semibold text-white">Day {dayNumber} Transit:</span>
          <span>{travelStats.distanceKm} km</span>
          <span>{travelStats.durationMinutes} mins</span>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleIntegrateTransportation}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/30 font-medium transition-all"
            >
              <Navigation className="w-3.5 h-3.5" />
              Integrate Transit
            </button>
            <button
              onClick={handleRecalculateSchedule}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/20 text-sky-300 border border-sky-500/30 rounded-lg hover:bg-sky-600/30 font-medium transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
              Recalculate
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-900/30 border border-rose-500/40 rounded-xl text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Conflict Diagnostic Banner */}
      {hasConflicts && conflicts.length > 0 && (
        <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            Scheduling Conflict Detected ({conflicts.length})
          </div>
          <div className="space-y-1.5">
            {conflicts.map((conf, idx) => (
              <div key={conf.conflictId || idx} className="text-xs text-amber-200/90 pl-6 border-l-2 border-amber-500/40">
                <p className="font-semibold">{conf.message}</p>
                {conf.suggestedAction && (
                  <p className="text-[11px] text-amber-300/70 italic mt-0.5">
                    Suggestion: {conf.suggestedAction}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chronological Timeline Container */}
      {timeline.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">
          No scheduled items for this day. Click &ldquo;Integrate Transit&rdquo; to plan routes.
        </p>
      ) : (
        <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-700/50">
          {timeline.map((item) => {
            if (item.type === 'transit') {
              return (
                <div
                  key={item.id}
                  className={`relative pl-9 p-3.5 rounded-xl border transition-all ${
                    item.isLocked
                      ? 'bg-slate-900/80 border-cyan-500/40'
                      : 'bg-slate-800/80 border-slate-700/80'
                  }`}
                >
                  <div className="absolute left-2.5 top-4 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-emerald-400 flex items-center justify-center -translate-x-1/2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getModeIcon(item)}
                        <h5 className="text-xs font-bold text-white tracking-wide">
                          {item.title}
                        </h5>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 capitalize font-mono">
                          {item.selectedCategory?.replace('_', ' ')}
                        </span>
                        {item.isOvernight && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 font-mono">
                            Overnight (+1)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {formatTime(item.startTime)} &ndash; {formatTime(item.endTime)}
                        </span>
                        <span>{item.durationMinutes} mins</span>
                        <span>{Math.round((item.distanceMeters || 0) / 1000)} km</span>
                      </div>

                      {/* Alternatives Buttons */}
                      {item.alternativeCategories && item.alternativeCategories.length > 1 && canEdit && (
                        <div className="pt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Alternatives:</span>
                          {item.alternativeCategories.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => handleSelectAlternative(item.entityId, cat)}
                              className={`text-[10px] px-2 py-0.5 rounded-md border capitalize font-mono transition-all ${
                                cat === item.selectedCategory
                                  ? 'bg-emerald-600 text-white border-emerald-500'
                                  : 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700'
                              }`}
                            >
                              {cat.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {canEdit && (
                      <button
                        onClick={() => handleToggleTransitionLock(item.entityId, item.isLocked)}
                        title={item.isLocked ? 'Locked (Frozen)' : 'Unlocked'}
                        className={`p-1.5 rounded-lg border transition-all ${
                          item.isLocked
                            ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                            : 'bg-slate-700/40 border-slate-600/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        {item.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            if (item.type === 'accommodation') {
              return (
                <div
                  key={item.id}
                  className="relative pl-9 p-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs"
                >
                  <div className="absolute left-2.5 top-4 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-indigo-400 flex items-center justify-center -translate-x-1/2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-white">{item.title}</h5>
                      <p className="text-slate-400 mt-0.5">
                        Check-in: {item.checkInTime} &bull; Check-out: {item.checkOutTime}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // Default: Activity Item
            return (
              <div
                key={item.id}
                className={`relative pl-9 p-3.5 rounded-xl border transition-all ${
                  item.status === 'completed'
                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                    : 'bg-slate-800/60 border-slate-700/60'
                }`}
              >
                <div className="absolute left-2.5 top-4 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-sky-400 flex items-center justify-center -translate-x-1/2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5
                        className={`text-sm font-semibold text-white ${
                          item.status === 'completed' ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {item.title}
                      </h5>
                      {item.isLocked && (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                          <Lock className="w-2.5 h-2.5" /> Fixed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatTime(item.startTime)} &ndash; {formatTime(item.endTime)}
                      </span>
                      <span>{item.durationMinutes} mins</span>
                      {item.estimatedCost > 0 && (
                        <span className="text-amber-400/90 font-mono">
                          {currency} {item.estimatedCost}
                        </span>
                      )}
                    </div>

                    {item.location && item.location.name && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {item.location.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

