import mongoose from 'mongoose';

export const DESTINATION_CATEGORIES_ENUM = [
  'scenic',
  'trekking',
  'cultural',
  'adventure',
  'spiritual',
  'wildlife',
  'urban',
  'nature',
  'historical'
];

export const SEASONS_ENUM = ['spring', 'summer', 'monsoon', 'autumn', 'winter'];

const bestVisitingPeriodsSchema = new mongoose.Schema(
  {
    seasons: [
      {
        type: String,
        enum: {
          values: SEASONS_ENUM,
          message: '{VALUE} is not a valid season'
        }
      }
    ],
    months: [
      {
        type: Number,
        min: [1, 'Month must be between 1 and 12'],
        max: [12, 'Month must be between 1 and 12']
      }
    ],
    description: {
      type: String,
      maxlength: [500, 'Season description cannot exceed 500 characters'],
      default: ''
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
      required: [true, 'Geographic coordinates [longitude, latitude] are required'],
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

const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Destination name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [150, 'Name cannot exceed 150 characters']
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    location: {
      type: pointSchema,
      required: [true, 'Destination location coordinates are required']
    },
    description: {
      type: String,
      required: [true, 'Destination description is required'],
      trim: true,
      maxlength: [3000, 'Description cannot exceed 3000 characters']
    },
    categories: [
      {
        type: String,
        enum: {
          values: DESTINATION_CATEGORIES_ENUM,
          message: '{VALUE} is not a valid destination category'
        }
      }
    ],
    bestVisitingPeriods: {
      type: bestVisitingPeriodsSchema,
      default: () => ({})
    },
    metadata: {
      popularTags: [{ type: String, trim: true }],
      averageDailyBudget: {
        currency: { type: String, default: 'NPR' },
        amount: { type: Number, min: 0, default: 0 }
      },
      timeZone: { type: String, default: 'Asia/Kathmandu' },
      climateType: { type: String, default: '' },
      coverImageUrl: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
destinationSchema.index({ location: '2dsphere' });
destinationSchema.index({ country: 1, city: 1 });
destinationSchema.index({ categories: 1 });
destinationSchema.index({ name: 'text', description: 'text' });

export const Destination = mongoose.model('Destination', destinationSchema);

