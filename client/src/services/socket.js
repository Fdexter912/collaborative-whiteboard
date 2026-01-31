// client/src/services/socket.js
import { io } from 'socket.io-client';

/**
 * SocketService
 * 
 * Singleton service for managing WebSocket connection.
 * Handles connection lifecycle, event routing, and error recovery.
 * 
 * Design Patterns:
 * - Singleton: One connection per application
 * - Observer: Event listeners with pub/sub
 * - Promise-based: Async operations return promises
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Event listener management with cleanup
 * - Connection state tracking
 * - Error handling and logging
 */
class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomId = null;
    this.userId = null;
    
    // Event listeners - Map<eventName, Set<callback>>
    // Using Set prevents duplicate listeners
    this.listeners = new Map();
  }

  /**
   * Initialize and connect to server
   * 
   * @param {string} serverUrl - WebSocket server URL
   * @returns {void}
   */
  connect(serverUrl) {
    if (this.socket) {
      console.warn('⚠️  Socket already exists. Use disconnect() first.');
      return;
    }

    const url = serverUrl || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    
    console.log('🔌 Connecting to:', url);

    this.socket = io(url, {
      // Connection options
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,      // Start with 1s delay
      reconnectionDelayMax: 5000,   // Max 5s delay
      reconnectionAttempts: 5,      // Try 5 times before giving up
      timeout: 10000,                // 10s connection timeout
      
      // Transport options
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
    });

    this.setupDefaultListeners();
  }

  /**
   * Setup core event listeners
   * These handle connection lifecycle and errors
   */
  setupDefaultListeners() {
    // ===== CONNECTION EVENTS =====
    
    this.socket.on('connect', () => {
      this.connected = true;
      console.log('✅ Connected to server:', this.socket.id);
      
      // Emit custom event for UI components
      this.emitToListeners('connection.status', { 
        connected: true, 
        socketId: this.socket.id 
      });
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('❌ Disconnected from server:', reason);
      
      // Emit custom event
      this.emitToListeners('connection.status', { 
        connected: false, 
        reason 
      });

      // Log reconnection attempts
      if (reason === 'io server disconnect') {
        // Server kicked us - don't auto-reconnect
        console.log('⚠️  Server disconnected the client');
      } else {
        // Network issue - will auto-reconnect
        console.log('🔄 Attempting to reconnect...');
      }
    });

    // ===== ERROR EVENTS =====
    
    this.socket.on('connect_error', (error) => {
      console.error('🔴 Connection error:', error.message);
      this.emitToListeners('connection.error', { error });
    });

    this.socket.on('error', (error) => {
      console.error('🔴 Socket error:', error);
      this.emitToListeners('socket.error', { error });
    });

    // ===== RECONNECTION EVENTS =====
    
    this.socket.io.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
    });

    this.socket.io.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      
      // If we were in a room, rejoin
      if (this.roomId && this.userId) {
        console.log('🔄 Rejoining room after reconnect...');
        this.joinRoom(this.roomId, this.userId).catch(err => {
          console.error('Failed to rejoin room:', err);
        });
      }
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('🔴 Reconnection failed - giving up');
      this.emitToListeners('connection.failed', {});
    });
  }

  /**
   * Join a room
   * 
   * @param {string} roomId - Room identifier
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Room data
   */
  joinRoom(roomId, userId) {
    if (!this.socket || !this.connected) {
      return Promise.reject(new Error('Socket not connected'));
    }

    this.roomId = roomId;
    this.userId = userId;

    console.log(`🚪 Joining room: ${roomId} as ${userId}`);

    // Send join request
    this.socket.emit('room.join', { roomId, userId });

    // Return promise that resolves on success
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout - no response from server'));
      }, 5000);

      // Success handler
      const onJoined = (data) => {
        clearTimeout(timeout);
        this.socket.off('room.joined', onJoined);
        this.socket.off('error', onError);
        
        console.log('✅ Joined room successfully:', data);
        resolve(data);
      };

      // Error handler
      const onError = (error) => {
        clearTimeout(timeout);
        this.socket.off('room.joined', onJoined);
        this.socket.off('error', onError);
        
        console.error('❌ Failed to join room:', error);
        reject(error);
      };

      this.socket.once('room.joined', onJoined);
      this.socket.once('error', onError);
    });
  }

  /**
   * Register event listener
   * 
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!callback || typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    // Initialize listener set for this event
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
      
      // Register with socket (only once per event type)
      if (this.socket) {
        this.socket.on(event, (...args) => {
          this.emitToListeners(event, ...args);
        });
      }
    }

    // Add callback to set
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   * 
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    
    if (!callbacks) return;

    callbacks.delete(callback);

    // If no more listeners, remove from socket
    if (callbacks.size === 0) {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  /**
   * Emit event to all registered listeners
   * Internal method - not for external use
   * 
   * @param {string} event - Event name
   * @param  {...any} args - Event arguments
   */
  emitToListeners(event, ...args) {
    const callbacks = this.listeners.get(event);
    
    if (!callbacks) return;

    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in listener for ${event}:`, error);
      }
    });
  }

  /**
   * Send event to server
   * 
   * @param {string} event - Event name
   * @param {Object} data - Event payload
   * @returns {boolean} Success status
   */
  send(event, data) {
    if (!this.socket || !this.connected) {
      console.warn('⚠️  Cannot send - socket not connected');
      return false;
    }

    this.socket.emit(event, data);
    return true;
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from server');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.roomId = null;
      this.userId = null;
      this.listeners.clear();
    }
  }

  /**
   * Get connection state
   * 
   * @returns {boolean}
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  /**
   * Get current socket ID
   * 
   * @returns {string|null}
   */
  getSocketId() {
    return this.socket?.id || null;
  }

  /**
   * Get current room info
   * 
   * @returns {Object|null}
   */
  getRoomInfo() {
    if (!this.roomId || !this.userId) return null;
    
    return {
      roomId: this.roomId,
      userId: this.userId
    };
  }
}

// Export singleton instance
export default new SocketService();