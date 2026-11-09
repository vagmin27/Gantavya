import { Activity } from './activity.model.js';
import { ItineraryDay } from '../itineraries/itinerary-day.model.js';
import { Trip } from '../trips/trip.model.js';
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

    if (userId) {
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
    }

    return trip;
  }

  static async listActivitiesForDay(itineraryDayId) {
    return await Activity.find({ itineraryDayId })
      .sort({ sequence: 1 })
      .populate('placeId', 'name category location rating priceInfo');
  }

  static async getActivityById(id) {
    const activity = await Activity.findById(id).populate(
      'placeId',
      'name category location rating priceInfo'
    );
    if (!activity) {
      const error = new Error('Activity not found');
      error.statusCode = 404;
      throw error;
    }
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

    // Verify trip edit permission
    await this.verifyTripEditAccess(activityData.tripId || day.tripId, userId);

    // If placeId provided, verify Place exists
    if (activityData.placeId) {
      const place = await Place.findById(activityData.placeId);
      if (!place) {
        const error = new Error('Referenced place not found');
        error.statusCode = 404;
        throw error;
      }
    }

    const existing = await Activity.findOne({
      itineraryDayId: activityData.itineraryDayId,
      sequence: activityData.sequence
    });

    if (existing) {
      const error = new Error(
        `Sequence position ${activityData.sequence} already exists in this itinerary day`
      );
      error.statusCode = 409;
      throw error;
    }

    const activity = new Activity({
      ...activityData,
      tripId: activityData.tripId || day.tripId
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
