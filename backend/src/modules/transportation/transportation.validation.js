import {
  TRANSPORT_MODE_ENUM,
  TRANSPORT_NODE_TYPE_ENUM,
  CURRENCY_ENUM,
  FARE_TIER_ENUM,
  DATA_FRESHNESS_ENUM,
  LEG_STATUS_ENUM
} from './transportation.enums.js';

export function validateTransportNode(node, fieldPrefix = 'Node') {
  const errors = [];
  if (!node) {
    return { isValid: false, errors: [`${fieldPrefix} is required`] };
  }

  if (!node.nodeId || typeof node.nodeId !== 'string' || !node.nodeId.trim()) {
    errors.push(`${fieldPrefix} ID is required`);
  }

  if (!node.name || typeof node.name !== 'string' || node.name.trim().length < 2) {
    errors.push(`${fieldPrefix} name is required (min 2 characters)`);
  }

  if (node.nodeType && !TRANSPORT_NODE_TYPE_ENUM.includes(node.nodeType)) {
    errors.push(`Invalid ${fieldPrefix} type. Valid options: ${TRANSPORT_NODE_TYPE_ENUM.join(', ')}`);
  }

  const coords = node.location?.coordinates || node.coordinates;
  if (!coords || !Array.isArray(coords) || coords.length !== 2) {
    errors.push(`${fieldPrefix} coordinates must be [longitude, latitude]`);
  } else {
    const [lng, lat] = coords;
    if (typeof lng !== 'number' || lng < -180 || lng > 180) {
      errors.push(`${fieldPrefix} longitude must be a number between -180 and 180`);
    }
    if (typeof lat !== 'number' || lat < -90 || lat > 90) {
      errors.push(`${fieldPrefix} latitude must be a number between -90 and 90`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateFareBreakdown(fare) {
  const errors = [];
  if (!fare) {
    return { isValid: false, errors: ['Fare breakdown is required'] };
  }

  if (typeof fare.baseAmount !== 'number' || fare.baseAmount < 0) {
    errors.push('Base fare amount must be a non-negative number');
  }

  if (fare.currency && !CURRENCY_ENUM.includes(fare.currency)) {
    errors.push(`Unsupported currency: ${fare.currency}. Allowed: ${CURRENCY_ENUM.join(', ')}`);
  }

  if (fare.fareTier && !FARE_TIER_ENUM.includes(fare.fareTier)) {
    errors.push(`Invalid fare tier: ${fare.fareTier}`);
  }

  if (typeof fare.totalAmount !== 'number' || fare.totalAmount < 0) {
    errors.push('Total fare amount must be a non-negative number');
  } else if (fare.baseAmount !== undefined && fare.totalAmount < fare.baseAmount) {
    errors.push('Total fare amount cannot be less than base amount');
  }

  return { isValid: errors.length === 0, errors };
}

export function validateTransitLeg(leg) {
  const errors = [];
  if (!leg) {
    return { isValid: false, errors: ['Transit leg data is required'] };
  }

  if (!leg.legId || typeof leg.legId !== 'string' || !leg.legId.trim()) {
    errors.push('Transit leg ID is required');
  }

  if (!leg.mode || !TRANSPORT_MODE_ENUM.includes(leg.mode)) {
    errors.push(`Valid transport mode is required. Allowed: ${TRANSPORT_MODE_ENUM.join(', ')}`);
  }

  const originValidation = validateTransportNode(leg.origin, 'Origin node');
  if (!originValidation.isValid) errors.push(...originValidation.errors);

  const destValidation = validateTransportNode(leg.destination, 'Destination node');
  if (!destValidation.isValid) errors.push(...destValidation.errors);

  if (!leg.departureTime) {
    errors.push('Departure timestamp is required');
  }
  if (!leg.arrivalTime) {
    errors.push('Arrival timestamp is required');
  }

  if (leg.departureTime && leg.arrivalTime) {
    const dep = new Date(leg.departureTime);
    const arr = new Date(leg.arrivalTime);
    if (isNaN(dep.getTime()) || isNaN(arr.getTime())) {
      errors.push('Departure and arrival timestamps must be valid ISO date strings');
    } else if (arr <= dep) {
      errors.push('Arrival time must be strictly after departure time');
    }
  }

  if (typeof leg.durationMinutes !== 'number' || leg.durationMinutes < 1) {
    errors.push('Duration must be a positive integer in minutes (>= 1)');
  }

  if (typeof leg.distanceMeters !== 'number' || leg.distanceMeters < 0) {
    errors.push('Distance in meters must be a non-negative number');
  }

  const fareValidation = validateFareBreakdown(leg.fare);
  if (!fareValidation.isValid) errors.push(...fareValidation.errors);

  if (leg.dataFreshness) {
    if (
      leg.dataFreshness.freshnessLevel &&
      !DATA_FRESHNESS_ENUM.includes(leg.dataFreshness.freshnessLevel)
    ) {
      errors.push(`Invalid data freshness level. Allowed: ${DATA_FRESHNESS_ENUM.join(', ')}`);
    }
    if (
      leg.dataFreshness.confidenceScore !== undefined &&
      (typeof leg.dataFreshness.confidenceScore !== 'number' ||
        leg.dataFreshness.confidenceScore < 0.0 ||
        leg.dataFreshness.confidenceScore > 1.0)
    ) {
      errors.push('Confidence score must be a number between 0.0 and 1.0');
    }
  } else {
    errors.push('Data freshness metadata is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

