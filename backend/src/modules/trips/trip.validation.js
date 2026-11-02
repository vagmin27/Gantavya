import {
  TRIP_STATUS_ENUM,
  TRIP_VISIBILITY_ENUM,
  PARTICIPANT_ROLE_ENUM,
  INVITATION_STATUS_ENUM
} from './trip.model.js';

export function validateTripCreate(data) {
  const errors = [];

  if (!data.ownerId) {
    errors.push('Trip owner ID is required');
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 2) {
    errors.push('Trip title is required (min 2 characters)');
  }

  if (!data.destinationId) {
    errors.push('Destination ID is required');
  }

  if (!data.startDate) {
    errors.push('Start date is required');
  }

  if (!data.endDate) {
    errors.push('End date is required');
  }

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push('Invalid start or end date format');
    } else if (end < start) {
      errors.push('End date cannot be earlier than start date');
    }
  }

  if (data.status && !TRIP_STATUS_ENUM.includes(data.status)) {
    errors.push(`Invalid trip status. Valid options: ${TRIP_STATUS_ENUM.join(', ')}`);
  }

  if (data.visibility && !TRIP_VISIBILITY_ENUM.includes(data.visibility)) {
    errors.push(`Invalid visibility. Valid options: ${TRIP_VISIBILITY_ENUM.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateParticipantAdd(data) {
  const errors = [];

  if (!data.userId) {
    errors.push('User ID to add as participant is required');
  }

  if (data.role && !PARTICIPANT_ROLE_ENUM.includes(data.role)) {
    errors.push(`Invalid participant role. Valid options: ${PARTICIPANT_ROLE_ENUM.join(', ')}`);
  }

  if (data.invitationStatus && !INVITATION_STATUS_ENUM.includes(data.invitationStatus)) {
    errors.push(`Invalid invitation status. Valid options: ${INVITATION_STATUS_ENUM.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
