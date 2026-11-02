import { User } from '../users/user.model.js';
import { TravellerProfile } from '../profiles/profile.model.js';
import { TokenService } from './token.service.js';

export class AuthService {
  /**
   * Registers a new user and sets up their initial traveller profile.
   */
  static async register({ name, email, password, userAgent = '', ipAddress = '' }) {
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const error = new Error('An account with this email address already exists');
      error.statusCode = 409;
      error.code = 'DUPLICATE_EMAIL';
      throw error;
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'user',
      status: 'active'
    });

    // Initialize default traveller profile
    await TravellerProfile.create({
      userId: user._id,
      travelInterests: [],
      preferredTravelStyles: [],
      accommodationPreferences: [],
      foodPreferences: [],
      preferredTransportation: []
    });

    // Issue tokens
    const accessToken = TokenService.generateAccessToken(user);
    const { rawRefreshToken } = await TokenService.createRefreshToken(user._id, {
      userAgent,
      ipAddress
    });

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;

    return { user: sanitizedUser, accessToken, rawRefreshToken };
  }

  /**
   * Authenticates user with email and password.
   */
  static async login({ email, password, userAgent = '', ipAddress = '' }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Explicitly query password since it is select: false
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (user.status !== 'active') {
      const error = new Error(`Account is ${user.status}. Please contact support.`);
      error.statusCode = 403;
      error.code = 'ACCOUNT_INACTIVE';
      throw error;
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Issue new tokens
    const accessToken = TokenService.generateAccessToken(user);
    const { rawRefreshToken } = await TokenService.createRefreshToken(user._id, {
      userAgent,
      ipAddress
    });

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;

    return { user: sanitizedUser, accessToken, rawRefreshToken };
  }

  /**
   * Rotates refresh tokens and re-issues an access token.
   */
  static async refresh({ rawRefreshToken, userAgent = '', ipAddress = '' }) {
    if (!rawRefreshToken) {
      const error = new Error('Refresh token is required');
      error.statusCode = 401;
      error.code = 'MISSING_REFRESH_TOKEN';
      throw error;
    }

    try {
      const rotated = await TokenService.rotateRefreshToken(rawRefreshToken, {
        userAgent,
        ipAddress
      });

      const user = await User.findById(rotated.userId);
      if (!user || user.status !== 'active') {
        const error = new Error('User no longer active');
        error.statusCode = 401;
        throw error;
      }

      const accessToken = TokenService.generateAccessToken(user);
      const sanitizedUser = user.toObject();
      delete sanitizedUser.password;

      return {
        user: sanitizedUser,
        accessToken,
        rawRefreshToken: rotated.rawRefreshToken
      };
    } catch (err) {
      if (err.message === 'REVOKED_REFRESH_TOKEN_REPLAY') {
        const error = new Error('Security alert: Token reuse detected. Session terminated.');
        error.statusCode = 401;
        error.code = 'TOKEN_REPLAY_DETECTED';
        throw error;
      }

      const error = new Error('Invalid or expired refresh token');
      error.statusCode = 401;
      error.code = 'INVALID_REFRESH_TOKEN';
      throw error;
    }
  }

  /**
   * Revokes refresh token on user logout.
   */
  static async logout(rawRefreshToken) {
    if (rawRefreshToken) {
      await TokenService.revokeRefreshToken(rawRefreshToken);
    }
  }

  /**
   * Fetches authenticated user and their profile.
   */
  static async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const profile = await TravellerProfile.findOne({ userId });
    return {
      user,
      profile
    };
  }
}

