// client/src/services/socket.js
import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomId = null;
    this.userId = null;
    this.listeners = new Map();

    // Track sent events awaiting acknowledgment - NEW
    this.pendingAcks = new Map(); // eventId -> { timeout, callback }
    this.ackTimeout = 5000; // 5 seconds
  }

  /**
   * Connect to server
   */
  connect(serverUrl) {
    if (this.socket) {
      console.warn("⚠️  Socket already exists. Use disconnect() first.");
      return;
    }

    const url =
      serverUrl || import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

    console.log("🔌 Connecting to:", url);

    this.socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ["websocket", "polling"],
    });

    this.setupDefaultListeners();
  }

  setupDefaultListeners() {
    this.socket.on("connect", () => {
      this.connected = true;
      console.log("✅ Connected to server:", this.socket.id);

      this.emitToListeners("connection.status", {
        connected: true,
        socketId: this.socket.id,
      });
    });

    this.socket.on("disconnect", (reason) => {
      this.connected = false;
      console.log("❌ Disconnected from server:", reason);

      this.emitToListeners("connection.status", {
        connected: false,
        reason,
      });

      if (reason === "io server disconnect") {
        console.log("⚠️  Server disconnected the client");
      } else {
        console.log("🔄 Attempting to reconnect...");
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("🔴 Connection error:", error.message);
      this.emitToListeners("connection.error", { error });
    });

    this.socket.on("error", (error) => {
      console.error("🔴 Socket error:", error);
      this.emitToListeners("socket.error", { error });
    });

    this.socket.io.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
    });

    this.socket.io.on("reconnect", (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);

      if (this.roomId && this.userId) {
        console.log("🔄 Rejoining room after reconnect...");
        this.joinRoom(this.roomId, this.userId).catch((err) => {
          console.error("Failed to rejoin room:", err);
        });
      }
    });

    this.socket.io.on("reconnect_failed", () => {
      console.error("🔴 Reconnection failed - giving up");
      this.emitToListeners("connection.failed", {});
    });
  }

  joinRoom(roomId, userId) {
    if (!this.socket || !this.connected) {
      console.error("❌ Cannot join room - socket not connected");
      return Promise.reject(new Error("Socket not connected"));
    }

    this.roomId = roomId;
    this.userId = userId;

    console.log(`🚪 Sending room.join event:`, { roomId, userId });

    this.socket.emit("room.join", { roomId, userId });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error("⏱️ Join room timeout - no response from server");
        reject(new Error("Join room timeout - no response from server"));
      }, 5000);

      const onJoined = (data) => {
        console.log("📨 Received room.joined event:", data);
        clearTimeout(timeout);
        this.socket.off("room.joined", onJoined);
        this.socket.off("error", onError);

        resolve(data);
      };

      const onError = (error) => {
        console.error("📨 Received error event:", error);
        clearTimeout(timeout);
        this.socket.off("room.joined", onJoined);
        this.socket.off("error", onError);

        reject(error);
      };

      this.socket.once("room.joined", onJoined);
      this.socket.once("error", onError);
    });
  }

  on(event, callback) {
    if (!callback || typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());

      if (this.socket) {
        this.socket.on(event, (...args) => {
          this.emitToListeners(event, ...args);
        });
      }
    }

    this.listeners.get(event).add(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);

    if (!callbacks) return;

    callbacks.delete(callback);

    if (callbacks.size === 0) {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  emitToListeners(event, ...args) {
    const callbacks = this.listeners.get(event);

    if (!callbacks) return;

    callbacks.forEach((callback) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in listener for ${event}:`, error);
      }
    });
  }

  /**
   * Send event to server
   * Returns promise that resolves when acknowledged (if ack requested)
   */
  send(event, data, options = {}) {
    if (!this.socket || !this.connected) {
      console.warn("⚠️  Cannot send - socket not connected");
      return false;
    }

    this.socket.emit(event, data);
    return true;
  }

  /**
   * Send event with acknowledgment tracking
   * NEW for Module 4
   */
  sendWithAck(event, data, timeout = this.ackTimeout) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      const eventId = `${event}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const timeoutId = setTimeout(() => {
        this.pendingAcks.delete(eventId);
        reject(new Error(`Acknowledgment timeout for ${event}`));
      }, timeout);

      this.pendingAcks.set(eventId, {
        timeout: timeoutId,
        resolve,
        reject,
      });

      // Emit with callback
      this.socket.emit(event, { ...data, _ackId: eventId }, (response) => {
        const pending = this.pendingAcks.get(eventId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingAcks.delete(eventId);

          if (response?.error) {
            pending.reject(new Error(response.error));
          } else {
            pending.resolve(response);
          }
        }
      });
    });
  }

  /**
   * Request sync from server
   * NEW for Module 4
   */
  requestSync(lastSeq) {
    console.log(`🔄 Requesting sync from sequence ${lastSeq}`);

    return this.sendWithAck("sync.request", { lastSeq })
      .then((response) => {
        console.log(`✅ Sync response received:`, response);
        return response;
      })
      .catch((error) => {
        console.error("❌ Sync request failed:", error);
        throw error;
      });
  }

  disconnect() {
    if (this.socket) {
      console.log("🔌 Disconnecting from server");

      // Clear pending acknowledgments
      this.pendingAcks.forEach(({ timeout }) => clearTimeout(timeout));
      this.pendingAcks.clear();

      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.roomId = null;
      this.userId = null;
      this.listeners.clear();
    }
  }

  isConnected() {
    return this.connected && this.socket?.connected;
  }

  getSocketId() {
    return this.socket?.id || null;
  }

  getRoomInfo() {
    if (!this.roomId || !this.userId) return null;

    return {
      roomId: this.roomId,
      userId: this.userId,
    };
  }
}

export default new SocketService();
