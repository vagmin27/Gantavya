import { Destination } from './destination.model.js';

export class DestinationService {
  static async listDestinations(filter = {}, limit = 20, skip = 0) {
    return await Destination.find(filter).limit(limit).skip(skip).sort({ name: 1 });
  }

  static async getDestinationById(id) {
    return await Destination.findById(id);
  }

  static async createDestination(destinationData) {
    const destination = new Destination(destinationData);
    return await destination.save();
  }

  static async findNearby(longitude, latitude, maxDistanceMeters = 50000) {
    return await Destination.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistanceMeters
        }
      }
    });
  }
}

