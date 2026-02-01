// client/src/utils/strokeSelection.js

/**
 * Stroke Selection Utilities
 * 
 * Functions for selecting and manipulating strokes on canvas.
 */

/**
 * Check if a point is near a stroke
 * 
 * @param {[number, number]} point - Point to test [x, y]
 * @param {Object} stroke - Stroke object
 * @param {number} threshold - Distance threshold (default: 10)
 * @returns {boolean} True if point is near stroke
 */
export function isPointNearStroke(point, stroke, threshold = 10) {
  const [px, py] = point;
  
  // Check each line segment in the stroke
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const [x1, y1] = stroke.points[i];
    const [x2, y2] = stroke.points[i + 1];
    
    const distance = distanceToLineSegment(px, py, x1, y1, x2, y2);
    
    if (distance <= threshold + stroke.width / 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Distance from point to line segment
 * 
 * @param {number} px - Point x
 * @param {number} py - Point y
 * @param {number} x1 - Line start x
 * @param {number} y1 - Line start y
 * @param {number} x2 - Line end x
 * @param {number} y2 - Line end y
 * @returns {number} Distance
 */
function distanceToLineSegment(px, py, x1, y1, x2, y2) {
  // Vector from line start to point
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  // If line segment is a point
  if (dx === 0 && dy === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }
  
  // Calculate projection of point onto line
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  
  // Closest point on line segment
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  
  // Distance from point to closest point
  return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
}

/**
 * Find stroke at point
 * 
 * Returns the topmost stroke at the given point.
 * Searches from end to start (topmost strokes first).
 * 
 * @param {[number, number]} point - Point to test
 * @param {Array} strokes - Array of strokes
 * @param {number} threshold - Distance threshold
 * @returns {Object|null} Found stroke or null
 */
export function findStrokeAtPoint(point, strokes, threshold = 10) {
  // Search backwards (topmost strokes first)
  for (let i = strokes.length - 1; i >= 0; i--) {
    const stroke = strokes[i];
    
    if (isPointNearStroke(point, stroke, threshold)) {
      return stroke;
    }
  }
  
  return null;
}

/**
 * Find all strokes in rectangle
 * 
 * @param {Object} rect - Rectangle { x, y, width, height }
 * @param {Array} strokes - Array of strokes
 * @returns {Array} Strokes within rectangle
 */
export function findStrokesInRect(rect, strokes) {
  const selected = [];
  
  for (const stroke of strokes) {
    if (isStrokeInRect(stroke, rect)) {
      selected.push(stroke);
    }
  }
  
  return selected;
}

/**
 * Check if stroke intersects rectangle
 * 
 * @param {Object} stroke - Stroke object
 * @param {Object} rect - Rectangle { x, y, width, height }
 * @returns {boolean} True if stroke intersects
 */
function isStrokeInRect(stroke, rect) {
  const { x, y, width, height } = rect;
  const right = x + width;
  const bottom = y + height;
  
  // Check if any point is inside rectangle
  for (const [px, py] of stroke.points) {
    if (px >= x && px <= right && py >= y && py <= bottom) {
      return true;
    }
  }
  
  return false;
}

/**
 * Highlight stroke on canvas
 * 
 * Draws a highlighted version of the stroke for selection feedback.
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} stroke - Stroke to highlight
 */
export function highlightStroke(ctx, stroke) {
  ctx.save();
  
  // Draw glow effect
  ctx.strokeStyle = '#3498db';
  ctx.lineWidth = stroke.width + 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.3;
  
  ctx.beginPath();
  
  const [startX, startY] = stroke.points[0];
  ctx.moveTo(startX, startY);
  
  for (let i = 1; i < stroke.points.length; i++) {
    const [x, y] = stroke.points[i];
    ctx.lineTo(x, y);
  }
  
  ctx.stroke();
  
  ctx.restore();
}