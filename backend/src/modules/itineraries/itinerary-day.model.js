import mongoose from 'mongoose';

export const CONFLICT_TYPE_ENUM = [
  'OVERLAPPING_ACTIVITIES',
  'ACTIVITY_DURING_TRANSIT',
  'MISSED_CONNECTION',
  'INSUFFICIENT_TRANSFER_BUFFER',
  'ARRIVAL_AFTER_ACTIVITY_START',
  'ACCOMMODATION_CONFLICT',
  'DAY_BOUNDARY_VIOLATION'
];

export const TRANSITION_TYPE_ENUM = ['destination', 'activity', 'accommodation', 'custom'];
export const BOOKING_STATUS_ENUM = ['unbooked', 'reserved', 'ticketed', 'confirmed'];

const conflictSchema = new mongoose.Schema(
  {
    conflictId: {
      type: String,
      default: () => `conf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    },
    conflictType: {
      type: String,
      enum: {
        values: CONFLICT_TYPE_ENUM,
        message: '{VALUE} is not a valid conflict type'
      },
      required: true
    },
    severity: {
      type: String,
      enum: ['error', 'warning'],
      default: 'warning'
    },
    message: {
      type: String,
      required: true
    },
    affectedEntityIds: [{ type: String }],
    suggestedAction: {
      type: String,
      default: ''
    }
  },
  { _id: true }
);

const transitionSchema = new mongoose.Schema(
  {
    transitionId: {
      type: String,
      default: () => `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    },
    fromType: {
      type: String,
      enum: TRANSITION_TYPE_ENUM,
      default: 'custom'
    },
    fromId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    fromLocation: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    toType: {
      type: String,
      enum: TRANSITION_TYPE_ENUM,
      default: 'custom'
    },
    toId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    toLocation: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    departureTime: {
      type: Date,
      required: [true, 'Departure time is required for transit transition']
    },
    arrivalTime: {
      type: Date,
      required: [true, 'Arrival time is required for transit transition']
    },
    durationMinutes: {
      type: Number,
      min: 0,
      default: 0
    },
    distanceMeters: {
      type: Number,
      min: 0,
      default: 0
    },
    isOvernight: {
      type: Boolean,
      default: false
    },
    arrivalDayNumber: {
      type: Number,
      default: null
    },
    selectedCategory: {
      type: String,
      default: 'best_overall'
    },
    selectedRoute: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    alternativeRoutes: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    bookingStatus: {
      type: String,
      enum: BOOKING_STATUS_ENUM,
      default: 'unbooked'
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    providerReferences: [{ type: String, trim: true }]
  },
  { _id: true, timestamps: true }
);

const accommodationStaySchema = new mongoose.Schema(
  {
    accommodationId: {
      type: String,
      default: () => `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    },
    name: {
      type: String,
      default: ''
    },
    location: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    checkInTime: {
      type: String,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Check-in time must be HH:MM format (24h)'],
      default: '14:00'
    },
    checkOutTime: {
      type: String,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Check-out time must be HH:MM format (24h)'],
      default: '11:00'
    },
    checkInDate: {
      type: Date,
      default: null
    },
    checkOutDate: {
      type: Date,
      default: null
    },
    bookingReference: {
      type: String,
      default: ''
    },
    isLocked: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const itineraryDaySchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID reference is required']
    },
    dayNumber: {
      type: Number,
      required: [true, 'Day number is required'],
      min: [1, 'Day number must be at least 1']
    },
    calendarDate: {
      type: Date,
      required: [true, 'Calendar date is required']
    },
    title: {
      type: String,
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
      default: ''
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: ''
    },
    estimatedExpenditure: {
      type: Number,
      min: [0, 'Estimated expenditure cannot be negative'],
      default: 0
    },
    travelDistanceKm: {
      type: Number,
      min: [0, 'Travel distance cannot be negative'],
      default: 0
    },
    travelDurationMinutes: {
      type: Number,
      min: [0, 'Travel duration cannot be negative'],
      default: 0
    },
    transitions: {
      type: [transitionSchema],
      default: []
    },
    accommodations: {
      type: [accommodationStaySchema],
      default: []
    },
    conflicts: {
      type: [conflictSchema],
      default: []
    },
    hasConflicts: {
      type: Boolean,
      default: false
    },
    isLocked: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound Unique Index: Prevent duplicate day numbers in the same trip
itineraryDaySchema.index({ tripId: 1, dayNumber: 1 }, { unique: true });
itineraryDaySchema.index({ tripId: 1, calendarDate: 1 });

export const ItineraryDay = mongoose.model('ItineraryDay', itineraryDaySchema);

