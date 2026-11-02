import { UserService } from './users.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class UserController {
  static getStatus(req, res) {
    return ApiResponse.success(res, { module: 'users', initialized: true }, 'Users module initialized');
  }

  static async getMe(req, res, next) {
    try {
      const user = await UserService.getUserById(req.user.id);
      if (!user) {
        return ApiResponse.error(res, 'User not found', 404);
      }
      return ApiResponse.success(res, user, 'Current user profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateMe(req, res, next) {
    try {
      if (req.body.name && req.body.name.trim().length < 2) {
        return ApiResponse.error(res, 'Name must be at least 2 characters', 422);
      }

      const updatedUser = await UserService.updateCurrentUser(req.user.id, req.body);
      return ApiResponse.success(res, updatedUser, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const user = await UserService.getUserById(req.params.id);
      if (!user) {
        return ApiResponse.error(res, 'User not found', 404);
      }
      return ApiResponse.success(res, user, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const user = await UserService.updateUser(req.params.id, req.body);
      if (!user) {
        return ApiResponse.error(res, 'User not found', 404);
      }
      return ApiResponse.success(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
