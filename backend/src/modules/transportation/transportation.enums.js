/**
 * Unified Transportation Domain Enums
 * Gantavya Platform - Milestone 2.4
 */

export const TRANSPORT_MODE_ENUM = [
  'walking',
  'road_driving',
  'road_cab',
  'bus',
  'rail',
  'air',
  'ferry',
  'cable_car',
  'other'
];

export const TRANSPORT_NODE_TYPE_ENUM = [
  'coordinates',
  'airport',
  'rail_station',
  'bus_terminal',
  'metro_station',
  'port',
  'landmark'
];

export const DATA_FRESHNESS_ENUM = [
  'realtime',
  'scheduled',
  'historical_estimate',
  'stale_cache'
];

export const LEG_STATUS_ENUM = [
  'scheduled',
  'active',
  'delayed',
  'cancelled',
  'completed',
  'unknown'
];

export const FARE_TIER_ENUM = [
  'free',
  'economy',
  'premium_economy',
  'business',
  'first',
  'standard',
  'sleeper',
  'ac_tier_1',
  'ac_tier_2',
  'ac_tier_3',
  'chair_car',
  'custom'
];

export const CURRENCY_ENUM = ['INR', 'NPR', 'USD', 'EUR', 'GBP'];

export const ROUTE_CATEGORY_ENUM = [
  'fastest',
  'cheapest',
  'fewest_transfers',
  'most_convenient',
  'best_overall',
  'custom'
];

export const ADDITIONAL_COST_TYPE_ENUM = [
  'toll',
  'parking',
  'baggage',
  'seat_selection',
  'service_tax',
  'airport_fee',
  'other'
];

export const TRANSFER_TYPE_ENUM = [
  'same_station',
  'cross_terminal',
  'cross_city',
  'mode_switch'
];

export const SEGMENT_TYPE_ENUM = [
  'first_mile',
  'intercity_transit',
  'last_mile',
  'sightseeing_transit'
];

