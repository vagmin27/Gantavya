import { ProfileService } from './profile.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { validateProfileUpdate } from './profile.validation.js';

export class ProfileController {
  static async getProfile(req, res, next) {
    try {
      const userId = req.user?.id || req.params.userId;
      if (!userId) {
        return ApiResponse.error(res, 'User ID is required', 400);
      }

      const profile = await ProfileService.getProfileByUserId(userId);
      if (!profile) {
        return ApiResponse.error(res, 'Traveller profile not found', 404);
      }

      return ApiResponse.success(res, profile, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const userId = req.user?.id || req.params.userId;
      if (!userId) {
        return ApiResponse.error(res, 'User ID is required', 400);
      }

      const { isValid, errors } = validateProfileUpdate(req.body);
      if (!isValid) {
        return ApiResponse.error(res, 'Validation error', 422, errors);
      }

      const updatedProfile = await ProfileService.upsertProfile(userId, req.body);
      return ApiResponse.success(res, updatedProfile, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static getStatus(req, res) {
    return ApiResponse.success(res, { module: 'profiles', initialized: true }, 'Profiles module initialized');
  }
}

