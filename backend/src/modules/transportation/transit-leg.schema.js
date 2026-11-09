import mongoose from 'mongoose';
import {
  TRANSPORT_MODE_ENUM,
  LEG_STATUS_ENUM
} from './transportation.enums.js';
import { transportNodeSchema } from './transport-node.schema.js';
import { fareBreakdownSchema, additionalCostSchema } from './fare-breakdown.schema.js';
import { transferSchema } from './transfer.schema.js';
import { dataFreshnessSchema } from './data-freshness.schema.js';

export const carrierInfoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Carrier name is required'],
      trim: true
    },
    code: {
      type: String,
      trim: true,
      default: null // e.g. "6E", "AI", "NR"
    },
    identifier: {
      type: String,
      trim: true,
      default: null // e.g. "6E-205", "12004", "DL-1P-1234"
    }
  },
  { _id: false }
);

export const bookingInfoSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      trim: true,
      default: null
    },
    bookingUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (url) {
          if (!url) return true;
          return /^https?:\/\/.+/.test(url);
        },
        message: 'Booking URL must be a valid HTTP/HTTPS link'
      },
      default: null
    },
    operatorPhone: {
      type: String,
      trim: true,
      default: null
    },
    isBookableOnline: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

export const transitLegSchema = new mongoose.Schema(
  {
    legId: {
      type: String,
      required: [true, 'Transit leg ID is required'],
      trim: true
    },
    mode: {
      type: String,
      enum: {
        values: TRANSPORT_MODE_ENUM,
        message: '{VALUE} is not a valid transport mode'
      },
      required: [true, 'Transport mode is required']
    },
    origin: {
      type: transportNodeSchema,
      required: [true, 'Origin node is required']
    },
    destination: {
      type: transportNodeSchema,
      required: [true, 'Destination node is required']
    },
    departureTime: {
      type: Date,
      required: [true, 'Departure time timestamp is required']
    },
    arrivalTime: {
      type: Date,
      required: [true, 'Arrival time timestamp is required'],
      validate: {
        validator: function (val) {
          return val > this.departureTime;
        },
        message: 'Arrival time must be strictly after departure time'
      }
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute']
    },
    distanceMeters: {
      type: Number,
      required: [true, 'Distance in meters is required'],
      min: [0, 'Distance cannot be negative']
    },
    carrier: {
      type: carrierInfoSchema,
      default: () => ({ name: 'Self/Unspecified' })
    },
    fare: {
      type: fareBreakdownSchema,
      required: [true, 'Fare breakdown is required']
    },
    additionalCosts: {
      type: [additionalCostSchema],
      default: []
    },
    transferInfo: {
      type: transferSchema,
      default: null
    },
    availabilityStatus: {
      type: String,
      enum: {
        values: LEG_STATUS_ENUM,
        message: '{VALUE} is not a valid leg status'
      },
      default: 'scheduled'
    },
    dataFreshness: {
      type: dataFreshnessSchema,
      required: [true, 'Data freshness metadata is required']
    },
    bookingInfo: {
      type: bookingInfoSchema,
      default: () => ({})
    },
    polyline: {
      type: String, // Encoded polyline or GeoJSON string
      default: null
    },
    intermediateStops: {
      type: [transportNodeSchema],
      default: []
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: ''
    }
  },
  { _id: false }
);

