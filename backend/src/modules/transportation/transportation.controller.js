import { ApiResponse } from '../../utils/api-response.js';
import { TRANSPORT_MODE_ENUM, CURRENCY_ENUM, ROUTE_CATEGORY_ENUM } from './transportation.enums.js';
import { validateTransitLeg, validateTransportNode } from './transportation.validation.js';
import { defaultProviderService } from './transportation-provider.service.js';
import { TransitCacheService } from './cache/transit-cache.service.js';

export class TransportationController {
  static getStatus(req, res) {
    return ApiResponse.success(
      res,
      {
        module: 'transportation',
        initialized: true,
        supportedModes: TRANSPORT_MODE_ENUM,
        supportedCurrencies: CURRENCY_ENUM,
        routeCategories: ROUTE_CATEGORY_ENUM,
        cachingBackend: 'mongodb_ttl'
      },
      'Transportation domain module initialized'
    );
  }

  static async getProvidersStatus(req, res) {
    try {
      const status = await defaultProviderService.getProvidersStatus();
      return ApiResponse.success(res, status, 'Provider health statuses retrieved');
    } catch (err) {
      return ApiResponse.error(res, `Failed to retrieve provider statuses: ${err.message}`, 500);
    }
  }

  static async searchTransportation(req, res) {
    try {
      const { origin, destination, departureDate, modes, options } = req.body;

      // Validate origin and destination transport nodes
      const originValidation = validateTransportNode(origin, 'Origin');
      if (!originValidation.isValid) {
        return ApiResponse.error(res, 'Invalid origin transport node', 422, originValidation.errors);
      }

      const destValidation = validateTransportNode(destination, 'Destination');
      if (!destValidation.isValid) {
        return ApiResponse.error(res, 'Invalid destination transport node', 422, destValidation.errors);
      }

      const searchResult = await defaultProviderService.searchTransportation({
        origin,
        destination,
        departureDate: departureDate ? new Date(departureDate) : new Date(),
        modes: Array.isArray(modes) ? modes : [],
        options: options || {}
      });

      return ApiResponse.success(res, searchResult, 'Transportation options retrieved');
    } catch (err) {
      return ApiResponse.error(res, `Transportation search failed: ${err.message}`, 500);
    }
  }

  static validateLegPayload(req, res) {
    const { isValid, errors } = validateTransitLeg(req.body);
    if (!isValid) {
      return ApiResponse.error(res, 'Transit leg validation failed', 422, errors);
    }
    return ApiResponse.success(res, { validated: true, leg: req.body }, 'Transit leg is valid');
  }

  static async purgeCache(req, res) {
    try {
      const filter = req.body?.filter || {};
      const result = await TransitCacheService.invalidate(filter);
      return ApiResponse.success(res, result, 'Transit cache purged successfully');
    } catch (err) {
      return ApiResponse.error(res, `Cache purge failed: ${err.message}`, 500);
    }
  }
}
