import { User } from './user.model.js';

export class UserService {
  static async getUserById(id) {
    return await User.findById(id).select('-password');
  }

  static async getUserByEmail(email) {
    return await User.findOne({ email }).select('-password');
  }

  static async updateCurrentUser(userId, allowedUpdates) {
    // Whitelist allowed fields for self-update
    const sanitizedUpdates = {};
    if (allowedUpdates.name) sanitizedUpdates.name = allowedUpdates.name.trim();

    return await User.findByIdAndUpdate(userId, sanitizedUpdates, {
      new: true,
      runValidators: true
    }).select('-password');
  }

  static async updateUser(id, updateData) {
    const { password, role, ...allowedUpdates } = updateData;
    return await User.findByIdAndUpdate(id, allowedUpdates, {
      new: true,
      runValidators: true
    }).select('-password');
  }
}
