import mongoose from 'mongoose';

export const TRAVEL_INTERESTS_ENUM = [
  'heritage',
  'nature',
  'adventure',
  'wildlife',
  'food_culinary',
  'spiritual',
  'wellness',
  'photography',
  'art_culture',
  'nightlife'
];

export const DESTINATION_TYPES_ENUM = [
  'mountains',
  'beaches',
  'historical_cities',
  'metro_cities',
  'countryside',
  'national_parks',
  'islands'
];

export const TRAVEL_STYLES_ENUM = [
  'budget',
  'luxury',
  'backpacking',
  'family',
  'solo',
  'slow_travel',
  'eco_tourism',
  'road_trip'
];

export const ACCOMMODATION_ENUM = [
  'hostel',
  'boutique_hotel',
  'luxury_resort',
  'homestay',
  'apartment',
  'campsite',
  'bed_and_breakfast'
];

export const FOOD_PREFERENCES_ENUM = [
  'vegetarian',
  'vegan',
  'halal',
  'kosher',
  'local_cuisine',
  'gluten_free',
  'no_preference'
];

export const TRANSPORTATION_ENUM = [
  'flight',
  'train',
  'bus',
  'rental_car',
  'two_wheeler',
  'walking',
  'shared_cab'
];

const accessibilitySchema = new mongoose.Schema(
  {
    wheelchairAccessible: { type: Boolean, default: false },
    stepFreeAccess: { type: Boolean, default: false },
    limitedWalkingRequired: { type: Boolean, default: false },
    audioVisualAids: { type: Boolean, default: false },
    notes: { type: String, maxlength: [500, 'Notes cannot exceed 500 characters'], default: '' }
  },
  { _id: false }
);

const personalisationSchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      enum: ['NPR', 'USD', 'INR', 'EUR', 'GBP'],
      default: 'NPR'
    },
    language: {
      type: String,
      default: 'en'
    },
    aiAssistanceLevel: {
      type: String,
      enum: ['minimal', 'balanced', 'proactive'],
      default: 'balanced'
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      tripReminders: { type: Boolean, default: true }
    }
  },
  { _id: false }
);

const travellerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      unique: true
    },
    travelInterests: [
      {
        type: String,
        enum: {
          values: TRAVEL_INTERESTS_ENUM,
          message: '{VALUE} is not a valid travel interest'
        }
      }
    ],
    preferredDestinations: [
      {
        type: String,
        enum: {
          values: DESTINATION_TYPES_ENUM,
          message: '{VALUE} is not a valid destination preference'
        }
      }
    ],
    preferredTravelStyles: [
      {
        type: String,
        enum: {
          values: TRAVEL_STYLES_ENUM,
          message: '{VALUE} is not a valid travel style'
        }
      }
    ],
    accommodationPreferences: [
      {
        type: String,
        enum: {
          values: ACCOMMODATION_ENUM,
          message: '{VALUE} is not a valid accommodation preference'
        }
      }
    ],
    foodPreferences: [
      {
        type: String,
        enum: {
          values: FOOD_PREFERENCES_ENUM,
          message: '{VALUE} is not a valid food preference'
        }
      }
    ],
    preferredTransportation: [
      {
        type: String,
        enum: {
          values: TRANSPORTATION_ENUM,
          message: '{VALUE} is not a valid transportation mode'
        }
      }
    ],
    accessibilityPreferences: {
      type: accessibilitySchema,
      default: () => ({})
    },
    personalisationSettings: {
      type: personalisationSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

export const TravellerProfile = mongoose.model('TravellerProfile', travellerProfileSchema);

