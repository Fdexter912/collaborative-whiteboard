// server/src/models/Room.js

/**
 * Room Model
 * 
 * Represents a collaborative whiteboard session.
 * Manages client connections and board state.
 */
class Room {
  constructor(roomId) {
    this.id = roomId;
    
    // Client tracking
    this.clients = new Map();
    
    // Board state - UPDATED for Module 3
    this.boardState = {
      strokes: [],        // Array of Stroke objects
      textBlocks: []      // Will be used in Module 6
    };
    
    // Metadata
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    
    // Stats for monitoring
    this.stats = {
      totalStrokes: 0,
      totalPoints: 0
    };
  }

  /**
   * Add a client to this room
   */
  addClient(socketId, userId) {
    const clientInfo = {
      socketId,
      userId,
      joinedAt: Date.now()
    };
    
    this.clients.set(socketId, clientInfo);
    this.lastActivity = Date.now();
    
    return clientInfo;
  }

  /**
   * Remove a client from this room
   */
  removeClient(socketId) {
    const clientInfo = this.clients.get(socketId);
    this.clients.delete(socketId);
    this.lastActivity = Date.now();
    
    return clientInfo || null;
  }

  /**
   * Get client information by socket ID
   */
  getClient(socketId) {
    return this.clients.get(socketId) || null;
  }

  /**
   * Get all clients as an array
   */
  getClientList() {
    return Array.from(this.clients.values());
  }

  /**
   * Check if room has no clients
   */
  isEmpty() {
    return this.clients.size === 0;
  }

  /**
   * Get current client count
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Add a stroke to the board
   * NEW for Module 3
   */
  addStroke(stroke) {
    this.boardState.strokes.push(stroke);
    this.lastActivity = Date.now();
    
    // Update stats
    this.stats.totalStrokes++;
    this.stats.totalPoints += stroke.points.length;
    
    return stroke;
  }

  /**
   * Remove a stroke by ID
   * NEW for Module 3
   */
  removeStroke(strokeId) {
    const index = this.boardState.strokes.findIndex(s => s.id === strokeId);
    
    if (index !== -1) {
      const removed = this.boardState.strokes.splice(index, 1)[0];
      this.lastActivity = Date.now();
      
      // Update stats
      this.stats.totalStrokes--;
      this.stats.totalPoints -= removed.points.length;
      
      return removed;
    }
    
    return null;
  }

  /**
   * Get stroke by ID
   * NEW for Module 3
   */
  getStroke(strokeId) {
    return this.boardState.strokes.find(s => s.id === strokeId) || null;
  }

  /**
   * Clear all strokes
   * NEW for Module 3
   */
  clearStrokes() {
    const count = this.boardState.strokes.length;
    this.boardState.strokes = [];
    this.lastActivity = Date.now();
    
    // Reset stats
    this.stats.totalStrokes = 0;
    this.stats.totalPoints = 0;
    
    return count;
  }

  /**
   * Get room metadata for client synchronization
   */
  getMetadata() {
    return {
      id: this.id,
      clientCount: this.getClientCount(),
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      stats: this.stats
    };
  }

  /**
   * Update last activity timestamp
   */
  touch() {
    this.lastActivity = Date.now();
  }

  /**
   * Get room age in milliseconds
   */
  getAge() {
    return Date.now() - this.createdAt;
  }

  /**
   * Get time since last activity in milliseconds
   */
  getIdleTime() {
    return Date.now() - this.lastActivity;
  }

  /**
   * Get total data size (approximate)
   * NEW for Module 3
   */
  getDataSize() {
    let size = 0;
    this.boardState.strokes.forEach(stroke => {
      size += stroke.getSize ? stroke.getSize() : 0;
    });
    return size;
  }
}

module.exports = Room;