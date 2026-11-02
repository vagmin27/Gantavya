import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { RefreshToken } from './refresh-token.model.js';

export class TokenService {
  /**
   * Hashes a raw refresh token using SHA-256.
   */
  static hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Generates a cryptographically strong random token string.
   */
  static generateRandomToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  /**
   * Issues a short-lived signed JWT access token.
   */
  static generateAccessToken(user) {
    return jwt.sign(
      {
        id: user._id ? user._id.toString() : user.id,
        email: user.email,
        role: user.role,
        jti: crypto.randomUUID()
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
    );
  }

  /**
   * Creates and persists a new refresh token family or rotates within an existing one.
   */
  static async createRefreshToken(userId, { family = null, userAgent = '', ipAddress = '' } = {}) {
    const rawRefreshToken = this.generateRandomToken();
    const tokenHash = this.hashToken(rawRefreshToken);
    const tokenFamily = family || crypto.randomUUID();

    // 7-day expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId,
      tokenHash,
      family: tokenFamily,
      expiresAt,
      userAgent,
      ipAddress
    });

    return { rawRefreshToken, tokenFamily, expiresAt };
  }

  /**
   * Rotates a refresh token.
   * If a revoked token is presented, invalidates the entire token family (replay attack protection).
   */
  static async rotateRefreshToken(rawRefreshToken, { userAgent = '', ipAddress = '' } = {}) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const existingToken = await RefreshToken.findOne({ tokenHash });

    if (!existingToken) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Replay attack detection: token was already revoked / rotated earlier!
    if (existingToken.isRevoked) {
      // Invalidate the entire compromised family immediately
      await RefreshToken.updateMany({ family: existingToken.family }, { isRevoked: true });
      throw new Error('REVOKED_REFRESH_TOKEN_REPLAY');
    }

    if (new Date() > existingToken.expiresAt) {
      throw new Error('EXPIRED_REFRESH_TOKEN');
    }

    // Mark current token as revoked and track replacement
    const newRawToken = this.generateRandomToken();
    const newTokenHash = this.hashToken(newRawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    existingToken.isRevoked = true;
    existingToken.replacedByTokenHash = newTokenHash;
    await existingToken.save();

    // Create the rotated token in the same family
    await RefreshToken.create({
      userId: existingToken.userId,
      tokenHash: newTokenHash,
      family: existingToken.family,
      expiresAt,
      userAgent,
      ipAddress
    });

    return {
      userId: existingToken.userId,
      rawRefreshToken: newRawToken,
      expiresAt
    };
  }

  /**
   * Revokes a refresh token on logout.
   */
  static async revokeRefreshToken(rawRefreshToken) {
    if (!rawRefreshToken) return;
    const tokenHash = this.hashToken(rawRefreshToken);
    await RefreshToken.updateOne({ tokenHash }, { isRevoked: true });
  }

  /**
   * Attaches secure HTTP-only cookies to the Express response.
   */
  static setAuthCookies(res, accessToken, rawRefreshToken) {
    // 15-minute access token cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: env.COOKIE_SAME_SITE,
      maxAge: 15 * 60 * 1000,
      path: '/'
    });

    // Also support 'token' cookie for backwards compatibility
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: env.COOKIE_SAME_SITE,
      maxAge: 15 * 60 * 1000,
      path: '/'
    });

    // 7-day refresh token cookie restricted to /api/v1/auth
    if (rawRefreshToken) {
      res.cookie('refreshToken', rawRefreshToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: env.COOKIE_SAME_SITE,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth'
      });
    }
  }

  /**
   * Clears all authentication cookies.
   */
  static clearAuthCookies(res) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: env.COOKIE_SAME_SITE,
      path: '/'
    });
    res.clearCookie('token', {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: env.COOKIE_SAME_SITE,
      path: '/'
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: env.COOKIE_SAME_SITE,
      path: '/api/v1/auth'
    });
  }
}
