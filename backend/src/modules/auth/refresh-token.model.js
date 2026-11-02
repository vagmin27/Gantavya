import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      index: true
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      unique: true
    },
    family: {
      type: String,
      required: [true, 'Token family identifier is required'],
      index: true
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true
    },
    replacedByTokenHash: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required']
    }
  },
  {
    timestamps: true
  }
);

// MongoDB TTL index: automatically deletes document once expiresAt timestamp is reached
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for fast family lineage lookups
refreshTokenSchema.index({ family: 1, isRevoked: 1 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

