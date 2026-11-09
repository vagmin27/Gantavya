import mongoose from 'mongoose';
import {
  TRANSPORT_MODE_ENUM,
  CURRENCY_ENUM,
  FARE_TIER_ENUM
} from './transportation.enums.js';

export const accessibilityConstraintsSchema = new mongoose.Schema(
  {
    wheelchairAccessible: { type: Boolean, default: false },
    stepFreeAccess: { type: Boolean, default: false },
    limitedWalkingRequired: { type: Boolean, default: false },
    audioVisualAids: { type: Boolean, default: false }
  },
  { _id: false }
);

export const passengerCountSchema = new mongoose.Schema(
  {
    adults: {
      type: Number,
      min: [1, 'At least 1 adult is required'],
      default: 1
    },
    children: {
      type: Number,
      min: [0, 'Children count cannot be negative'],
      default: 0
    },
    infants: {
      type: Number,
      min: [0, 'Infants count cannot be negative'],
      default: 0
    },
    elderly: {
      type: Number,
      min: [0, 'Elderly count cannot be negative'],
      default: 0
    }
  },
  { _id: false }
);

export const travellerConstraintsSchema = new mongoose.Schema(
  {
    maxBudget: {
      type: Number,
      min: [0, 'Maximum budget cannot be negative'],
      default: 0 // 0 means unconstrained
    },
    currency: {
      type: String,
      enum: {
        values: CURRENCY_ENUM,
        message: '{VALUE} is not a supported currency'
      },
      default: 'INR'
    },
    maxDurationMinutes: {
      type: Number,
      min: [0, 'Maximum duration cannot be negative'],
      default: 0 // 0 means unconstrained
    },
    maxTransfers: {
      type: Number,
      min: [0, 'Maximum transfers cannot be negative'],
      default: 3
    },
    earliestDeparture: {
      type: Date,
      default: null
    },
    latestArrival: {
      type: Date,
      default: null
    },
    avoidOvernight: {
      type: Boolean,
      default: false
    },
    accessibilityRequirements: {
      type: accessibilityConstraintsSchema,
      default: () => ({})
    },
    passengers: {
      type: passengerCountSchema,
      default: () => ({ adults: 1, children: 0, infants: 0, elderly: 0 })
    },
    hasHeavyLuggage: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

export const transportationPreferencesSchema = new mongoose.Schema(
  {
    allowedModes: {
      type: [String],
      enum: {
        values: TRANSPORT_MODE_ENUM,
        message: '{VALUE} is not a valid transport mode'
      },
      default: ['walking', 'road_driving', 'road_cab', 'bus', 'rail', 'air']
    },
    preferredModes: {
      type: [String],
      enum: {
        values: TRANSPORT_MODE_ENUM,
        message: '{VALUE} is not a valid transport mode'
      },
      default: []
    },
    dislikedModes: {
      type: [String],
      enum: {
        values: TRANSPORT_MODE_ENUM,
        message: '{VALUE} is not a valid transport mode'
      },
      default: []
    },
    preferredRailClasses: {
      type: [String],
      default: ['3A', '2A', 'CC']
    },
    preferredCabinClass: {
      type: String,
      enum: {
        values: ['economy', 'premium_economy', 'business', 'first'],
        message: '{VALUE} is not a valid cabin class'
      },
      default: 'economy'
    },
    maxWalkingDistanceMeters: {
      type: Number,
      min: [0, 'Max walking distance cannot be negative'],
      default: 1000
    }
  },
  { _id: false }
);

