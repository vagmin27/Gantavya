import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { validateRegisterInput, validateLoginInput } from './auth.validation.js';

export class AuthController {
  static getStatus(req, res) {
    return ApiResponse.success(res, { module: 'auth', initialized: true }, 'Auth module initialized');
  }

  static async register(req, res, next) {
    try {
      const { isValid, errors } = validateRegisterInput(req.body);
      if (!isValid) {
        return ApiResponse.error(res, 'Validation error', 422, errors);
      }

      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.socket.remoteAddress || '';

      const { user, accessToken, rawRefreshToken } = await AuthService.register({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        userAgent,
        ipAddress
      });

      TokenService.setAuthCookies(res, accessToken, rawRefreshToken);

      return ApiResponse.success(
        res,
        { user, accessToken },
        'Account registered successfully',
        201
      );
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { isValid, errors } = validateLoginInput(req.body);
      if (!isValid) {
        return ApiResponse.error(res, 'Validation error', 422, errors);
      }

      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.socket.remoteAddress || '';

      const { user, accessToken, rawRefreshToken } = await AuthService.login({
        email: req.body.email,
        password: req.body.password,
        userAgent,
        ipAddress
      });

      TokenService.setAuthCookies(res, accessToken, rawRefreshToken);

      return ApiResponse.success(
        res,
        { user, accessToken },
        'Logged in successfully'
      );
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async refresh(req, res, next) {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.socket.remoteAddress || '';

      const { user, accessToken, rawRefreshToken: newRawToken } = await AuthService.refresh({
        rawRefreshToken,
        userAgent,
        ipAddress
      });

      TokenService.setAuthCookies(res, accessToken, newRawToken);

      return ApiResponse.success(
        res,
        { user, accessToken },
        'Token refreshed successfully'
      );
    } catch (error) {
      TokenService.clearAuthCookies(res);
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      await AuthService.logout(rawRefreshToken);
      TokenService.clearAuthCookies(res);

      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      TokenService.clearAuthCookies(res);
      next(error);
    }
  }

  static async getMe(req, res, next) {
    try {
      const { user, profile } = await AuthService.getMe(req.user.id);
      return ApiResponse.success(
        res,
        { user, profile },
        'Current user retrieved successfully'
      );
    } catch (error) {
      if (error.statusCode) {
        return ApiResponse.error(res, error.message, error.statusCode);
      }
      next(error);
    }
  }
}

