import mongoose from 'mongoose';

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

