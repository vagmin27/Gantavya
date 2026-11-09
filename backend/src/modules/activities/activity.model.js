import mongoose from 'mongoose';

export const ACTIVITY_STATUS_ENUM = [
  'planned',
  'in_progress',
  'completed',
  'skipped',
  'cancelled'
];

const activitySchema = new mongoose.Schema(
  {
    itineraryDayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItineraryDay',
      required: [true, 'Itinerary Day ID reference is required']
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID reference is required']
    },
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
      default: null
    },
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },
    startTime: {
      type: String,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be HH:MM format (24h)'],
      default: '09:00'
    },
    endTime: {
      type: String,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be HH:MM format (24h)'],
      default: '10:30'
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [5, 'Duration must be at least 5 minutes'],
      max: [1440, 'Duration cannot exceed 24 hours']
    },
    sequence: {
      type: Number,
      required: [true, 'Sequence order number is required'],
      min: [1, 'Sequence must be at least 1']
    },
    estimatedCost: {
      type: Number,
      min: [0, 'Estimated cost cannot be negative'],
      default: 0
    },
    travelTimeToNextMinutes: {
      type: Number,
      min: [0, 'Travel time to next activity cannot be negative'],
      default: 0
    },
    travelDistanceToNextMeters: {
      type: Number,
      min: [0, 'Travel distance to next activity cannot be negative'],
      default: 0
    },
    status: {
      type: String,
      enum: {
        values: ACTIVITY_STATUS_ENUM,
        message: '{VALUE} is not a valid activity status'
      },
      default: 'planned'
    }
  },
  {
    timestamps: true
  }
);

// Compound Unique Index: Prevent duplicate sequence in the same day
activitySchema.index({ itineraryDayId: 1, sequence: 1 }, { unique: true });
activitySchema.index({ tripId: 1 });
activitySchema.index({ placeId: 1 });
activitySchema.index({ status: 1 });

export const Activity = mongoose.model('Activity', activitySchema);

