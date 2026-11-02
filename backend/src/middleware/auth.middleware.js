import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiResponse } from '../utils/api-response.js';
import { User } from '../modules/users/user.model.js';
import { Trip } from '../modules/trips/trip.model.js';

/**
 * Production authentication middleware.
 * Verifies JWT token from HTTP-only cookie or Authorization header.
 */
export async function authenticate(req, res, next) {
  const token =
    req.cookies?.accessToken ||
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return ApiResponse.error(res, 'Authentication token missing', 401);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    // Verify user still exists in database and is active
    const user = await User.findById(decoded.id);
    if (!user) {
      return ApiResponse.error(res, 'User belonging to this token no longer exists', 401);
    }

    if (user.status !== 'active') {
      return ApiResponse.error(res, `Account is ${user.status}`, 403);
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Authentication token expired', 401, {
        code: 'TOKEN_EXPIRED'
      });
    }
    return ApiResponse.error(res, 'Invalid authentication token', 401);
  }
}

/**
 * Standard CSRF mitigation helper for cookie-based state-changing requests.
 * Safe methods (GET, HEAD, OPTIONS) do not require CSRF headers.
 */
export function verifyCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const customHeader = req.headers['x-requested-with'] || req.headers['x-csrf-token'];
  if (!customHeader) {
    return ApiResponse.error(res, 'Missing CSRF protection header', 403);
  }

  next();
}

/**
 * Role-based authorization middleware.
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(res, 'Forbidden: Insufficient permissions', 403);
    }
    next();
  };
}

/**
 * Resource-based authorization for Trip resources.
 * Levels: 'view' | 'edit' | 'manage'
 */
export function authorizeTripAccess(requiredLevel = 'view') {
  return async (req, res, next) => {
    try {
      const tripId = req.params.id || req.params.tripId;
      if (!tripId) {
        return ApiResponse.error(res, 'Trip ID parameter is required', 400);
      }

      const trip = await Trip.findById(tripId);
      if (!trip) {
        return ApiResponse.error(res, 'Trip not found', 404);
      }

      const userId = req.user.id;
      const isOwner = trip.ownerId.toString() === userId;

      // Owners always have full access
      if (isOwner) {
        req.trip = trip;
        return next();
      }

      // Check participants
      const participant = trip.participants.find(
        (p) => p.userId.toString() === userId && p.membershipStatus === 'active'
      );

      if (requiredLevel === 'manage') {
        if (!participant || !['owner', 'organizer'].includes(participant.role)) {
          return ApiResponse.error(res, 'Forbidden: You do not have management permissions for this trip', 403);
        }
      } else if (requiredLevel === 'edit') {
        if (!participant || !['owner', 'organizer', 'editor'].includes(participant.role)) {
          return ApiResponse.error(res, 'Forbidden: You do not have edit permissions for this trip', 403);
        }
      } else if (requiredLevel === 'view') {
        const canView = participant || trip.visibility === 'public';
        if (!canView) {
          return ApiResponse.error(res, 'Forbidden: You do not have permission to view this trip', 403);
        }
      }

      req.trip = trip;
      next();
    } catch (err) {
      next(err);
    }
  };
}
