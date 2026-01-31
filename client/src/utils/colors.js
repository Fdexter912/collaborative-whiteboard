// client/src/utils/colors.js

/**
 * Color Utilities
 * 
 * Predefined colors and color manipulation functions.
 */

/**
 * Predefined color palette
 * Common colors for quick selection
 */
export const COLORS = {
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  RED: '#FF0000',
  GREEN: '#00FF00',
  BLUE: '#0000FF',
  YELLOW: '#FFFF00',
  ORANGE: '#FFA500',
  PURPLE: '#800080',
  PINK: '#FFC0CB',
  BROWN: '#A52A2A',
  GRAY: '#808080',
  CYAN: '#00FFFF',
  MAGENTA: '#FF00FF',
  LIME: '#00FF00',
  NAVY: '#000080',
  TEAL: '#008080',
  MAROON: '#800000',
  OLIVE: '#808000'
};

/**
 * Default color palette for UI
 */
export const DEFAULT_PALETTE = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FFA500', // Orange
  '#800080', // Purple
  '#FFC0CB', // Pink
  '#A52A2A', // Brown
  '#808080', // Gray
  '#00FFFF', // Cyan
];

/**
 * Validate hex color format
 * 
 * @param {string} color - Color string
 * @returns {boolean} Is valid hex color
 */
export function isValidHexColor(color) {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Convert hex to RGB
 * 
 * @param {string} hex - Hex color (#RRGGBB)
 * @returns {Object} RGB object { r, g, b }
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to hex
 * 
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Get contrasting color (black or white)
 * For text that needs to be readable on colored background
 * 
 * @param {string} hexColor - Background color
 * @returns {string} '#000000' or '#FFFFFF'
 */
export function getContrastColor(hexColor) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#000000';
  
  // Calculate luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}