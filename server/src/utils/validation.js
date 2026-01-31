// server/src/utils/validation.js

/**
 * Validation Utilities
 * 
 * Reusable validation functions for user input.
 * Never trust client data - validate everything!
 */

/**
 * Validate string input
 */
function validateString(value, fieldName, minLength = 1, maxLength = 100) {
  const errors = [];

  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
    return { valid: false, errors };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters`);
  }

  if (trimmed.length > maxLength) {
    errors.push(`${fieldName} must be at most ${maxLength} characters`);
  }

  return {
    valid: errors.length === 0,
    errors,
    value: trimmed
  };
}

/**
 * Validate number input
 */
function validateNumber(value, fieldName, min, max) {
  const errors = [];

  if (typeof value !== 'number' || !isFinite(value)) {
    errors.push(`${fieldName} must be a valid number`);
    return { valid: false, errors };
  }

  if (min !== undefined && value < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }

  if (max !== undefined && value > max) {
    errors.push(`${fieldName} must be at most ${max}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    value
  };
}

/**
 * Validate enum (one of a list of values)
 */
function validateEnum(value, fieldName, allowedValues) {
  const errors = [];

  if (!allowedValues.includes(value)) {
    errors.push(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    value
  };
}

/**
 * Validate array input
 */
function validateArray(value, fieldName, minLength = 0, maxLength = Infinity) {
  const errors = [];

  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`);
    return { valid: false, errors };
  }

  if (value.length < minLength) {
    errors.push(`${fieldName} must have at least ${minLength} items`);
  }

  if (value.length > maxLength) {
    errors.push(`${fieldName} must have at most ${maxLength} items`);
  }

  return {
    valid: errors.length === 0,
    errors,
    value
  };
}

/**
 * Validate hex color
 */
function validateHexColor(value, fieldName = 'Color') {
  const errors = [];

  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
    return { valid: false, errors };
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
    errors.push(`${fieldName} must be valid hex format (#RRGGBB)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    value
  };
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  
  return value
    .trim()
    .replace(/[<>\"']/g, '') // Remove potential XSS characters
    .substring(0, 1000); // Limit length
}

/**
 * Rate limiting helper - check if action is allowed
 */
class RateLimiter {
  constructor(maxActions, windowMs) {
    this.maxActions = maxActions;
    this.windowMs = windowMs;
    this.actions = new Map(); // userId -> [timestamps]
  }

  /**
   * Check if action is allowed for user
   */
  isAllowed(userId) {
    const now = Date.now();
    const userActions = this.actions.get(userId) || [];
    
    // Remove old actions outside the window
    const recentActions = userActions.filter(time => now - time < this.windowMs);
    
    if (recentActions.length >= this.maxActions) {
      return false;
    }
    
    // Add current action
    recentActions.push(now);
    this.actions.set(userId, recentActions);
    
    return true;
  }

  /**
   * Reset rate limit for user
   */
  reset(userId) {
    this.actions.delete(userId);
  }

  /**
   * Clean up old entries periodically
   */
  cleanup() {
    const now = Date.now();
    this.actions.forEach((timestamps, userId) => {
      const recent = timestamps.filter(time => now - time < this.windowMs);
      if (recent.length === 0) {
        this.actions.delete(userId);
      } else {
        this.actions.set(userId, recent);
      }
    });
  }
}

module.exports = {
  validateString,
  validateNumber,
  validateEnum,
  validateArray,
  validateHexColor,
  sanitizeString,
  RateLimiter
};