import React, { useState, useEffect } from 'react';
import { TripService } from '../services/trip.service';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  Sparkles,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  Shield,
  UserCheck,
  UserPlus,
  AlertTriangle,
  MapPin,
  Tag
} from 'lucide-react';

export default function TripWorkspace({ tripId, onBack }) {
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [overwriteModalOpen, setOverwriteModalOpen] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(null);

  // Add activity form state
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: '',
    startTime: '09:00',
    endTime: '11:00',
    type: 'sightseeing',
    estimatedCost: 0,
    notes: ''
  });

  const loadTripData = async () => {
    try {
      setLoading(true);
      setError(null);
      const tripRes = await TripService.getTrip(tripId);
      setTrip(tripRes.data);

      const daysRes = await TripService.getItineraryDays(tripId);
      setDays(daysRes.data || []);

      if (daysRes.data && daysRes.data.length > 0) {
        setSelectedDayId(daysRes.data[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load trip workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      loadTripData();
    }
  }, [tripId]);

  // Load activities when selected day changes
  useEffect(() => {
    if (selectedDayId) {
      TripService.getActivities(selectedDayId)
        .then((res) => setActivities(res.data || []))
        .catch(() => setActivities([]));
    } else {
      setActivities([]);
    }
  }, [selectedDayId]);

  const currentUserId = user?._id || user?.id;
  const isOwner = trip?.ownerId?._id === currentUserId || trip?.ownerId === currentUserId;
  const userParticipant = trip?.participants?.find(
    (p) => (p.userId?._id || p.userId) === currentUserId
  );
  const userRole = isOwner ? 'owner' : userParticipant?.role || 'viewer';
  const canEdit = userRole === 'owner' || userRole === 'editor';

  const handleGenerateItinerary = async (confirmOverwrite = false) => {
    setError(null);
    setGenerating(true);
    try {
      await TripService.generateItinerary(tripId, { confirmOverwrite });
      setOverwriteModalOpen(false);
      await loadTripData();
    } catch (err) {
      if (err.response?.status === 409) {
        setOverwriteModalOpen(true);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to generate itinerary');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteMessage(null);
    try {
      const res = await TripService.inviteParticipant(tripId, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      setInviteMessage({
        type: 'success',
        text: `Invitation sent! Token: ${res.data.token}`
      });
      setInviteEmail('');
      const updated = await TripService.getTrip(tripId);
      setTrip(updated.data);
    } catch (err) {
      setInviteMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to send invite'
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvite = async (invitationId) => {
    try {
      await TripService.cancelInvitation(tripId, invitationId);
      const updated = await TripService.getTrip(tripId);
      setTrip(updated.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel invitation');
    }
  };

  const handleRoleChange = async (participantId, newRole) => {
    try {
      await TripService.updateParticipantRole(tripId, participantId, newRole);
      const updated = await TripService.getTrip(tripId);
      setTrip(updated.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update participant role');
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    if (!window.confirm('Are you sure you want to remove this participant?')) return;
    try {
      await TripService.removeParticipant(tripId, participantId);
      const updated = await TripService.getTrip(tripId);
      setTrip(updated.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove participant');
    }
  };

  const handleToggleActivityStatus = async (activity) => {
    if (!canEdit) return;
    const nextStatus = activity.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await TripService.updateActivity(activity._id, { status: nextStatus });
      setActivities(activities.map((a) => (a._id === activity._id ? res.data : a)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update activity status');
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!canEdit) return;
    try {
      await TripService.deleteActivity(activityId);
      setActivities(activities.filter((a) => a._id !== activityId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete activity');
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!canEdit || !selectedDayId) return;
    try {
      const payload = {
        itineraryDayId: selectedDayId,
        title: newActivity.title.trim(),
        startTime: newActivity.startTime,
        endTime: newActivity.endTime,
        type: newActivity.type,
        cost: Number(newActivity.estimatedCost) || 0,
        notes: newActivity.notes.trim() || undefined
      };
      const res = await TripService.createActivity(payload);
      setActivities([...activities, res.data]);
      setShowAddActivity(false);
      setNewActivity({
        title: '',
        startTime: '09:00',
        endTime: '11:00',
        type: 'sightseeing',
        estimatedCost: 0,
        notes: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add activity');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-sm text-slate-400">Loading trip workspace...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-400 mb-4">Trip not found or unauthorized.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs hover:bg-slate-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const selectedDay = days.find((d) => d._id === selectedDayId);

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm">
        <div className="space-y-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Trips
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-white">{trip.title}</h2>
            <span className="text-xs uppercase font-mono px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {trip.status}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
              {trip.visibility}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-sky-400" />
              <span>{trip.destinationId?.name || 'Custom Destination'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>
                {new Date(trip.startDate).toLocaleDateString()} &ndash;{' '}
                {new Date(trip.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>
                Budget: {trip.budget?.currency} {trip.budget?.targetAmount?.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Your Role: <strong className="text-white capitalize">{userRole}</strong></span>
            </div>
          </div>
        </div>

        {/* AI Itinerary Trigger */}
        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={() => handleGenerateItinerary(false)}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Generating Plan...' : 'Generate AI Itinerary'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Workspace Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Itinerary Days & Activities (2 spans) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Day Selector Tabs */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                Itinerary Schedule ({days.length} Days)
              </h3>
            </div>

            {days.length === 0 ? (
              <div className="py-8 text-center bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                <Sparkles className="w-8 h-8 text-purple-400/60 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-semibold">No itinerary days generated yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click &ldquo;Generate AI Itinerary&rdquo; to formulate a multi-day plan via the intelligence engine.
                </p>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {days.map((d) => (
                  <button
                    key={d._id}
                    onClick={() => setSelectedDayId(d._id)}
                    className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium border transition-all text-left ${
                      selectedDayId === d._id
                        ? 'bg-sky-500/20 border-sky-500 text-white'
                        : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold">Day {d.dayNumber}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(d.calendarDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Activities Container for Selected Day */}
          {selectedDay && (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                <div>
                  <h4 className="text-base font-bold text-white">
                    Day {selectedDay.dayNumber}: {selectedDay.theme || 'Exploration & Activities'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(selectedDay.calendarDate).toDateString()}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => setShowAddActivity(!showAddActivity)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Activity
                  </button>
                )}
              </div>

              {/* Add Activity Inline Form */}
              {showAddActivity && (
                <form
                  onSubmit={handleAddActivity}
                  className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3"
                >
                  <h5 className="text-xs font-bold text-slate-300">New Custom Activity</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Sunrise view at Sarangkot"
                        value={newActivity.title}
                        onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Activity Type</label>
                      <select
                        value={newActivity.type}
                        onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="sightseeing">Sightseeing</option>
                        <option value="adventure">Adventure</option>
                        <option value="dining">Dining</option>
                        <option value="leisure">Leisure</option>
                        <option value="cultural">Cultural</option>
                        <option value="transit">Transit</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={newActivity.startTime}
                        onChange={(e) =>
                          setNewActivity({ ...newActivity, startTime: e.target.value })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">End Time</label>
                      <input
                        type="time"
                        value={newActivity.endTime}
                        onChange={(e) =>
                          setNewActivity({ ...newActivity, endTime: e.target.value })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Cost ({trip.budget?.currency})</label>
                      <input
                        type="number"
                        min="0"
                        value={newActivity.estimatedCost}
                        onChange={(e) =>
                          setNewActivity({ ...newActivity, estimatedCost: e.target.value })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Notes / Description</label>
                    <input
                      type="text"
                      placeholder="Optional notes or tips"
                      value={newActivity.notes}
                      onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddActivity(false)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded-lg hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-sky-500 text-slate-900 font-bold text-xs rounded-lg hover:bg-sky-400"
                    >
                      Save Activity
                    </button>
                  </div>
                </form>
              )}

              {/* Activity Timeline */}
              {activities.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No activities registered for Day {selectedDay.dayNumber}. Add one above or let AI populate it.
                </p>
              ) : (
                <div className="space-y-3">
                  {activities.map((act, idx) => (
                    <div
                      key={act._id}
                      className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        act.status === 'completed'
                          ? 'bg-slate-900/40 border-slate-800 opacity-60'
                          : 'bg-slate-800/60 border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleActivityStatus(act)}
                          disabled={!canEdit}
                          className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                          {act.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5
                              className={`text-sm font-semibold text-white ${
                                act.status === 'completed' ? 'line-through text-slate-400' : ''
                              }`}
                            >
                              {act.title}
                            </h5>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 capitalize">
                              {act.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {act.startTime} &ndash; {act.endTime}
                            </span>
                            {act.cost > 0 && (
                              <span className="flex items-center gap-0.5 text-amber-400/90 font-mono">
                                {trip.budget?.currency} {act.cost}
                              </span>
                            )}
                          </div>

                          {act.notes && (
                            <p className="text-xs text-slate-400/80 mt-1.5 italic bg-slate-900/60 px-2.5 py-1 rounded-lg">
                              &ldquo;{act.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {canEdit && (
                        <button
                          onClick={() => handleDeleteActivity(act._id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-700/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Group Collaboration & Participants (1 span) */}
        <div className="space-y-5">
          {/* Active Participants */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Collaborators ({trip.participants?.length || 1})
              </h3>
            </div>

            <div className="space-y-3">
              {trip.participants?.map((p) => {
                const pUser = p.userId;
                const pId = pUser?._id || pUser;
                const pName = pUser?.name || 'Collaborator';
                const pEmail = pUser?.email || '';
                const isThisOwner = p.role === 'owner';

                return (
                  <div
                    key={pId}
                    className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {pName[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{pName}</div>
                        <div className="text-[10px] text-slate-400">{pEmail}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner && !isThisOwner ? (
                        <select
                          value={p.role}
                          onChange={(e) => handleRoleChange(pId, e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-slate-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {p.role}
                        </span>
                      )}

                      {isOwner && !isThisOwner && (
                        <button
                          onClick={() => handleRemoveParticipant(pId)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Remove participant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Invite Form (Owner or Editor) */}
            {canEdit && (
              <form onSubmit={handleSendInvite} className="pt-3 border-t border-slate-700/50 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-sky-400" /> Invite Collaborator
                </h4>

                {inviteMessage && (
                  <div
                    className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                      inviteMessage.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    <span>{inviteMessage.text}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="collaborator@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    required
                  />

                  <div className="flex gap-2">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none flex-1"
                    >
                      <option value="editor">Editor (Can edit plan)</option>
                      <option value="viewer">Viewer (Read-only)</option>
                    </select>

                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                    >
                      {inviteLoading ? 'Sending...' : 'Invite'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Pending Invitations */}
            {trip.invitations && trip.invitations.filter((i) => i.status === 'pending').length > 0 && (
              <div className="pt-3 border-t border-slate-700/50 space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Pending Invitations
                </h4>
                <div className="space-y-2">
                  {trip.invitations
                    .filter((i) => i.status === 'pending')
                    .map((inv) => (
                      <div
                        key={inv._id}
                        className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{inv.email}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                            {inv.role}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 break-all bg-slate-950 p-1.5 rounded">
                          Token: {inv.token}
                        </div>
                        {isOwner && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleCancelInvite(inv._id)}
                              className="text-[10px] text-rose-400 hover:underline"
                            >
                              Cancel Invitation
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overwrite Confirmation Modal */}
      {overwriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Overwrite Existing Plan?</h3>
            </div>
            <p className="text-xs text-slate-300">
              This trip already contains generated itinerary days and activities. Generating a new plan will replace existing records.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setOverwriteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs hover:bg-slate-700"
              >
                Keep Existing
              </button>
              <button
                onClick={() => handleGenerateItinerary(true)}
                disabled={generating}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-bold"
              >
                {generating ? 'Overwriting...' : 'Confirm Overwrite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

