import { DESTINATION_CATEGORIES_ENUM } from './destination.model.js';

export function validateDestinationInput(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Destination name is required (min 2 characters)');
  }

  if (!data.country || typeof data.country !== 'string') {
    errors.push('Country is required');
  }

  if (!data.description || typeof data.description !== 'string') {
    errors.push('Description is required');
  }

  if (!data.location || !Array.isArray(data.location.coordinates) || data.location.coordinates.length !== 2) {
    errors.push('Valid coordinates [longitude, latitude] are required');
  } else {
    const [lng, lat] = data.location.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      errors.push('Coordinates out of range: longitude [-180, 180], latitude [-90, 90]');
    }
  }

  if (data.categories && Array.isArray(data.categories)) {
    for (const cat of data.categories) {
      if (!DESTINATION_CATEGORIES_ENUM.includes(cat)) {
        errors.push(`Invalid destination category: ${cat}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

