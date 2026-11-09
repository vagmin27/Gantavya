import { ItineraryDay } from './itinerary-day.model.js';
import { Trip } from '../trips/trip.model.js';
import { Activity } from '../activities/activity.model.js';

export class ItineraryService {
  /**
   * Helper to verify if user has edit access to the trip.
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
        const error = new Error('Forbidden: You do not have permission to modify this trip itinerary');
        error.statusCode = 403;
        throw error;
      }
    }

    return trip;
  }

  static async listDaysForTrip(tripId) {
    return await ItineraryDay.find({ tripId }).sort({ dayNumber: 1 });
  }

  static async getDayById(id) {
    const day = await ItineraryDay.findById(id);
    if (!day) {
      const error = new Error('Itinerary day not found');
      error.statusCode = 404;
      throw error;
    }
    return day;
  }

  static async createDay(dayData, userId = null) {
    const trip = await this.verifyTripEditAccess(dayData.tripId, userId);

    // Validate that calendarDate is within trip startDate and endDate
    const calDate = new Date(dayData.calendarDate);
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);

    // Normalize to date comparison without time-of-day offsets
    const calMidnight = new Date(calDate).setHours(0, 0, 0, 0);
    const startMidnight = new Date(startDate).setHours(0, 0, 0, 0);
    const endMidnight = new Date(endDate).setHours(23, 59, 59, 999);

    if (calMidnight < startMidnight || calMidnight > endMidnight) {
      const error = new Error('Itinerary day calendar date is outside the trip start and end dates');
      error.statusCode = 422;
      throw error;
    }

    const existing = await ItineraryDay.findOne({
      tripId: dayData.tripId,
      dayNumber: dayData.dayNumber
    });

    if (existing) {
      const error = new Error(`Day ${dayData.dayNumber} already exists for this trip`);
      error.statusCode = 409;
      throw error;
    }

    const day = new ItineraryDay(dayData);
    return await day.save();
  }

  static async updateDay(id, updateData, userId = null) {
    const day = await ItineraryDay.findById(id);
    if (!day) {
      const error = new Error('Itinerary day not found');
      error.statusCode = 404;
      throw error;
    }

    const trip = await this.verifyTripEditAccess(day.tripId, userId);

    if (updateData.calendarDate) {
      const calDate = new Date(updateData.calendarDate);
      const calMidnight = new Date(calDate).setHours(0, 0, 0, 0);
      const startMidnight = new Date(trip.startDate).setHours(0, 0, 0, 0);
      const endMidnight = new Date(trip.endDate).setHours(23, 59, 59, 999);

      if (calMidnight < startMidnight || calMidnight > endMidnight) {
        const error = new Error('Itinerary day calendar date is outside the trip start and end dates');
        error.statusCode = 422;
        throw error;
      }
    }

    return await ItineraryDay.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });
  }

  static async deleteDay(id, userId = null) {
    const day = await ItineraryDay.findById(id);
    if (!day) {
      const error = new Error('Itinerary day not found');
      error.statusCode = 404;
      throw error;
    }

    await this.verifyTripEditAccess(day.tripId, userId);

    // Cascade delete associated activities
    await Activity.deleteMany({ itineraryDayId: id });
    await ItineraryDay.findByIdAndDelete(id);

    return { message: 'Itinerary day and associated activities deleted successfully' };
  }

  static async reorderDays(tripId, dayOrders, userId = null) {
    await this.verifyTripEditAccess(tripId, userId);

    if (!Array.isArray(dayOrders) || dayOrders.length === 0) {
      const error = new Error('dayOrders array is required');
      error.statusCode = 422;
      throw error;
    }

    // Step 1: Temporarily set negative day numbers to avoid unique compound index clashes
    for (let i = 0; i < dayOrders.length; i++) {
      const { dayId } = dayOrders[i];
      await ItineraryDay.findByIdAndUpdate(dayId, { dayNumber: -(i + 1) });
    }

    // Step 2: Set target day numbers
    const updatedDays = [];
    for (const order of dayOrders) {
      const { dayId, newDayNumber } = order;
      const updated = await ItineraryDay.findByIdAndUpdate(
        dayId,
        { dayNumber: newDayNumber },
        { new: true, runValidators: true }
      );
      if (updated) updatedDays.push(updated);
    }

    return updatedDays.sort((a, b) => a.dayNumber - b.dayNumber);
  }
}
