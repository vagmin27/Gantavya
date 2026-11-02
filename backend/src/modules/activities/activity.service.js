import { Activity } from './activity.model.js';

export class ActivityService {
  static async listActivitiesForDay(itineraryDayId) {
    return await Activity.find({ itineraryDayId })
      .sort({ sequence: 1 })
      .populate('placeId', 'name category location rating priceInfo');
  }

  static async getActivityById(id) {
    return await Activity.findById(id).populate(
      'placeId',
      'name category location rating priceInfo'
    );
  }

  static async createActivity(activityData) {
    const existing = await Activity.findOne({
      itineraryDayId: activityData.itineraryDayId,
      sequence: activityData.sequence
    });

    if (existing) {
      throw new Error(
        `Sequence position ${activityData.sequence} already exists in this itinerary day`
      );
    }

    const activity = new Activity(activityData);
    return await activity.save();
  }

  static async updateActivity(id, updateData) {
    return await Activity.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });
  }

  static async deleteActivity(id) {
    return await Activity.findByIdAndDelete(id);
  }
}

