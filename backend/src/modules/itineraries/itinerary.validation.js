export function validateItineraryDayInput(data) {
  const errors = [];

  if (!data.tripId) {
    errors.push('Trip ID is required');
  }

  if (data.dayNumber === undefined || typeof data.dayNumber !== 'number' || data.dayNumber < 1) {
    errors.push('Valid day number (>= 1) is required');
  }

  if (!data.calendarDate) {
    errors.push('Calendar date is required');
  } else if (isNaN(new Date(data.calendarDate).getTime())) {
    errors.push('Valid calendar date format is required');
  }

  if (data.estimatedExpenditure !== undefined && data.estimatedExpenditure < 0) {
    errors.push('Estimated expenditure cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

