import mongoose from 'mongoose';
import { DATA_FRESHNESS_ENUM } from './transportation.enums.js';

export const dataFreshnessSchema = new mongoose.Schema(
  {
    freshnessLevel: {
      type: String,
      enum: {
        values: DATA_FRESHNESS_ENUM,
        message: '{VALUE} is not a valid data freshness level'
      },
      default: 'realtime'
    },
    lastFetchedAt: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date,
      default: null
    },
    source: {
      type: String,
      required: [true, 'Data source identifier is required'],
      trim: true
    },
    confidenceScore: {
      type: Number,
      min: [0.0, 'Confidence score cannot be less than 0.0'],
      max: [1.0, 'Confidence score cannot exceed 1.0'],
      default: 1.0
    }
  },
  { _id: false }
);

