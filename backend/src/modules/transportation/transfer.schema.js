import mongoose from 'mongoose';
import { TRANSFER_TYPE_ENUM } from './transportation.enums.js';

export const transferSchema = new mongoose.Schema(
  {
    transferType: {
      type: String,
      enum: {
        values: TRANSFER_TYPE_ENUM,
        message: '{VALUE} is not a valid transfer type'
      },
      default: 'same_station'
    },
    bufferDurationMinutes: {
      type: Number,
      required: [true, 'Transfer buffer duration is required'],
      min: [0, 'Buffer duration cannot be negative']
    },
    walkingDistanceMeters: {
      type: Number,
      min: [0, 'Walking distance cannot be negative'],
      default: 0
    },
    requiresSecurityClearance: {
      type: Boolean,
      default: false
    },
    requiresBaggageReclaim: {
      type: Boolean,
      default: false
    },
    isGuaranteedConnection: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Transfer notes cannot exceed 500 characters'],
      default: ''
    }
  },
  { _id: false }
);

