import mongoose from 'mongoose';

export const TRIP_STATUS_ENUM = [
  'draft',
  'planning',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled'
];

export const TRIP_VISIBILITY_ENUM = ['private', 'shared', 'public'];

export const PARTICIPANT_ROLE_ENUM = ['owner', 'organizer', 'editor', 'viewer'];

export const INVITATION_STATUS_ENUM = ['pending', 'accepted', 'declined', 'cancelled'];

export const MEMBERSHIP_STATUS_ENUM = ['active', 'left', 'removed'];

export const TRAVEL_SPEED_ENUM = ['relaxed', 'moderate', 'fast_paced'];

export const ACTIVITY_DENSITY_ENUM = ['low', 'medium', 'high'];

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Participant User ID reference is required']
    },
    role: {
      type: String,
      enum: {
        values: PARTICIPANT_ROLE_ENUM,
        message: '{VALUE} is not a valid participant role'
      },
      default: 'viewer'
    },
    invitationStatus: {
      type: String,
      enum: {
        values: INVITATION_STATUS_ENUM,
        message: '{VALUE} is not a valid invitation status'
      },
      default: 'pending'
    },
    membershipStatus: {
      type: String,
      enum: {
        values: MEMBERSHIP_STATUS_ENUM,
        message: '{VALUE} is not a valid membership status'
      },
      default: 'active'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const travelConstraintsSchema = new mongoose.Schema(
  {
    maxBudget: {
      type: Number,
      min: [0, 'Maximum budget cannot be negative'],
      default: 0
    },
    travelSpeed: {
      type: String,
      enum: {
        values: TRAVEL_SPEED_ENUM,
        message: '{VALUE} is not a valid travel speed'
      },
      default: 'moderate'
    },
    availableTransportation: [
      {
        type: String,
        trim: true
      }
    ],
    maxDailyTravelDuration: {
      type: Number, // in minutes
      min: [0, 'Daily travel duration cannot be negative'],
      max: [1440, 'Daily travel duration cannot exceed 24 hours'],
      default: 180
    },
    activityDensity: {
      type: String,
      enum: {
        values: ACTIVITY_DENSITY_ENUM,
        message: '{VALUE} is not a valid activity density'
      },
      default: 'medium'
    },
    dietaryRestrictions: [{ type: String, trim: true }],
    accessibilityRequirements: [{ type: String, trim: true }],
    excludedPlaceCategories: [{ type: String, trim: true }],
    customRestrictions: {
      type: String,
      maxlength: [1000, 'Custom restrictions cannot exceed 1000 characters'],
      default: ''
    }
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Trip title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Trip owner ID reference is required']
    },
    destinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Destination',
      required: [true, 'Destination ID reference is required']
    },
    startingLocation: {
      name: { type: String, default: '' },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function (coords) {
            if (!coords || coords.length === 0) return true;
            return (
              Array.isArray(coords) &&
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90
            );
          },
          message: 'Starting coordinates must be valid [longitude, latitude]'
        }
      }
    },
    startDate: {
      type: Date,
      required: [true, 'Trip start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'Trip end date is required'],
      validate: {
        validator: function (value) {
          if (!this.startDate || !value) return true;
          return value >= this.startDate;
        },
        message: 'End date must be greater than or equal to start date'
      }
    },
    travellersCount: {
      adults: { type: Number, min: [1, 'At least 1 adult is required'], default: 1 },
      children: { type: Number, min: 0, default: 0 },
      infants: { type: Number, min: 0, default: 0 }
    },
    budget: {
      currency: { type: String, default: 'NPR' },
      targetAmount: { type: Number, min: [0, 'Target budget cannot be negative'], default: 0 },
      spentAmount: { type: Number, min: [0, 'Spent amount cannot be negative'], default: 0 }
    },
    transportationPreferences: [{ type: String, trim: true }],
    travelConstraints: {
      type: travelConstraintsSchema,
      default: () => ({})
    },
    participants: {
      type: [participantSchema],
      default: [],
      validate: {
        validator: function (participants) {
          if (!participants || participants.length <= 1) return true;
          const userIds = participants.map((p) => p.userId.toString());
          const uniqueIds = new Set(userIds);
          return uniqueIds.size === userIds.length;
        },
        message: 'Duplicate participants are not allowed in the same trip'
      }
    },
    status: {
      type: String,
      enum: {
        values: TRIP_STATUS_ENUM,
        message: '{VALUE} is not a valid trip status'
      },
      default: 'planning'
    },
    visibility: {
      type: String,
      enum: {
        values: TRIP_VISIBILITY_ENUM,
        message: '{VALUE} is not a valid trip visibility'
      },
      default: 'private'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
tripSchema.index({ ownerId: 1, status: 1 });
tripSchema.index({ 'participants.userId': 1, status: 1 });
tripSchema.index({ destinationId: 1 });
tripSchema.index({ startDate: 1, endDate: 1 });

export const Trip = mongoose.model('Trip', tripSchema);

