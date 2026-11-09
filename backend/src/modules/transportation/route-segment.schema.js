import mongoose from 'mongoose';
import { SEGMENT_TYPE_ENUM } from './transportation.enums.js';
import { transitLegSchema } from './transit-leg.schema.js';

export const routeSegmentSchema = new mongoose.Schema(
  {
    segmentId: {
      type: String,
      required: [true, 'Route segment ID is required'],
      trim: true
    },
    segmentType: {
      type: String,
      enum: {
        values: SEGMENT_TYPE_ENUM,
        message: '{VALUE} is not a valid segment type'
      },
      default: 'intercity_transit'
    },
    title: {
      type: String,
      trim: true,
      default: ''
    },
    legs: {
      type: [transitLegSchema],
      validate: {
        validator: function (legs) {
          return Array.isArray(legs) && legs.length >= 1;
        },
        message: 'A route segment must contain at least one transit leg'
      }
    },
    segmentDurationMinutes: {
      type: Number,
      required: [true, 'Segment duration in minutes is required'],
      min: [1, 'Segment duration must be at least 1 minute']
    },
    segmentDistanceMeters: {
      type: Number,
      min: [0, 'Segment distance cannot be negative'],
      default: 0
    },
    segmentTotalCost: {
      type: Number,
      min: [0, 'Segment cost cannot be negative'],
      default: 0
    }
  },
  { _id: false }
);

