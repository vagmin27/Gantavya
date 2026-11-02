import { UserService } from './users.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class UserController {
  static getStatus(req, res) {
    return ApiResponse.success(res, { module: 'users', initialized: true }, 'Users module initialized');
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
      // Disallow updating password or role directly via general update endpoint
      const { password, role, ...allowedUpdates } = req.body;
      const user = await UserService.updateUser(req.params.id, allowedUpdates);
      if (!user) {
        return ApiResponse.error(res, 'User not found', 404);
      }
      return ApiResponse.success(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

