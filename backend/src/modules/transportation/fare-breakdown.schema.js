import mongoose from 'mongoose';
import { FARE_TIER_ENUM, CURRENCY_ENUM, ADDITIONAL_COST_TYPE_ENUM } from './transportation.enums.js';

export const additionalCostSchema = new mongoose.Schema(
  {
    costType: {
      type: String,
      enum: {
        values: ADDITIONAL_COST_TYPE_ENUM,
        message: '{VALUE} is not a valid additional cost type'
      },
      required: [true, 'Additional cost type is required']
    },
    amount: {
      type: Number,
      required: [true, 'Additional cost amount is required'],
      min: [0, 'Additional cost amount cannot be negative']
    },
    currency: {
      type: String,
      enum: {
        values: CURRENCY_ENUM,
        message: '{VALUE} is not a supported currency'
      },
      required: [true, 'Currency is required']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

export const fareBreakdownSchema = new mongoose.Schema(
  {
    baseAmount: {
      type: Number,
      required: [true, 'Base fare amount is required'],
      min: [0, 'Base fare amount cannot be negative']
    },
    currency: {
      type: String,
      enum: {
        values: CURRENCY_ENUM,
        message: '{VALUE} is not a supported currency'
      },
      default: 'INR'
    },
    fareTier: {
      type: String,
      enum: {
        values: FARE_TIER_ENUM,
        message: '{VALUE} is not a valid fare tier'
      },
      default: 'economy'
    },
    isEstimated: {
      type: Boolean,
      default: false
    },
    taxesAndFees: {
      type: Number,
      min: [0, 'Taxes and fees cannot be negative'],
      default: 0
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total fare amount is required'],
      min: [0, 'Total fare amount cannot be negative'],
      validate: {
        validator: function (val) {
          // Total amount must be at least baseAmount
          return val >= this.baseAmount;
        },
        message: 'Total fare amount must be greater than or equal to base fare amount'
      }
    },
    pricingSource: {
      type: String,
      trim: true,
      default: 'provider_api'
    }
  },
  { _id: false }
);

