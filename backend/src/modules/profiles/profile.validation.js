import {
  TRAVEL_INTERESTS_ENUM,
  DESTINATION_TYPES_ENUM,
  TRAVEL_STYLES_ENUM,
  ACCOMMODATION_ENUM,
  FOOD_PREFERENCES_ENUM,
  TRANSPORTATION_ENUM
} from './profile.model.js';

export function validateProfileUpdate(data) {
  const errors = [];

  if (data.travelInterests && Array.isArray(data.travelInterests)) {
    for (const interest of data.travelInterests) {
      if (!TRAVEL_INTERESTS_ENUM.includes(interest)) {
        errors.push(`Invalid travel interest: ${interest}`);
      }
    }
  }

  if (data.preferredTravelStyles && Array.isArray(data.preferredTravelStyles)) {
    for (const style of data.preferredTravelStyles) {
      if (!TRAVEL_STYLES_ENUM.includes(style)) {
        errors.push(`Invalid travel style: ${style}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

