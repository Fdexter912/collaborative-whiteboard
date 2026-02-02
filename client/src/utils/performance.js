// client/src/utils/performance.js

/**
 * Performance Utilities
 * 
 * Optimize rendering and event handling for better performance.
 */

/**
 * RequestAnimationFrame wrapper
 * Ensures smooth rendering at 60fps
 */
export class RenderLoop {
  constructor(callback) {
    this.callback = callback;
    this.isRunning = false;
    this.frameId = null;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    const loop = () => {
      if (!this.isRunning) return;
      
      this.callback();
      this.frameId = requestAnimationFrame(loop);
    };
    
    this.frameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}

/**
 * Batched state updates
 * Collects multiple updates and applies them in one batch
 */
export class BatchUpdater {
  constructor(applyFn, delay = 16) { // ~60fps
    this.applyFn = applyFn;
    this.delay = delay;
    this.pending = [];
    this.timeoutId = null;
  }

  add(item) {
    this.pending.push(item);
    
    if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => {
        this.flush();
      }, this.delay);
    }
  }

  flush() {
    if (this.pending.length === 0) return;
    
    const items = [...this.pending];
    this.pending = [];
    this.timeoutId = null;
    
    this.applyFn(items);
  }

  clear() {
    this.pending = [];
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

/**
 * Performance monitor
 * Track FPS and render times
 */
export class PerformanceMonitor {
  constructor() {
    this.frames = [];
    this.lastTime = performance.now();
  }

  tick() {
    const now = performance.now();
    const delta = now - this.lastTime;
    
    this.frames.push(delta);
    
    // Keep last 60 frames
    if (this.frames.length > 60) {
      this.frames.shift();
    }
    
    this.lastTime = now;
  }

  getFPS() {
    if (this.frames.length === 0) return 0;
    
    const avgDelta = this.frames.reduce((a, b) => a + b) / this.frames.length;
    return Math.round(1000 / avgDelta);
  }

  getAvgFrameTime() {
    if (this.frames.length === 0) return 0;
    
    return this.frames.reduce((a, b) => a + b) / this.frames.length;
  }

  reset() {
    this.frames = [];
    this.lastTime = performance.now();
  }
}

/**
 * Spatial index for fast stroke lookups
 * Divides canvas into grid for O(1) average case lookups
 */
export class SpatialIndex {
  constructor(width, height, cellSize = 100) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    
    // Grid of cells, each containing stroke IDs
    this.grid = Array(this.rows).fill(null).map(() => 
      Array(this.cols).fill(null).map(() => new Set())
    );
    
    // Map of stroke ID to cells it occupies
    this.strokeCells = new Map();
  }

  /**
   * Add stroke to index
   */
  addStroke(stroke) {
    if (!stroke.id || !stroke.points || stroke.points.length === 0) return;
    
    const cells = new Set();
    
    // Add stroke to all cells it overlaps
    for (const [x, y] of stroke.points) {
      const col = Math.floor(x / this.cellSize);
      const row = Math.floor(y / this.cellSize);
      
      if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
        this.grid[row][col].add(stroke.id);
        cells.add(`${row},${col}`);
      }
    }
    
    this.strokeCells.set(stroke.id, cells);
  }

  /**
   * Remove stroke from index
   */
  removeStroke(strokeId) {
    const cells = this.strokeCells.get(strokeId);
    if (!cells) return;
    
    // Remove from all cells
    for (const cellKey of cells) {
      const [row, col] = cellKey.split(',').map(Number);
      this.grid[row][col].delete(strokeId);
    }
    
    this.strokeCells.delete(strokeId);
  }

  /**
   * Get strokes near a point
   */
  getStrokesNearPoint(x, y) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return new Set();
    }
    
    return new Set(this.grid[row][col]);
  }

  /**
   * Clear all strokes
   */
  clear() {
    this.grid = Array(this.rows).fill(null).map(() => 
      Array(this.cols).fill(null).map(() => new Set())
    );
    this.strokeCells.clear();
  }
}