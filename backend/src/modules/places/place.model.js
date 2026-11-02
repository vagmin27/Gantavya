import mongoose from 'mongoose';

export const PLACE_CATEGORIES_ENUM = [
  'tourist_attraction',
  'restaurant',
  'hotel',
  'nature_spot',
  'historical_place',
  'adventure_activity',
  'cultural_center',
  'viewpoint',
  'market'
];

export const PRICE_TIER_ENUM = ['free', 'budget', 'moderate', 'expensive', 'luxury'];

export const DAYS_OF_WEEK_ENUM = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

const openingHourSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: {
        values: DAYS_OF_WEEK_ENUM,
        message: '{VALUE} is not a valid day of week'
      },
      required: true
    },
    open: {
      type: String,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Opening time must be HH:MM format (24h)'],
      default: '09:00'
    },
    close: {
      type: String,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Closing time must be HH:MM format (24h)'],
      default: '18:00'
    },
    isClosed: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Place location coordinates are required'],
      validate: {
        validator: function (coords) {
          return (
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords[0] >= -180 &&
            coords[0] <= 180 &&
            coords[1] >= -90 &&
            coords[1] <= 90
          );
        },
        message: 'Coordinates must be valid [longitude (-180 to 180), latitude (-90 to 90)]'
      }
    }
  },
  { _id: false }
);

const placeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Place name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [150, 'Name cannot exceed 150 characters']
    },
    destinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Destination',
      required: [true, 'Destination ID reference is required']
    },
    category: {
      type: String,
      enum: {
        values: PLACE_CATEGORIES_ENUM,
        message: '{VALUE} is not a valid place category'
      },
      required: [true, 'Place category is required']
    },
    location: {
      type: pointSchema,
      required: [true, 'Place location coordinates are required']
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      postalCode: { type: String, default: '' }
    },
    openingHours: [openingHourSchema],
    estimatedVisitDuration: {
      type: Number, // in minutes
      required: [true, 'Estimated visit duration in minutes is required'],
      min: [5, 'Visit duration must be at least 5 minutes'],
      max: [1440, 'Visit duration cannot exceed 24 hours (1440 minutes)'],
      default: 60
    },
    priceInfo: {
      priceTier: {
        type: String,
        enum: {
          values: PRICE_TIER_ENUM,
          message: '{VALUE} is not a valid price tier'
        },
        default: 'budget'
      },
      estimatedCost: {
        type: Number,
        min: [0, 'Cost cannot be negative'],
        default: 0
      },
      currency: {
        type: String,
        default: 'NPR'
      }
    },
    rating: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
      default: 0
    },
    reviewCount: {
      type: Number,
      min: 0,
      default: 0
    },
    contact: {
      phone: { type: String, default: '' },
      website: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
placeSchema.index({ location: '2dsphere' });
placeSchema.index({ destinationId: 1, category: 1 });
placeSchema.index({ rating: -1 });
placeSchema.index({ 'priceInfo.priceTier': 1 });

export const Place = mongoose.model('Place', placeSchema);

