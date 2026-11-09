import { Activity } from './activity.model.js';
import { ItineraryDay } from '../itineraries/itinerary-day.model.js';
import { Trip } from '../trips/trip.model.js';
import { TripService } from '../trips/trip.service.js';
import { Place } from '../places/place.model.js';

export class ActivityService {
  /**
   * Helper to verify trip edit access for activities.
   */
  static async verifyTripEditAccess(tripId, userId) {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      const error = new Error('Trip not found');
      error.statusCode = 404;
      throw error;
    }

    if (!userId) {
      const error = new Error('Unauthorized: Authentication required to modify activities');
      error.statusCode = 401;
      throw error;
    }

    const isOwner = trip.ownerId.toString() === userId.toString();
    const participant = trip.participants.find(
      (p) => p.userId.toString() === userId.toString() && p.membershipStatus === 'active'
    );
    const canEdit = isOwner || (participant && ['owner', 'organizer', 'editor'].includes(participant.role));
    if (!canEdit) {
      const error = new Error('Forbidden: You do not have permission to modify activities on this trip');
      error.statusCode = 403;
      throw error;
    }

    return trip;
  }

  static async listActivitiesForDay(itineraryDayId, userId = null) {
    const day = await ItineraryDay.findById(itineraryDayId);
    if (!day) {
      const error = new Error('Itinerary day not found');
      error.statusCode = 404;
      throw error;
    }
    await TripService.getTripById(day.tripId, userId);

    return await Activity.find({ itineraryDayId })
      .sort({ sequence: 1 })
      .populate('placeId', 'name category location rating priceInfo');
  }

  static async getActivityById(id, userId = null) {
    const activity = await Activity.findById(id).populate(
      'placeId',
      'name category location rating priceInfo'
    );
    if (!activity) {
      const error = new Error('Activity not found');
      error.statusCode = 404;
      throw error;
    }
    await TripService.getTripById(activity.tripId, userId);
    return activity;
  }

  static async createActivity(activityData, userId = null) {
    // Verify itinerary day exists
    const day = await ItineraryDay.findById(activityData.itineraryDayId);
    if (!day) {
      const error = new Error('Itinerary day not found');
      error.statusCode = 404;
      throw error;
    }

    const effectiveTripId = activityData.tripId || day.tripId;
    // Verify trip edit permission
    await this.verifyTripEditAccess(effectiveTripId, userId);

    // If placeId provided, verify Place exists
    if (activityData.placeId) {
      const place = await Place.findById(activityData.placeId);
      if (!place) {
        const error = new Error('Referenced place not found');
        error.statusCode = 404;
        throw error;
      }
    }

    // Auto-calculate sequence if omitted
    let sequence = activityData.sequence;
    if (!sequence) {
      const lastActivity = await Activity.findOne({ itineraryDayId: day._id }).sort({ sequence: -1 });
      sequence = lastActivity ? lastActivity.sequence + 1 : 1;
    } else {
      const existing = await Activity.findOne({
        itineraryDayId: activityData.itineraryDayId,
        sequence
      });

      if (existing) {
        const error = new Error(
          `Sequence position ${sequence} already exists in this itinerary day`
        );
        error.statusCode = 409;
        throw error;
      }
    }

    // Auto-calculate durationMinutes if omitted
    let durationMinutes = activityData.durationMinutes;
    if (!durationMinutes) {
      if (activityData.startTime && activityData.endTime) {
        const [sh, sm] = activityData.startTime.split(':').map(Number);
        const [eh, em] = activityData.endTime.split(':').map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        durationMinutes = diff > 0 ? diff : 60;
      } else {
        durationMinutes = 60;
      }
    }

    const activity = new Activity({
      ...activityData,
      tripId: effectiveTripId,
      sequence,
      durationMinutes,
      status: activityData.status || 'planned'
    });

    return await activity.save();
  }

  static async updateActivity(id, updateData, userId = null) {
    const activity = await Activity.findById(id);
    if (!activity) {
      const error = new Error('Activity not found');
      error.statusCode = 404;
      throw error;
    }

    await this.verifyTripEditAccess(activity.tripId, userId);

    // If placeId updated, verify it exists
    if (updateData.placeId) {
      const place = await Place.findById(updateData.placeId);
      if (!place) {
        const error = new Error('Referenced place not found');
        error.statusCode = 404;
        throw error;
      }
    }

    return await Activity.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).populate('placeId', 'name category location rating priceInfo');
  }

  static async deleteActivity(id, userId = null) {
    const activity = await Activity.findById(id);
    if (!activity) {
      const error = new Error('Activity not found');
      error.statusCode = 404;
      throw error;
    }

    await this.verifyTripEditAccess(activity.tripId, userId);
    await Activity.findByIdAndDelete(id);

    return { message: 'Activity deleted successfully' };
  }

  static async reorderActivities(itineraryDayId, activityOrders, userId = null) {
    const day = await ItineraryDay.findById(itineraryDayId);
    if (!day) {
      const error = new Error('Itinerary day not found');
      error.statusCode = 404;
      throw error;
    }

    await this.verifyTripEditAccess(day.tripId, userId);

    if (!Array.isArray(activityOrders) || activityOrders.length === 0) {
      const error = new Error('activityOrders array is required');
      error.statusCode = 422;
      throw error;
    }

    // Step 1: Temporarily set negative sequence numbers to avoid unique index collisions
    for (let i = 0; i < activityOrders.length; i++) {
      const { activityId } = activityOrders[i];
      await Activity.findByIdAndUpdate(activityId, { sequence: -(i + 1) });
    }

    // Step 2: Set target sequence numbers
    const updatedActivities = [];
    for (const order of activityOrders) {
      const { activityId, newSequence } = order;
      const updated = await Activity.findByIdAndUpdate(
        activityId,
        { sequence: newSequence },
        { new: true, runValidators: true }
      );
      if (updated) updatedActivities.push(updated);
    }

    return updatedActivities.sort((a, b) => a.sequence - b.sequence);
  }
}
