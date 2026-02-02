// client/src/utils/export.js

/**
 * Export/Import Utilities
 * 
 * Save and load whiteboard data.
 */

/**
 * Export strokes to JSON
 */
export function exportToJSON(strokes, roomId, metadata = {}) {
  const data = {
    version: '1.0',
    roomId,
    exportedAt: new Date().toISOString(),
    strokeCount: strokes.length,
    metadata,
    strokes
  };
  
  return JSON.stringify(data, null, 2);
}

/**
 * Import strokes from JSON
 */
export function importFromJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate structure
    if (!data.strokes || !Array.isArray(data.strokes)) {
      throw new Error('Invalid format: missing strokes array');
    }
    
    return {
      success: true,
      data: {
        strokes: data.strokes,
        roomId: data.roomId,
        metadata: data.metadata
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Download JSON file
 */
export function downloadJSON(data, filename) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Load JSON file
 */
export function loadJSONFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  });
}