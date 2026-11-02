import { PlaceService } from './place.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { validatePlaceInput } from './place.validation.js';

export class PlaceController {
  static async list(req, res, next) {
    try {
      const { destinationId, category, priceTier, limit = 50, skip = 0 } = req.query;
      const filter = {};
      if (destinationId) filter.destinationId = destinationId;
      if (category) filter.category = category;
      if (priceTier) filter['priceInfo.priceTier'] = priceTier;

      const places = await PlaceService.listPlaces(
        filter,
        parseInt(limit, 10),
        parseInt(skip, 10)
      );

      return ApiResponse.success(res, places, 'Places retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const place = await PlaceService.getPlaceById(req.params.id);
      if (!place) {
        return ApiResponse.error(res, 'Place not found', 404);
      }
      return ApiResponse.success(res, place, 'Place retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const { isValid, errors } = validatePlaceInput(req.body);
      if (!isValid) {
        return ApiResponse.error(res, 'Validation error', 422, errors);
      }

      const place = await PlaceService.createPlace(req.body);
      return ApiResponse.success(res, place, 'Place created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static getStatus(req, res) {
    return ApiResponse.success(res, { module: 'places', initialized: true }, 'Places module initialized');
  }
}

