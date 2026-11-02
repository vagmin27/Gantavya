import { ItineraryService } from './itinerary.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { validateItineraryDayInput } from './itinerary.validation.js';

export class ItineraryController {
  static async listDays(req, res, next) {
    try {
      const { tripId } = req.query;
      if (!tripId) {
        return ApiResponse.error(res, 'Trip ID query parameter is required', 400);
      }

      const days = await ItineraryService.listDaysForTrip(tripId);
      return ApiResponse.success(res, days, 'Itinerary days retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getDayById(req, res, next) {
    try {
      const day = await ItineraryService.getDayById(req.params.id);
      if (!day) {
        return ApiResponse.error(res, 'Itinerary day not found', 404);
      }
      return ApiResponse.success(res, day, 'Itinerary day retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createDay(req, res, next) {
    try {
      const { isValid, errors } = validateItineraryDayInput(req.body);
      if (!isValid) {
        return ApiResponse.error(res, 'Validation error', 422, errors);
      }

      const day = await ItineraryService.createDay(req.body);
      return ApiResponse.success(res, day, 'Itinerary day created successfully', 201);
    } catch (error) {
      if (error.message.includes('already exists')) {
        return ApiResponse.error(res, error.message, 409);
      }
      next(error);
    }
  }

  static async updateDay(req, res, next) {
    try {
      const day = await ItineraryService.updateDay(req.params.id, req.body);
      if (!day) {
        return ApiResponse.error(res, 'Itinerary day not found', 404);
      }
      return ApiResponse.success(res, day, 'Itinerary day updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteDay(req, res, next) {
    try {
      const deleted = await ItineraryService.deleteDay(req.params.id);
      if (!deleted) {
        return ApiResponse.error(res, 'Itinerary day not found', 404);
      }
      return ApiResponse.success(res, null, 'Itinerary day deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static getStatus(req, res) {
    return ApiResponse.success(
      res,
      { module: 'itineraries', initialized: true },
      'Itineraries module initialized'
    );
  }
}

