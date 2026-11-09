import { ActivityService } from './activity.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { validateActivityInput } from './activity.validation.js';

export class ActivityController {
  static getStatus(req, res) {
    return ApiResponse.success(
      res,
      { module: 'activities', initialized: true },
      'Activities module initialized'
    );
  }

  static async listForDay(req, res, next) {
    try {
      const { itineraryDayId } = req.query;
      if (!itineraryDayId) {
        return ApiResponse.error(res, 'Itinerary Day ID query parameter is required', 400);
      }

      const userId = req.user?.id || null;
      const activities = await ActivityService.listActivitiesForDay(itineraryDayId, userId);
      return ApiResponse.success(res, activities, 'Activities retrieved successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const activity = await ActivityService.getActivityById(req.params.id, userId);
      return ApiResponse.success(res, activity, 'Activity retrieved successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const { isValid, errors } = validateActivityInput(req.body);
      if (!isValid) {
        return ApiResponse.error(res, 'Validation error', 422, errors);
      }

      const userId = req.user?.id || null;
      const activity = await ActivityService.createActivity(req.body, userId);
      return ApiResponse.success(res, activity, 'Activity created successfully', 201);
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      if (error.message.includes('already exists')) {
        return ApiResponse.error(res, error.message, 409);
      }
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const activity = await ActivityService.updateActivity(req.params.id, req.body, userId);
      return ApiResponse.success(res, activity, 'Activity updated successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const result = await ActivityService.deleteActivity(req.params.id, userId);
      return ApiResponse.success(res, result, 'Activity deleted successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async reorder(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const { itineraryDayId, activityOrders } = req.body;

      if (!itineraryDayId) {
        return ApiResponse.error(res, 'Itinerary Day ID is required for reordering', 400);
      }

      const result = await ActivityService.reorderActivities(
        itineraryDayId,
        activityOrders,
        userId
      );
      return ApiResponse.success(res, result, 'Activities reordered successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }
}
