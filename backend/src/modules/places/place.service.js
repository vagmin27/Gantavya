import { Place } from './place.model.js';

export class PlaceService {
  static async listPlaces(filter = {}, limit = 50, skip = 0) {
    return await Place.find(filter)
      .limit(limit)
      .skip(skip)
      .sort({ rating: -1, name: 1 })
      .populate('destinationId', 'name country city');
  }

  static async getPlaceById(id) {
    return await Place.findById(id).populate('destinationId', 'name country city');
  }

  static async createPlace(placeData) {
    const place = new Place(placeData);
    return await place.save();
  }

  static async findNearby(longitude, latitude, maxDistanceMeters = 10000, category = null) {
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistanceMeters
        }
      }
    };

    if (category) {
      query.category = category;
    }

    return await Place.find(query);
  }
}

