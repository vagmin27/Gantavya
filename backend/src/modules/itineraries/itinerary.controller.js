import { ItineraryService } from './itinerary.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { validateItineraryDayInput } from './itinerary.validation.js';
import { defaultItineraryTransportationService } from './itinerary-transportation.service.js';
import { ItinerarySchedulerService } from './itinerary-scheduler.service.js';

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

      const userId = req.user?.id || null;
      const days = await ItineraryService.listDaysForTrip(tripId, userId);
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
      const userId = req.user?.id || null;
      const day = await ItineraryService.getDayById(req.params.id, userId);
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

      const updatedDays = await ItineraryService.reorderDays(tripId, dayOrders, userId);
      return ApiResponse.success(res, updatedDays, 'Itinerary days reordered successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  // --- Sub-Milestone 2.4.4 API Integration Endpoints ---

  static async integrateTransportation(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const dayId = req.params.dayId || req.params.id;
      const updatedDay = await defaultItineraryTransportationService.integrateDayTransportation(
        dayId,
        req.body || {},
        userId
      );
      return ApiResponse.success(res, updatedDay, 'Transportation integrated into itinerary successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async getDayTimeline(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const dayId = req.params.dayId || req.params.id;
      const timelineData = await ItinerarySchedulerService.buildDayTimeline(dayId, userId);
      return ApiResponse.success(res, timelineData, 'Itinerary day timeline retrieved successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async validateTimeline(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const dayId = req.params.dayId || req.params.id;
      const timelineData = await ItinerarySchedulerService.buildDayTimeline(dayId, userId);
      return ApiResponse.success(
        res,
        {
          itineraryDayId: dayId,
          hasConflicts: timelineData.hasConflicts,
          conflicts: timelineData.conflicts
        },
        'Timeline validated successfully'
      );
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async selectTransitAlternative(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const dayId = req.params.dayId || req.params.id;
      const { transitionId, routeCategory } = req.body;

      if (!transitionId || !routeCategory) {
        return ApiResponse.error(res, 'transitionId and routeCategory are required', 422);
      }

      const updatedDay = await defaultItineraryTransportationService.selectTransitAlternative(
        dayId,
        transitionId,
        routeCategory,
        userId
      );

      // Re-run timeline validation after switching alternative
      await ItinerarySchedulerService.buildDayTimeline(dayId, userId);

      return ApiResponse.success(res, updatedDay, `Transit alternative switched to '${routeCategory}' successfully`);
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async setTransitionLock(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const dayId = req.params.dayId || req.params.id;
      const transitionId = req.params.transitionId;
      const { isLocked } = req.body;

      const updatedDay = await defaultItineraryTransportationService.setTransitionLock(
        dayId,
        transitionId,
        isLocked,
        userId
      );

      return ApiResponse.success(res, updatedDay, `Transition lock set to ${isLocked}`);
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async recalculateTripSchedule(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const tripId = req.params.tripId;
      const fromDayNumber = req.body.fromDayNumber ? parseInt(req.body.fromDayNumber, 10) : 1;
      const options = req.body.options || {};

      const result = await ItinerarySchedulerService.recalculateSchedule(
        tripId,
        fromDayNumber,
        options,
        userId
      );

      return ApiResponse.success(res, result, 'Trip schedule recalculated successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }
}
