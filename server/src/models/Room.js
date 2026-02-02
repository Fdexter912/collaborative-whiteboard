// server/src/models/Room.js

/**
 * Room Model
 * 
 * Represents a collaborative whiteboard session.
 * Manages client connections, board state, and event sequencing.
 */
class Room {
  constructor(roomId) {
    this.id = roomId;
    
    // Client tracking
    this.clients = new Map();
    
    // Board state
    this.boardState = {
      strokes: [],
      textBlocks: []
    };
    
    // Event sequencing - NEW for Module 4
    this.sequence = 0; // Current sequence number
    this.eventLog = []; // Event history for replay/recovery
    this.maxEventLog = 1000; // Keep last 1000 events
    
    // Metadata
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    
    // Stats
    this.stats = {
      totalStrokes: 0,
      totalPoints: 0,
      totalEvents: 0 // NEW
    };
  }

  /**
   * Get next sequence number
   * NEW for Module 4
   */
  getNextSequence() {
    return ++this.sequence;
  }

  /**
   * Get current sequence number
   * NEW for Module 4
   */
  getCurrentSequence() {
    return this.sequence;
  }

  /**
   * Add event to log
   * NEW for Module 4
   */
  addEventToLog(event) {
    this.eventLog.push(event);
    this.stats.totalEvents++;
    
    // Trim log if too large
    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog.shift();
    }
    
    return event;
  }

  /**
   * Get events in range
   * NEW for Module 4
   */
  getEventsInRange(fromSeq, toSeq) {
    return this.eventLog.filter(event => 
      event.seq >= fromSeq && event.seq <= toSeq
    );
  }

  /**
   * Get events since sequence
   * NEW for Module 4
   */
  getEventsSince(sequence) {
    return this.eventLog.filter(event => event.seq > sequence);
  }

  // ===== Existing Methods (updated) =====

  addClient(socketId, userId) {
    const clientInfo = {
      socketId,
      userId,
      joinedAt: Date.now(),
      lastSeq: this.sequence // Track last sequence client has seen
    };
    
    this.clients.set(socketId, clientInfo);
    this.lastActivity = Date.now();
    
    return clientInfo;
  }

  removeClient(socketId) {
    const clientInfo = this.clients.get(socketId);
    this.clients.delete(socketId);
    this.lastActivity = Date.now();
    
    return clientInfo || null;
  }

  getClient(socketId) {
    return this.clients.get(socketId) || null;
  }

  /**
   * Update client's last seen sequence
   * NEW for Module 4
   */
  updateClientSequence(socketId, sequence) {
    const client = this.clients.get(socketId);
    if (client) {
      client.lastSeq = sequence;
    }
  }

  getClientList() {
    return Array.from(this.clients.values());
  }

  isEmpty() {
    return this.clients.size === 0;
  }

  getClientCount() {
    return this.clients.size;
  }

  /**
   * Add a stroke to the board
   * Now returns sequence number
   */
  addStroke(stroke) {
    this.boardState.strokes.push(stroke);
    this.lastActivity = Date.now();
    
    this.stats.totalStrokes++;
    this.stats.totalPoints += stroke.points.length;
    
    return stroke;
  }

  removeStroke(strokeId) {
    const index = this.boardState.strokes.findIndex(s => s.id === strokeId);
    
    if (index !== -1) {
      const removed = this.boardState.strokes.splice(index, 1)[0];
      this.lastActivity = Date.now();
      
      this.stats.totalStrokes--;
      this.stats.totalPoints -= removed.points.length;
      
      return removed;
    }
    
    return null;
  }

  getStroke(strokeId) {
    return this.boardState.strokes.find(s => s.id === strokeId) || null;
  }

  clearStrokes() {
    const count = this.boardState.strokes.length;
    this.boardState.strokes = [];
    this.lastActivity = Date.now();
    
    this.stats.totalStrokes = 0;
    this.stats.totalPoints = 0;
    
    return count;
  }

  getMetadata() {
    return {
      id: this.id,
      clientCount: this.getClientCount(),
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      sequence: this.sequence, // NEW
      stats: this.stats
    };
  }

  touch() {
    this.lastActivity = Date.now();
  }

  getAge() {
    return Date.now() - this.createdAt;
  }

  getIdleTime() {
    return Date.now() - this.lastActivity;
  }

  getDataSize() {
    let size = 0;
    this.boardState.strokes.forEach(stroke => {
      size += stroke.getSize ? stroke.getSize() : 0;
    });
    return size;
  }
}

module.exports = Room;