import { ItineraryDay } from './itinerary-day.model.js';

export class ItineraryService {
  static async listDaysForTrip(tripId) {
    return await ItineraryDay.find({ tripId }).sort({ dayNumber: 1 });
  }

  static async getDayById(id) {
    return await ItineraryDay.findById(id);
  }

  static async createDay(dayData) {
    const existing = await ItineraryDay.findOne({
      tripId: dayData.tripId,
      dayNumber: dayData.dayNumber
    });

    if (existing) {
      throw new Error(`Day ${dayData.dayNumber} already exists for this trip`);
    }

    const day = new ItineraryDay(dayData);
    return await day.save();
  }

  static async updateDay(id, updateData) {
    return await ItineraryDay.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });
  }

  static async deleteDay(id) {
    return await ItineraryDay.findByIdAndDelete(id);
  }
}

