import { User } from './user.model.js';

export class UserService {
  static async getUserById(id) {
    return await User.findById(id).select('-password');
  }

  static async getUserByEmail(email) {
    return await User.findOne({ email });
  }

  static async updateUser(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).select('-password');
  }
}

