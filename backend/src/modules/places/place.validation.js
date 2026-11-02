import { PLACE_CATEGORIES_ENUM, PRICE_TIER_ENUM } from './place.model.js';

export function validatePlaceInput(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Place name is required (min 2 characters)');
  }

  if (!data.destinationId) {
    errors.push('Destination ID is required');
  }

  if (!data.category || !PLACE_CATEGORIES_ENUM.includes(data.category)) {
    errors.push(`Invalid place category. Valid options: ${PLACE_CATEGORIES_ENUM.join(', ')}`);
  }

  if (!data.location || !Array.isArray(data.location.coordinates) || data.location.coordinates.length !== 2) {
    errors.push('Valid coordinates [longitude, latitude] are required');
  } else {
    const [lng, lat] = data.location.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      errors.push('Coordinates out of range: longitude [-180, 180], latitude [-90, 90]');
    }
  }

  if (data.priceInfo?.priceTier && !PRICE_TIER_ENUM.includes(data.priceInfo.priceTier)) {
    errors.push(`Invalid price tier. Valid options: ${PRICE_TIER_ENUM.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

