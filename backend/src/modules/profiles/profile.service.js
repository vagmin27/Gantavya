import { TravellerProfile } from './profile.model.js';

export class ProfileService {
  static async getProfileByUserId(userId) {
    return await TravellerProfile.findOne({ userId });
  }

  static async upsertProfile(userId, profileData) {
    return await TravellerProfile.findOneAndUpdate(
      { userId },
      { ...profileData, userId },
      { new: true, upsert: true, runValidators: true }
    );
  }
}

