import mongoose from 'mongoose';
import { TRANSPORT_NODE_TYPE_ENUM } from './transportation.enums.js';

export const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Coordinates [longitude, latitude] are required'],
      validate: {
        validator: function (coords) {
          if (!coords || !Array.isArray(coords) || coords.length !== 2) return false;
          return (
            typeof coords[0] === 'number' &&
            typeof coords[1] === 'number' &&
            coords[0] >= -180 &&
            coords[0] <= 180 &&
            coords[1] >= -90 &&
            coords[1] <= 90
          );
        },
        message: 'Coordinates must be [longitude, latitude] within valid geographic bounds'
      }
    }
  },
  { _id: false }
);

export const transportNodeSchema = new mongoose.Schema(
  {
    nodeId: {
      type: String,
      required: [true, 'Transport node ID is required'],
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Transport node name is required'],
      trim: true,
      minlength: [2, 'Node name must be at least 2 characters']
    },
    nodeType: {
      type: String,
      enum: {
        values: TRANSPORT_NODE_TYPE_ENUM,
        message: '{VALUE} is not a valid transport node type'
      },
      default: 'coordinates'
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: null // e.g. "DEL" for IATA, "NDLS" for Indian Railways
    },
    coordinates: {
      type: [Number],
      default: undefined
    },
    location: {
      type: pointSchema,
      required: [true, 'Node location is required']
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    country: {
      type: String,
      trim: true,
      default: ''
    },
    timezone: {
      type: String,
      trim: true,
      default: 'UTC'
    },
    terminalOrPlatform: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Pre-validate hook to map flat `coordinates` array to GeoJSON `location` if supplied
transportNodeSchema.pre('validate', function (next) {
  const directCoords = this.get('coordinates');
  if (Array.isArray(directCoords) && directCoords.length === 2) {
    this.location = {
      type: 'Point',
      coordinates: directCoords
    };
  } else if (this.location && Array.isArray(this.location.coordinates) && this.location.coordinates.length === 2) {
    this.set('coordinates', this.location.coordinates);
  }
  next();
});
