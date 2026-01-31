// server/src/models/Stroke.js

/**
 * Stroke Model
 * 
 * Represents a drawing stroke on the canvas.
 * Immutable after creation - strokes are never edited, only added/removed.
 * 
 * Data Flow:
 * 1. Client draws stroke (collects points)
 * 2. Client sends complete stroke to server
 * 3. Server validates and assigns ID
 * 4. Server broadcasts to all clients
 * 5. Clients render the stroke
 */
class Stroke {
  constructor(data) {
    // Server-assigned unique ID (generated on server)
    this.id = data.id || null;
    
    // Stroke type (for future extensions: shapes, etc.)
    this.type = data.type || 'stroke';
    
    // Array of [x, y] coordinate pairs
    // Example: [[10, 20], [11, 21], [12, 22]]
    this.points = data.points || [];
    
    // Visual properties
    this.color = data.color || '#000000';
    this.width = data.width || 2;
    this.tool = data.tool || 'pen'; // pen, highlighter, eraser
    
    // Metadata
    this.author = data.author || 'unknown';
    this.timestamp = data.timestamp || Date.now();
    
    // Version for conflict resolution (Module 5)
    this.version = data.version || 1;
  }

  /**
   * Validate stroke data
   * Returns { valid: boolean, errors: string[] }
   */
  static validate(data) {
    const errors = [];

    // Validate points array
    if (!data.points || !Array.isArray(data.points)) {
      errors.push('Points must be an array');
    } else if (data.points.length < 2) {
      errors.push('Stroke must have at least 2 points');
    } else {
      // Validate each point is [x, y] format
      const invalidPoints = data.points.filter(point => {
        return !Array.isArray(point) || 
               point.length !== 2 || 
               typeof point[0] !== 'number' || 
               typeof point[1] !== 'number' ||
               !isFinite(point[0]) ||
               !isFinite(point[1]);
      });

      if (invalidPoints.length > 0) {
        errors.push('All points must be [x, y] number arrays');
      }
    }

    // Validate color (hex format)
    if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      errors.push('Color must be valid hex format (#RRGGBB)');
    }

    // Validate width
    if (data.width !== undefined) {
      if (typeof data.width !== 'number' || data.width < 0.5 || data.width > 50) {
        errors.push('Width must be a number between 0.5 and 50');
      }
    }

    // Validate tool
    const validTools = ['pen', 'highlighter', 'eraser'];
    if (data.tool && !validTools.includes(data.tool)) {
      errors.push(`Tool must be one of: ${validTools.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize stroke data from client
   * Removes any fields that should only be set by server
   */
  static sanitize(data) {
    return {
      type: data.type || 'stroke',
      points: data.points || [],
      color: data.color || '#000000',
      width: data.width || 2,
      tool: data.tool || 'pen',
      // Server will set: id, author, timestamp, version
    };
  }

  /**
   * Create a new stroke with server-assigned metadata
   */
  static create(clientData, author) {
    const sanitized = Stroke.sanitize(clientData);
    
    return new Stroke({
      ...sanitized,
      id: Stroke.generateId(),
      author,
      timestamp: Date.now(),
      version: 1
    });
  }

  /**
   * Generate unique stroke ID
   */
  static generateId() {
    return `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert to plain object for transmission
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      points: this.points,
      color: this.color,
      width: this.width,
      tool: this.tool,
      author: this.author,
      timestamp: this.timestamp,
      version: this.version
    };
  }

  /**
   * Get stroke bounding box (for spatial indexing later)
   */
  getBounds() {
    if (this.points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    this.points.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    return { minX, minY, maxX, maxY };
  }

  /**
   * Get approximate size in bytes (for monitoring)
   */
  getSize() {
    // Rough estimate: each point is ~16 bytes as JSON
    const pointsSize = this.points.length * 16;
    const metadataSize = 200; // Approximate
    return pointsSize + metadataSize;
  }
}

module.exports = Stroke;