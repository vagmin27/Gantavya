import { ActivityService } from './activity.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { validateActivityInput } from './activity.validation.js';

export class ActivityController {
  static async listForDay(req, res, next) {
    try {
      const { itineraryDayId } = req.query;
      if (!itineraryDayId) {
        return ApiResponse.error(res, 'Itinerary Day ID query parameter is required', 400);
      }

      const activities = await ActivityService.listActivitiesForDay(itineraryDayId);
      return ApiResponse.success(res, activities, 'Activities retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const activity = await ActivityService.getActivityById(req.params.id);
      if (!activity) {
        return ApiResponse.error(res, 'Activity not found', 404);
      }
      return ApiResponse.success(res, activity, 'Activity retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const { isValid, errors } = validateActivityInput(req.body);
      if (!isValid) {
        return ApiResponse.error(res, 'Validation error', 422, errors);
      }

      const activity = await ActivityService.createActivity(req.body);
      return ApiResponse.success(res, activity, 'Activity created successfully', 201);
    } catch (error) {
      if (error.message.includes('already exists')) {
        return ApiResponse.error(res, error.message, 409);
      }
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const activity = await ActivityService.updateActivity(req.params.id, req.body);
      if (!activity) {
        return ApiResponse.error(res, 'Activity not found', 404);
      }
      return ApiResponse.success(res, activity, 'Activity updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const deleted = await ActivityService.deleteActivity(req.params.id);
      if (!deleted) {
        return ApiResponse.error(res, 'Activity not found', 404);
      }
      return ApiResponse.success(res, null, 'Activity deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static getStatus(req, res) {
    return ApiResponse.success(
      res,
      { module: 'activities', initialized: true },
      'Activities module initialized'
    );
  }
}

