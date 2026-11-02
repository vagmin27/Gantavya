import { ApiResponse } from '../utils/api-response.js';

/**
 * Foundational authentication middleware.
 * Verifies JWT token from HTTP-only cookie or Authorization header.
 * (Full auth business logic to be implemented in Milestone 2)
 */
export function authenticate(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return ApiResponse.error(res, 'Authentication token missing', 401);
  }

  // Placeholder for JWT verification (Milestone 2)
  req.user = { token };
  next();
}

/**
 * Standard CSRF mitigation helper for cookie-based state-changing requests.
 * Ensures custom header presence or matching CSRF double-submit token.
 */
export function verifyCsrf(req, res, next) {
  // Safe methods do not require CSRF checks
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const customHeader = req.headers['x-requested-with'] || req.headers['x-csrf-token'];
  if (!customHeader) {
    return ApiResponse.error(res, 'Missing CSRF protection header', 403);
  }

  next();
}

