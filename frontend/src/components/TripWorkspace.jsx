import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TripService } from '../services/trip.service';
import { useAuth } from '../context/AuthContext';
import ItineraryTimeline from './ItineraryTimeline';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Avatar from './ui/Avatar';
import Dialog from './ui/Dialog';
import Input from './ui/Input';
import Spinner from './ui/Spinner';
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
  UserPlus,
  AlertTriangle,
  MapPin,
  Compass
} from 'lucide-react';

export default function TripWorkspace({ tripId: propTripId, onBack: propOnBack }) {
  // Safe Router params & navigation support
  let routeParams = {};
  let navigate = null;
  try {
    routeParams = useParams() || {};
  } catch (e) {
    routeParams = {};
  }
  try {
    navigate = useNavigate();
  } catch (e) {
    navigate = null;
  }

  const effectiveTripId = propTripId || routeParams.tripId;
  const handleBack = () => {
    if (propOnBack) {
      propOnBack();
    } else if (navigate) {
      navigate('/trips');
    }
  };

  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activeViewTab, setActiveViewTab] = useState('timeline');
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
      const tripRes = await TripService.getTrip(effectiveTripId);
      setTrip(tripRes.data);

      const daysRes = await TripService.getItineraryDays(effectiveTripId);
      setDays(daysRes.data || []);

      if (daysRes.data && daysRes.data.length > 0) {
        setSelectedDayId((prev) => {
          const exists = daysRes.data.some((d) => d._id === prev);
          return exists ? prev : daysRes.data[0]._id;
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load trip workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveTripId) {
      loadTripData();
    }
  }, [effectiveTripId]);

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
      await TripService.generateItinerary(effectiveTripId, { confirmOverwrite });
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
      const res = await TripService.inviteParticipant(effectiveTripId, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      setInviteMessage({
        type: 'success',
        text: `Invitation sent! Token: ${res.data.token}`
      });
      setInviteEmail('');
      const updated = await TripService.getTrip(effectiveTripId);
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
      await TripService.cancelInvitation(effectiveTripId, invitationId);
      const updated = await TripService.getTrip(effectiveTripId);
      setTrip(updated.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel invitation');
    }
  };

  const handleRoleChange = async (participantId, newRole) => {
    try {
      await TripService.updateParticipantRole(effectiveTripId, participantId, newRole);
      const updated = await TripService.getTrip(effectiveTripId);
      setTrip(updated.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update participant role');
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    if (!window.confirm('Are you sure you want to remove this participant?')) return;
    try {
      await TripService.removeParticipant(effectiveTripId, participantId);
      const updated = await TripService.getTrip(effectiveTripId);
      setTrip(updated.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove participant');
    }
  };

  const handleToggleActivityStatus = async (activity) => {
    if (!canEdit) return;
    const nextStatus = activity.status === 'completed' ? 'planned' : 'completed';
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
      let durationMinutes = 60;
      if (newActivity.startTime && newActivity.endTime) {
        const [sh, sm] = newActivity.startTime.split(':').map(Number);
        const [eh, em] = newActivity.endTime.split(':').map(Number);
        const diff = eh * 60 + em - (sh * 60 + sm);
        durationMinutes = diff > 0 ? diff : 60;
      }

      const payload = {
        itineraryDayId: selectedDayId,
        tripId: effectiveTripId,
        title: newActivity.title.trim(),
        startTime: newActivity.startTime,
        endTime: newActivity.endTime,
        durationMinutes,
        sequence: activities.length + 1,
        type: newActivity.type,
        estimatedCost: Number(newActivity.estimatedCost) || 0,
        description: newActivity.notes.trim() || undefined
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
        <Spinner size="lg" className="mx-auto mb-4 text-primary" />
        <p className="text-xs md:text-sm text-muted">Loading trip workspace...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-muted">Trip not found or unauthorized.</p>
        <Button variant="secondary" onClick={handleBack}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const selectedDay = days.find((d) => d._id === selectedDayId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs">
        <div className="space-y-2.5">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-main transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Trips
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-black font-heading text-main tracking-tight">
              {trip.title}
            </h2>
            <Badge
              variant={
                trip.status === 'confirmed'
                  ? 'success'
                  : trip.status === 'planning'
                  ? 'primary'
                  : 'default'
              }
              size="sm"
            >
              {trip.status}
            </Badge>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-card-muted text-muted border border-border">
              {trip.visibility}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>{trip.destinationId?.name || 'Custom Destination'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted" />
              <span>
                {new Date(trip.startDate).toLocaleDateString()} &ndash;{' '}
                {new Date(trip.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-500" />
              <span>
                Budget: {trip.budget?.currency} {trip.budget?.targetAmount?.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                Your Role: <strong className="text-main capitalize">{userRole}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* AI Itinerary Trigger */}
        <div className="flex items-center gap-3">
          {canEdit && (
            <Button
              variant="primary"
              size="md"
              loading={generating}
              onClick={() => handleGenerateItinerary(false)}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              {generating ? 'Generating Plan...' : 'Generate AI Itinerary'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Workspace Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Itinerary Days & Activities (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Day Selector Tabs */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-heading text-main flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Itinerary Schedule ({days.length} Days)
              </h3>
            </div>

            {days.length === 0 ? (
              <div className="py-8 text-center bg-card-muted/60 rounded-xl border border-dashed border-border p-4">
                <Sparkles className="w-8 h-8 text-primary/60 mx-auto mb-2" />
                <p className="text-xs text-main font-semibold">No itinerary days generated yet.</p>
                <p className="text-[11px] text-muted mt-1">
                  Click &ldquo;Generate AI Itinerary&rdquo; to formulate a multi-day plan via the intelligence engine.
                </p>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {days.map((d) => (
                  <button
                    key={d._id}
                    onClick={() => setSelectedDayId(d._id)}
                    className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium border transition-all text-left ${
                      selectedDayId === d._id
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                        : 'bg-card border-border text-muted hover:text-main hover:bg-card-muted'
                    }`}
                  >
                    <div>Day {d.dayNumber}</div>
                    <div className="text-[10px] text-muted font-mono">
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
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h4 className="text-base font-bold font-heading text-main">
                    Day {selectedDay.dayNumber}: {selectedDay.theme || 'Exploration & Activities'}
                  </h4>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(selectedDay.calendarDate).toDateString()}
                  </p>
                </div>
                {canEdit && activeViewTab === 'activities' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAddActivity(!showAddActivity)}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Activity
                  </Button>
                )}
              </div>

              {/* View Switcher: Multimodal Timeline vs Activities */}
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <button
                  type="button"
                  onClick={() => setActiveViewTab('timeline')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeViewTab === 'timeline'
                      ? 'bg-primary text-primary-fg shadow-xs font-bold'
                      : 'text-muted hover:text-main hover:bg-card-muted'
                  }`}
                >
                  Multimodal Timeline & Transit
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewTab('activities')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeViewTab === 'activities'
                      ? 'bg-primary text-primary-fg shadow-xs font-bold'
                      : 'text-muted hover:text-main hover:bg-card-muted'
                  }`}
                >
                  Activity List ({activities.length})
                </button>
              </div>

              {activeViewTab === 'timeline' ? (
                <ItineraryTimeline
                  dayId={selectedDayId}
                  dayNumber={selectedDay.dayNumber}
                  tripId={effectiveTripId}
                  currency={trip?.budget?.currency || 'INR'}
                  canEdit={canEdit}
                  onTimelineUpdated={loadTripData}
                />
              ) : (
                <>
                  {/* Add Activity Inline Form */}
                  {showAddActivity && (
                    <form
                      onSubmit={handleAddActivity}
                      className="p-4 bg-card-muted/60 border border-border rounded-xl space-y-3"
                    >
                      <h5 className="text-xs font-bold font-heading text-main">New Custom Activity</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          label="Title"
                          placeholder="e.g. Sunrise view at Sarangkot"
                          value={newActivity.title}
                          onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                          required
                        />
                        <div>
                          <label className="block text-xs font-semibold text-main mb-1.5">
                            Activity Type
                          </label>
                          <select
                            value={newActivity.type}
                            onChange={(e) =>
                              setNewActivity({ ...newActivity, type: e.target.value })
                            }
                            className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs md:text-sm text-main focus:outline-none focus:border-primary transition-colors"
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
                        <Input
                          label="Start Time"
                          type="time"
                          value={newActivity.startTime}
                          onChange={(e) =>
                            setNewActivity({ ...newActivity, startTime: e.target.value })
                          }
                        />
                        <Input
                          label="End Time"
                          type="time"
                          value={newActivity.endTime}
                          onChange={(e) =>
                            setNewActivity({ ...newActivity, endTime: e.target.value })
                          }
                        />
                        <Input
                          label={`Cost (${trip.budget?.currency})`}
                          type="number"
                          min="0"
                          value={newActivity.estimatedCost}
                          onChange={(e) =>
                            setNewActivity({ ...newActivity, estimatedCost: e.target.value })
                          }
                        />
                      </div>

                      <Input
                        label="Notes / Description"
                        placeholder="Optional notes or tips"
                        value={newActivity.notes}
                        onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                      />

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddActivity(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="sm">
                          Save Activity
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Activity Timeline List */}
                  {activities.length === 0 ? (
                    <p className="text-xs text-muted py-6 text-center">
                      No activities registered for Day {selectedDay.dayNumber}. Add one above or let AI populate it.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((act) => (
                        <div
                          key={act._id}
                          className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                            act.status === 'completed'
                              ? 'bg-card-muted/40 border-border opacity-60'
                              : 'bg-card border-border hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleActivityStatus(act)}
                              disabled={!canEdit}
                              className="mt-0.5 text-muted hover:text-emerald-500 transition-colors"
                            >
                              {act.status === 'completed' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5
                                  className={`text-sm font-semibold text-main ${
                                    act.status === 'completed' ? 'line-through text-muted' : ''
                                  }`}
                                >
                                  {act.title}
                                </h5>
                                <Badge variant="default" size="sm">
                                  {act.type}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-muted mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-muted" />
                                  {act.startTime} &ndash; {act.endTime}
                                </span>
                                {(act.estimatedCost > 0 || act.cost > 0) && (
                                  <span className="flex items-center gap-0.5 text-amber-500 font-mono">
                                    {trip.budget?.currency} {act.estimatedCost || act.cost}
                                  </span>
                                )}
                              </div>

                              {(act.description || act.notes) && (
                                <p className="text-xs text-muted mt-1.5 italic bg-card-muted px-2.5 py-1 rounded-lg">
                                  &ldquo;{act.description || act.notes}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          {canEdit && (
                            <button
                              onClick={() => handleDeleteActivity(act._id)}
                              className="text-muted hover:text-rose-500 p-1 rounded-lg hover:bg-card-muted transition-colors"
                              title="Delete activity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Group Collaboration & Participants (1 col) */}
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold font-heading text-main flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
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
                    className="flex items-center justify-between bg-card-muted/60 p-3 rounded-xl border border-border text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={pName} size="sm" />
                      <div>
                        <div className="font-semibold text-main">{pName}</div>
                        <div className="text-[10px] text-muted">{pEmail}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner && !isThisOwner ? (
                        <select
                          value={p.role}
                          onChange={(e) => handleRoleChange(pId, e.target.value)}
                          className="bg-card border border-border text-main text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-primary transition-colors"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-card text-muted border border-border">
                          {p.role}
                        </span>
                      )}

                      {isOwner && !isThisOwner && (
                        <button
                          onClick={() => handleRemoveParticipant(pId)}
                          className="text-muted hover:text-rose-500 p-1"
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
              <form onSubmit={handleSendInvite} className="pt-3 border-t border-border space-y-3">
                <h4 className="text-xs font-bold font-heading text-main flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-primary" /> Invite Collaborator
                </h4>

                {inviteMessage && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 ${
                      inviteMessage.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}
                  >
                    <span>{inviteMessage.text}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="collaborator@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />

                  <div className="flex gap-2">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="bg-card border border-border text-main text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-primary flex-1 transition-colors"
                    >
                      <option value="editor">Editor (Can edit plan)</option>
                      <option value="viewer">Viewer (Read-only)</option>
                    </select>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={inviteLoading}
                    >
                      {inviteLoading ? 'Sending...' : 'Invite'}
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* Pending Invitations */}
            {trip.invitations &&
              trip.invitations.filter((i) => i.status === 'pending').length > 0 && (
                <div className="pt-3 border-t border-border space-y-2">
                  <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    Pending Invitations
                  </h4>
                  <div className="space-y-2">
                    {trip.invitations
                      .filter((i) => i.status === 'pending')
                      .map((inv) => (
                        <div
                          key={inv._id}
                          className="p-2.5 bg-card-muted/80 border border-border rounded-xl text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-main">{inv.email}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card text-muted uppercase">
                              {inv.role}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-muted break-all bg-card p-1.5 rounded-lg border border-border/50">
                            Token: {inv.token}
                          </div>
                          {isOwner && (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => handleCancelInvite(inv._id)}
                                className="text-[10px] text-rose-500 hover:underline"
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

      {/* Overwrite Confirmation Dialog */}
      <Dialog
        isOpen={overwriteModalOpen}
        onClose={() => setOverwriteModalOpen(false)}
        title="Overwrite Existing Plan?"
        description="This trip already contains generated itinerary days and activities. Generating a new plan will replace existing records."
        maxWidth="max-w-md"
      >
        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <Button variant="ghost" onClick={() => setOverwriteModalOpen(false)}>
            Keep Existing
          </Button>
          <Button
            variant="danger"
            loading={generating}
            onClick={() => handleGenerateItinerary(true)}
          >
            {generating ? 'Overwriting...' : 'Confirm Overwrite'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
