import { ACTIVITY_STATUS_ENUM } from './activity.model.js';

export function validateActivityInput(data) {
  const errors = [];

  if (!data.itineraryDayId) {
    errors.push('Itinerary Day ID reference is required');
  }

  if (!data.tripId) {
    errors.push('Trip ID reference is required');
  }

  if (!data.placeId) {
    errors.push('Place ID reference is required');
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 2) {
    errors.push('Activity title is required (min 2 characters)');
  }

  if (data.durationMinutes === undefined || typeof data.durationMinutes !== 'number' || data.durationMinutes < 5) {
    errors.push('Valid duration in minutes (>= 5) is required');
  }

  if (data.sequence === undefined || typeof data.sequence !== 'number' || data.sequence < 1) {
    errors.push('Sequence order number (>= 1) is required');
  }

  if (data.status && !ACTIVITY_STATUS_ENUM.includes(data.status)) {
    errors.push(`Invalid activity status. Valid options: ${ACTIVITY_STATUS_ENUM.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

