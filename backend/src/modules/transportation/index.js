export * from './transportation.enums.js';
export { transportNodeSchema } from './transport-node.schema.js';
export { fareBreakdownSchema, additionalCostSchema } from './fare-breakdown.schema.js';
export { transferSchema } from './transfer.schema.js';
export { dataFreshnessSchema } from './data-freshness.schema.js';
export { transitLegSchema } from './transit-leg.schema.js';
export { routeSegmentSchema } from './route-segment.schema.js';
export { RouteOption } from './route-option.model.js';
export {
  travellerConstraintsSchema,
  transportationPreferencesSchema,
  accessibilityConstraintsSchema,
  passengerCountSchema
} from './transportation-preferences.schema.js';
export { TransportationProviderAdapter } from './provider-adapter.interface.js';
export {
  validateTransportNode,
  validateFareBreakdown,
  validateTransitLeg
} from './transportation.validation.js';

// Providers and Adapters
export { HereRoadAdapter } from './adapters/here-road.adapter.js';
export { AmadeusFlightAdapter, AIRLINE_NAMES } from './adapters/amadeus-flight.adapter.js';
export {
  IndianRailwaysAdapter,
  INDIAN_RAILWAYS_STATIONS,
  VERIFIED_SCHEDULED_TRAINS
} from './adapters/railway.adapter.js';

// MongoDB TTL Cache
export { TransitCache, transitCacheSchema } from './cache/transit-cache.model.js';
export { TransitCacheService, CACHE_TTL_SECONDS } from './cache/transit-cache.service.js';

// Multi-Modal Provider Aggregation Service
export {
  TransportationProviderService,
  defaultProviderService
} from './transportation-provider.service.js';

// Route Optimizer Service (East-West Intelligence Integration)
export {
  RouteOptimizerService,
  defaultRouteOptimizerService
} from './route-optimizer.service.js';

export { default as transportationRoutes } from './transportation.routes.js';
export { TransportationController } from './transportation.controller.js';
