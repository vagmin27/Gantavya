import { TripService } from './trip.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { validateTripCreate, validateParticipantAdd } from './trip.validation.js';

export class TripController {
  static async create(req, res, next) {
    try {
      const ownerId = req.user?.id || req.body.ownerId;
      const { isValid, errors } = validateTripCreate({ ...req.body, ownerId });
      if (!isValid) {
        return ApiResponse.error(res, 'Validation error', 422, errors);
      }

      const trip = await TripService.createTrip(ownerId, req.body);
      return ApiResponse.success(res, trip, 'Trip created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const trip = await TripService.getTripById(req.params.id);
      if (!trip) {
        return ApiResponse.error(res, 'Trip not found', 404);
      }
      return ApiResponse.success(res, trip, 'Trip retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async list(req, res, next) {
    try {
      const userId = req.user?.id || req.query.userId;
      if (!userId) {
        return ApiResponse.error(res, 'User ID query parameter or authentication is required', 400);
      }

      const trips = await TripService.listUserTrips(userId);
      return ApiResponse.success(res, trips, 'Trips retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const trip = await TripService.updateTrip(req.params.id, req.body);
      if (!trip) {
        return ApiResponse.error(res, 'Trip not found', 404);
      }
      return ApiResponse.success(res, trip, 'Trip updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addParticipant(req, res, next) {
    try {
      const { isValid, errors } = validateParticipantAdd(req.body);
      if (!isValid) {
        return ApiResponse.error(res, 'Validation error', 422, errors);
      }

      const updatedTrip = await TripService.addParticipant(req.params.id, req.body);
      return ApiResponse.success(res, updatedTrip, 'Participant added successfully');
    } catch (error) {
      if (error.message.includes('already a participant') || error.message.includes('Trip not found')) {
        return ApiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }

  static async removeParticipant(req, res, next) {
    try {
      const { participantId } = req.params;
      const updatedTrip = await TripService.removeParticipant(req.params.id, participantId);
      return ApiResponse.success(res, updatedTrip, 'Participant removed successfully');
    } catch (error) {
      if (error.message.includes('Cannot remove') || error.message.includes('Trip not found')) {
        return ApiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }

  static getStatus(req, res) {
    return ApiResponse.success(res, { module: 'trips', initialized: true }, 'Trips module initialized');
  }
}
