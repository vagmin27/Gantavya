import mongoose from 'mongoose';
import {
  ROUTE_CATEGORY_ENUM,
  CURRENCY_ENUM
} from './transportation.enums.js';
import { transportNodeSchema } from './transport-node.schema.js';
import { transitLegSchema } from './transit-leg.schema.js';
import { routeSegmentSchema } from './route-segment.schema.js';

const totalMonetaryCostSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Total cost amount is required'],
      min: [0, 'Total cost amount cannot be negative']
    },
    currency: {
      type: String,
      enum: {
        values: CURRENCY_ENUM,
        message: '{VALUE} is not a supported currency'
      },
      default: 'INR'
    },
    isEstimated: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const routeOptionSchema = new mongoose.Schema(
  {
    routeId: {
      type: String,
      required: [true, 'Route ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null,
      index: true
    },
    origin: {
      type: transportNodeSchema,
      required: [true, 'Route origin node is required']
    },
    destination: {
      type: transportNodeSchema,
      required: [true, 'Route destination node is required']
    },
    departureTime: {
      type: Date,
      required: [true, 'Route departure time is required']
    },
    arrivalTime: {
      type: Date,
      required: [true, 'Route arrival time is required'],
      validate: {
        validator: function (val) {
          return val > this.departureTime;
        },
        message: 'Route arrival time must be strictly after departure time'
      }
    },
    totalDurationMinutes: {
      type: Number,
      required: [true, 'Total duration in minutes is required'],
      min: [1, 'Total duration must be at least 1 minute']
    },
    totalDistanceMeters: {
      type: Number,
      required: [true, 'Total distance in meters is required'],
      min: [0, 'Total distance cannot be negative']
    },
    totalMonetaryCost: {
      type: totalMonetaryCostSchema,
      required: [true, 'Total monetary cost is required']
    },
    numberOfTransfers: {
      type: Number,
      min: [0, 'Number of transfers cannot be negative'],
      default: 0
    },
    totalWaitingTimeMinutes: {
      type: Number,
      min: [0, 'Total waiting time cannot be negative'],
      default: 0
    },
    convenienceScore: {
      type: Number,
      min: [0.0, 'Convenience score cannot be less than 0.0'],
      max: [10.0, 'Convenience score cannot exceed 10.0'],
      default: 5.0
    },
    reliabilityScore: {
      type: Number,
      min: [0.0, 'Reliability score cannot be less than 0.0'],
      max: [10.0, 'Reliability score cannot exceed 10.0'],
      default: 5.0
    },
    rankingCategory: {
      type: String,
      enum: {
        values: ROUTE_CATEGORY_ENUM,
        message: '{VALUE} is not a valid route ranking category'
      },
      default: 'best_overall',
      index: true
    },
    recommendationReason: {
      type: String,
      trim: true,
      default: ''
    },
    segments: {
      type: [routeSegmentSchema],
      default: []
    },
    legs: {
      type: [transitLegSchema],
      validate: {
        validator: function (legs) {
          return Array.isArray(legs) && legs.length >= 1;
        },
        message: 'A route option must contain at least one transit leg'
      }
    },
    polyline: {
      type: String,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying ranked routes by trip
routeOptionSchema.index({ tripId: 1, rankingCategory: 1 });
routeOptionSchema.index({ 'origin.nodeId': 1, 'destination.nodeId': 1, departureTime: 1 });

export const RouteOption = mongoose.model('RouteOption', routeOptionSchema);

