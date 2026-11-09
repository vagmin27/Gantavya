import { ItineraryService } from './itinerary.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { validateItineraryDayInput } from './itinerary.validation.js';

export class ItineraryController {
  static getStatus(req, res) {
    return ApiResponse.success(
      res,
      { module: 'itineraries', initialized: true },
      'Itineraries module initialized'
    );
  }

  static async listDays(req, res, next) {
    try {
      const { tripId } = req.query;
      if (!tripId) {
        return ApiResponse.error(res, 'Trip ID query parameter is required', 400);
      }

      const days = await ItineraryService.listDaysForTrip(tripId);
      return ApiResponse.success(res, days, 'Itinerary days retrieved successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async getDayById(req, res, next) {
    try {
      const day = await ItineraryService.getDayById(req.params.id);
      return ApiResponse.success(res, day, 'Itinerary day retrieved successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async createDay(req, res, next) {
    try {
      const { isValid, errors } = validateItineraryDayInput(req.body);
      if (!isValid) {
        return ApiResponse.error(res, 'Validation error', 422, errors);
      }

      const userId = req.user?.id || null;
      const day = await ItineraryService.createDay(req.body, userId);
      return ApiResponse.success(res, day, 'Itinerary day created successfully', 201);
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

  static async updateDay(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const day = await ItineraryService.updateDay(req.params.id, req.body, userId);
      return ApiResponse.success(res, day, 'Itinerary day updated successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async deleteDay(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const result = await ItineraryService.deleteDay(req.params.id, userId);
      return ApiResponse.success(res, result, 'Itinerary day deleted successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async reorderDays(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const { tripId, dayOrders } = req.body;

      if (!tripId) {
        return ApiResponse.error(res, 'Trip ID is required for reordering', 400);
      }

      const result = await ItineraryService.reorderDays(tripId, dayOrders, userId);
      return ApiResponse.success(res, result, 'Itinerary days reordered successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }
}
