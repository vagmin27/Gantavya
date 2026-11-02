import { DestinationService } from './destination.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { validateDestinationInput } from './destination.validation.js';

export class DestinationController {
  static async list(req, res, next) {
    try {
      const { country, category, limit = 20, skip = 0 } = req.query;
      const filter = {};
      if (country) filter.country = country;
      if (category) filter.categories = category;

      const destinations = await DestinationService.listDestinations(
        filter,
        parseInt(limit, 10),
        parseInt(skip, 10)
      );

      return ApiResponse.success(res, destinations, 'Destinations retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const destination = await DestinationService.getDestinationById(req.params.id);
      if (!destination) {
        return ApiResponse.error(res, 'Destination not found', 404);
      }
      return ApiResponse.success(res, destination, 'Destination retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const { isValid, errors } = validateDestinationInput(req.body);
      if (!isValid) {
        return ApiResponse.error(res, 'Validation error', 422, errors);
      }

      const destination = await DestinationService.createDestination(req.body);
      return ApiResponse.success(res, destination, 'Destination created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static getStatus(req, res) {
    return ApiResponse.success(
      res,
      { module: 'destinations', initialized: true },
      'Destinations module initialized'
    );
  }
}

