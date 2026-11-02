export function validateRegisterInput(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (!data.email || typeof data.email !== 'string') {
    errors.push('Valid email address is required');
  } else if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) {
    errors.push('Please provide a valid email address');
  }

  if (!data.password || typeof data.password !== 'string') {
    errors.push('Password is required');
  } else {
    if (data.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(data.password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(data.password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
      errors.push('Password must contain at least one number or special character');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateLoginInput(data) {
  const errors = [];

  if (!data.email || typeof data.email !== 'string' || !data.email.trim()) {
    errors.push('Email is required');
  }

  if (!data.password || typeof data.password !== 'string') {
    errors.push('Password is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

