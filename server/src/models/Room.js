// server/src/models/Room.js

/**
 * Room Model
 * 
 * Represents a collaborative whiteboard session.
 * Manages client connections and board state.
 * 
 * State ownership: Server is the source of truth.
 * Clients propose changes, server validates and broadcasts.
 */
class Room {
  constructor(roomId) {
    this.id = roomId;
    
    // Client tracking - Map for O(1) lookups
    this.clients = new Map(); // socketId -> ClientInfo
    
    // Board state - Will be extended in Module 3
    this.boardState = {
      strokes: [],      // Drawing strokes
      textBlocks: []    // Markdown text blocks
    };
    
    // Metadata
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
  }

  /**
   * Add a client to this room
   * 
   * @param {string} socketId - Socket.IO connection ID
   * @param {string} userId - User identifier (username/email)
   * @returns {Object} Client information object
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
   * 
   * @param {string} socketId - Socket.IO connection ID
   * @returns {Object|null} Removed client info or null
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
   * Useful for broadcasting presence updates
   */
  getClientList() {
    return Array.from(this.clients.values());
  }

  /**
   * Check if room has no clients
   * Used for automatic cleanup
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
   * Get room metadata for client synchronization
   * Sent to clients on join
   */
  getMetadata() {
    return {
      id: this.id,
      clientCount: this.getClientCount(),
      createdAt: this.createdAt,
      lastActivity: this.lastActivity
    };
  }

  /**
   * Update last activity timestamp
   * Called on any room interaction
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
}

module.exports = Room;