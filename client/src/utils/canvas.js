// client/src/utils/canvas.js

/**
 * Canvas Utilities
 * 
 * Helper functions for canvas operations:
 * - Coordinate transformation
 * - Stroke rendering
 * - Canvas management
 */

/**
 * Get canvas coordinates from mouse event
 * 
 * Handles coordinate transformation:
 * - Screen coordinates → Canvas element coordinates
 * - Canvas element → Canvas internal resolution
 * 
 * Critical for multi-DPI displays and responsive canvases
 * 
 * @param {MouseEvent} event - Mouse event
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {[number, number]} [x, y] in canvas coordinates
 */
export function getCanvasCoordinates(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  
  // Get position relative to canvas element
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // Scale to canvas internal resolution
  // This handles cases where canvas.width !== rect.width
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return [
    Math.round(x * scaleX),
    Math.round(y * scaleY)
  ];
}

/**
 * Draw a stroke on canvas
 * 
 * Renders an array of points as a smooth path.
 * Uses quadratic curves for smoother lines.
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} stroke - Stroke object
 * @param {Array} stroke.points - Array of [x, y] points
 * @param {string} stroke.color - Hex color
 * @param {number} stroke.width - Line width
 * @param {string} stroke.tool - Tool type
 */
export function drawStroke(ctx, stroke) {
  const { points, color, width, tool } = stroke;
  
  if (!points || points.length < 2) {
    return; // Need at least 2 points to draw
  }

  ctx.save();
  
  // Set stroke style based on tool
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Tool-specific settings
  if (tool === 'highlighter') {
    ctx.globalAlpha = 0.3; // Semi-transparent
  } else if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  }

  // Begin path
  ctx.beginPath();
  
  // Move to first point
  const [startX, startY] = points[0];
  ctx.moveTo(startX, startY);
  
  // Draw smooth curve through points
  if (points.length === 2) {
    // Only 2 points - draw straight line
    const [endX, endY] = points[1];
    ctx.lineTo(endX, endY);
  } else {
    // 3+ points - draw smooth quadratic curves
    for (let i = 1; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      
      // Control point is the current point
      // End point is midpoint to next point
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      
      ctx.quadraticCurveTo(x1, y1, midX, midY);
    }
    
    // Draw line to final point
    const [lastX, lastY] = points[points.length - 1];
    ctx.lineTo(lastX, lastY);
  }
  
  // Stroke the path
  ctx.stroke();
  
  ctx.restore();
}

/**
 * Clear entire canvas
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export function clearCanvas(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
}

/**
 * Draw all strokes on canvas
 * 
 * Batch render operation for efficiency.
 * Clears canvas first, then renders all strokes.
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} strokes - Array of stroke objects
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export function renderAllStrokes(ctx, strokes, width, height) {
  // Clear canvas
  clearCanvas(ctx, width, height);
  
  // Draw each stroke
  strokes.forEach(stroke => {
    drawStroke(ctx, stroke);
  });
}

/**
 * Download canvas as PNG image
 * 
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} filename - Download filename
 */
export function downloadCanvasAsPNG(canvas, filename = 'whiteboard.png') {
  // Convert canvas to blob
  canvas.toBlob(blob => {
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  });
}

/**
 * Get canvas as data URL
 * 
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} type - Image type (default: 'image/png')
 * @returns {string} Data URL
 */
export function getCanvasDataURL(canvas, type = 'image/png') {
  return canvas.toDataURL(type);
}

/**
 * Resize canvas maintaining content
 * 
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number} width - New width
 * @param {number} height - New height
 * @param {Array} strokes - Current strokes to redraw
 */
export function resizeCanvas(canvas, width, height, strokes) {
  // Store current content
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Resize canvas
  canvas.width = width;
  canvas.height = height;
  
  // Redraw strokes (better than scaling bitmap)
  renderAllStrokes(ctx, strokes, width, height);
}

/**
 * Throttle function execution
 * 
 * Limits how often a function can be called.
 * Useful for mouse move events.
 * 
 * @param {Function} func - Function to throttle
 * @param {number} limit - Min time between calls (ms)
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Debounce function execution
 * 
 * Delays function execution until after a period of inactivity.
 * Useful for resize events.
 * 
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Calculate distance between two points
 * 
 * Used for stroke smoothing - skip points that are too close.
 * 
 * @param {[number, number]} point1 - First point [x, y]
 * @param {[number, number]} point2 - Second point [x, y]
 * @returns {number} Distance
 */
export function getDistance(point1, point2) {
  const [x1, y1] = point1;
  const [x2, y2] = point2;
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Simplify stroke by removing redundant points
 * 
 * Reduces points while maintaining visual quality.
 * Uses Douglas-Peucker algorithm (simplified version).
 * 
 * @param {Array} points - Array of [x, y] points
 * @param {number} tolerance - Distance tolerance (default: 2)
 * @returns {Array} Simplified points
 */
export function simplifyStroke(points, tolerance = 2) {
  if (points.length <= 2) {
    return points;
  }

  // Simple distance-based simplification
  // Keep first and last points, remove middle points that are too close
  const simplified = [points[0]];
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = getDistance(simplified[simplified.length - 1], points[i]);
    
    if (dist >= tolerance) {
      simplified.push(points[i]);
    }
  }
  
  // Always keep last point
  simplified.push(points[points.length - 1]);
  
  return simplified;
}

/**
 * Get stroke bounding box
 * 
 * @param {Array} points - Array of [x, y] points
 * @returns {Object} Bounding box { minX, minY, maxX, maxY }
 */
export function getStrokeBounds(points) {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  points.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  return { minX, minY, maxX, maxY };
}