// server/src/managers/RoomManager.js
const Room = require('../models/Room');

/**
 * RoomManager
 * 
 * Centralized management of all active rooms.
 * Handles room lifecycle, cleanup, and statistics.
 * 
 * Responsibilities:
 * - Create rooms on-demand (lazy initialization)
 * - Delete empty rooms (prevent memory leaks)
 * - Provide room access and statistics
 * - Future: Persistence integration point
 */
class RoomManager {
  constructor() {
    // Active rooms - Map for O(1) access
    this.rooms = new Map(); // roomId -> Room
    
    // Statistics
    this.stats = {
      totalRoomsCreated: 0,
      totalRoomsDeleted: 0,
      peakConcurrentRooms: 0
    };

    // Start cleanup interval (every 5 minutes)
    this.startCleanupInterval();
  }

  /**
   * Get existing room or create new one
   * Lazy initialization - rooms created only when needed
   * 
   * @param {string} roomId - Unique room identifier
   * @returns {Room} Room instance
   */
  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      const room = new Room(roomId);
      this.rooms.set(roomId, room);
      
      this.stats.totalRoomsCreated++;
      
      // Update peak concurrent rooms
      if (this.rooms.size > this.stats.peakConcurrentRooms) {
        this.stats.peakConcurrentRooms = this.rooms.size;
      }
      
      console.log(`📦 Created room: ${roomId} (Total active: ${this.rooms.size})`);
    }
    
    return this.rooms.get(roomId);
  }

  /**
   * Get room by ID (returns null if doesn't exist)
   * Used when room existence is uncertain
   * 
   * @param {string} roomId - Room identifier
   * @returns {Room|null}
   */
  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Delete room if it has no clients
   * Prevents memory leaks from abandoned rooms
   * 
   * @param {string} roomId - Room identifier
   * @returns {boolean} True if room was deleted
   */
  deleteRoomIfEmpty(roomId) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return false;
    }
    
    if (room.isEmpty()) {
      this.rooms.delete(roomId);
      this.stats.totalRoomsDeleted++;
      
      console.log(`🗑️  Deleted empty room: ${roomId} (Total active: ${this.rooms.size})`);
      return true;
    }
    
    return false;
  }

  /**
   * Force delete room regardless of clients
   * Use with caution - will disconnect all clients
   * 
   * @param {string} roomId - Room identifier
   * @returns {boolean} True if room existed and was deleted
   */
  forceDeleteRoom(roomId) {
    const existed = this.rooms.has(roomId);
    
    if (existed) {
      this.rooms.delete(roomId);
      this.stats.totalRoomsDeleted++;
      console.log(`⚠️  Force deleted room: ${roomId}`);
    }
    
    return existed;
  }

  /**
   * Get all active rooms
   * Use sparingly - creates array copy
   * 
   * @returns {Room[]} Array of all rooms
   */
  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  /**
   * Get comprehensive statistics
   * Used for monitoring and health checks
   */
  getStats() {
    let totalClients = 0;
    const roomDetails = [];

    this.rooms.forEach(room => {
      totalClients += room.getClientCount();
      roomDetails.push({
        id: room.id,
        clients: room.getClientCount(),
        age: room.getAge(),
        idleTime: room.getIdleTime()
      });
    });

    return {
      activeRooms: this.rooms.size,
      totalClients,
      totalRoomsCreated: this.stats.totalRoomsCreated,
      totalRoomsDeleted: this.stats.totalRoomsDeleted,
      peakConcurrentRooms: this.stats.peakConcurrentRooms,
      rooms: roomDetails
    };
  }

  /**
   * Cleanup idle rooms
   * Runs periodically to free memory from inactive sessions
   */
  cleanupIdleRooms(maxIdleTime = 30 * 60 * 1000) { // 30 minutes default
    let deletedCount = 0;

    this.rooms.forEach((room, roomId) => {
      if (room.isEmpty() || room.getIdleTime() > maxIdleTime) {
        this.rooms.delete(roomId);
        this.stats.totalRoomsDeleted++;
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} idle rooms`);
    }

    return deletedCount;
  }

  /**
   * Start periodic cleanup interval
   */
  startCleanupInterval() {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.cleanupIdleRooms();
    }, 5 * 60 * 1000);
  }

  /**
   * Get total number of clients across all rooms
   */
  getTotalClientCount() {
    let total = 0;
    this.rooms.forEach(room => {
      total += room.getClientCount();
    });
    return total;
  }
}

module.exports = RoomManager;