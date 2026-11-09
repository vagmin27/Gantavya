import { TripService } from './trip.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { validateTripCreate, validateParticipantAdd } from './trip.validation.js';

export class TripController {
  static getStatus(req, res) {
    return ApiResponse.success(res, { module: 'trips', initialized: true }, 'Trips module initialized');
  }

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

  static async list(req, res, next) {
    try {
      const userId = req.user?.id || req.query.userId;
      if (!userId) {
        return ApiResponse.error(res, 'User authentication or userId parameter required', 400);
      }

      const { status, visibility, destinationId, search, limit = 20, skip = 0 } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (visibility) filter.visibility = visibility;
      if (destinationId) filter.destinationId = destinationId;

      const trips = await TripService.listUserTrips(userId, filter, {
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
        search
      });

      return ApiResponse.success(res, trips, 'Trips retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const trip = await TripService.getTripById(req.params.id, userId);
      return ApiResponse.success(res, trip, 'Trip retrieved successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const userId = req.user?.id || req.body.ownerId;
      const trip = await TripService.updateTrip(req.params.id, userId, req.body);
      return ApiResponse.success(res, trip, 'Trip updated successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const userId = req.user?.id || req.body.userId;
      const result = await TripService.deleteTrip(req.params.id, userId);
      return ApiResponse.success(res, result, 'Trip deleted successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async addParticipant(req, res, next) {
    try {
      const { isValid, errors } = validateParticipantAdd(req.body);
      if (!isValid) {
        return ApiResponse.error(res, 'Validation error', 422, errors);
      }
      const trip = await TripService.addParticipant(req.params.id, req.body);
      return ApiResponse.success(res, trip, 'Participant added successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      if (error.message.includes('already a participant') || error.message.includes('Trip not found')) {
        return ApiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }

  // ==========================================
  // INVITATIONS & PARTICIPANTS
  // ==========================================

  static async invite(req, res, next) {
    try {
      const inviterId = req.user.id;
      const { email, role } = req.body;

      if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
        return ApiResponse.error(res, 'Valid invitee email address is required', 422);
      }

      const result = await TripService.createInvitation(req.params.id, inviterId, {
        email,
        role
      });

      return ApiResponse.success(res, result, 'Invitation created successfully', 201);
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async acceptInvitation(req, res, next) {
    try {
      const { token } = req.body;
      if (!token) {
        return ApiResponse.error(res, 'Invitation token is required', 422);
      }

      const result = await TripService.acceptInvitation(token, req.user);
      return ApiResponse.success(res, result, 'Invitation accepted successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async declineInvitation(req, res, next) {
    try {
      const { token } = req.body;
      if (!token) {
        return ApiResponse.error(res, 'Invitation token is required', 422);
      }

      const result = await TripService.declineInvitation(token);
      return ApiResponse.success(res, result, 'Invitation declined');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async cancelInvitation(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await TripService.cancelInvitation(
        req.params.id,
        req.params.invitationId,
        userId
      );
      return ApiResponse.success(res, result, 'Invitation cancelled successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async updateParticipantRole(req, res, next) {
    try {
      const { role } = req.body;
      if (!role || !['editor', 'viewer', 'organizer'].includes(role)) {
        return ApiResponse.error(res, 'Valid role is required (editor, viewer, organizer)', 422);
      }

      const participant = await TripService.updateParticipantRole(
        req.params.id,
        req.params.participantId,
        role,
        req.user.id
      );

      return ApiResponse.success(res, participant, 'Participant role updated successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async removeParticipant(req, res, next) {
    try {
      const requesterId = req.user?.id || req.body.requesterId;
      const result = await TripService.removeParticipant(
        req.params.id,
        req.params.participantId,
        requesterId
      );
      return ApiResponse.success(res, result, 'Participant removed successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  // ==========================================
  // INTELLIGENCE GENERATION
  // ==========================================

  static async generateItinerary(req, res, next) {
    try {
      const userId = req.user.id;
      const { confirmOverwrite = false } = req.body;

      const result = await TripService.generateItinerary(req.params.id, userId, {
        confirmOverwrite
      });

      return ApiResponse.success(res, result, 'Itinerary generated successfully');
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode, error.data);
      }
      next(error);
    }
  }
}
