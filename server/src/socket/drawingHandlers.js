// server/src/socket/drawingHandlers.js
const Stroke = require("../models/Stroke");
const { RateLimiter } = require("../utils/validation");

// Rate limiter: Max 100 strokes per minute per user
const strokeRateLimiter = new RateLimiter(100, 60000);

// Clean up rate limiter every 5 minutes
setInterval(
  () => {
    strokeRateLimiter.cleanup();
  },
  5 * 60 * 1000,
);

/**
 * Handle new stroke creation
 *
 * Event: 'draw.stroke'
 * Payload: { points, color, width, tool }
 *
 * Flow:
 * 1. Validate stroke data
 * 2. Check rate limit
 * 3. Create stroke with server metadata
 * 4. Add to room state
 * 5. Broadcast to all clients in room
 * 6. Send acknowledgment to sender
 */
function handleDrawStroke(io, socket, roomManager) {
  return (strokeData) => {
    try {
      const { roomId, userId } = socket.data;

      // ===== VALIDATION =====

      if (!roomId || !userId) {
        socket.emit("error", {
          code: "NOT_IN_ROOM",
          message: "Must join a room before drawing",
        });
        return;
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit("error", {
          code: "ROOM_NOT_FOUND",
          message: "Room not found",
        });
        return;
      }

      if (!strokeRateLimiter.isAllowed(userId)) {
        socket.emit("error", {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many strokes. Please slow down.",
        });
        console.warn(`⚠️  Rate limit exceeded for ${userId} in room ${roomId}`);
        return;
      }

      const validation = Stroke.validate(strokeData);
      if (!validation.valid) {
        socket.emit("error", {
          code: "INVALID_STROKE",
          message: "Invalid stroke data",
          errors: validation.errors,
        });
        return;
      }

      const pointCount = strokeData.points.length;
      if (pointCount > 10000) {
        socket.emit("error", {
          code: "STROKE_TOO_LARGE",
          message: "Stroke has too many points (max 10,000)",
        });
        return;
      }

      // ===== CREATE STROKE =====

      const stroke = Stroke.create(strokeData, userId);
      room.addStroke(stroke);

      // ===== SEQUENCING - NEW =====

      const sequence = room.getNextSequence();
      const timestamp = Date.now();

      // Create event for broadcast
      const event = {
        type: "draw.stroke",
        seq: sequence,
        timestamp,
        data: stroke.toJSON(),
      };

      // Add to event log
      room.addEventToLog(event);

      // ===== BROADCAST =====

      io.to(roomId).emit("draw.stroke", event);

      console.log(
        `✏️  [seq:${sequence}] ${userId} drew stroke ${stroke.id} in room ${roomId} ` +
          `(${pointCount} points, ${room.stats.totalStrokes} total)`,
      );
    } catch (error) {
      console.error("Error in handleDrawStroke:", error);
      socket.emit("error", {
        code: "DRAW_FAILED",
        message: "Failed to process stroke",
      });
    }
  };
}

/**
 * Handle stroke deletion
 *
 * Event: 'draw.deleteStroke'
 * Payload: { strokeId }
 *
 * Note: In this version, any user can delete any stroke.
 * Module 9 will add proper authorization (only author can delete).
 */
function handleDeleteStroke(io, socket, roomManager) {
  return ({ strokeId }) => {
    try {
      const { roomId, userId } = socket.data;

      // Validation
      if (!roomId || !userId) {
        socket.emit("error", {
          code: "NOT_IN_ROOM",
          message: "Must join a room first",
        });
        return;
      }

      if (!strokeId || typeof strokeId !== "string") {
        socket.emit("error", {
          code: "INVALID_STROKE_ID",
          message: "Stroke ID must be a string",
        });
        return;
      }

      // Get room
      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit("error", {
          code: "ROOM_NOT_FOUND",
          message: "Room not found",
        });
        return;
      }

      // Remove stroke
      const removed = room.removeStroke(strokeId);

      if (!removed) {
        socket.emit("error", {
          code: "STROKE_NOT_FOUND",
          message: "Stroke not found",
        });
        return;
      }
      // ===== SEQUENCING - NEW =====

      const sequence = room.getNextSequence();
      const timestamp = Date.now();

      const event = {
        type: "draw.deleteStroke",
        seq: sequence,
        timestamp,
        data: { strokeId },
      };
      room.addEventToLog(event);
      // Broadcast deletion to all clients
      io.to(roomId).emit("draw.deleteStroke", event);

      console.log(
        `🗑️  [seq:${sequence}] ${userId} deleted stroke ${strokeId} in room ${roomId}`,
      );
    } catch (error) {
      console.error("Error in handleDeleteStroke:", error);
      socket.emit("error", {
        code: "DELETE_FAILED",
        message: "Failed to delete stroke",
      });
    }
  };
}

/**
 * Handle clear canvas request
 *
 * Event: 'draw.clear'
 * Payload: {}
 *
 * Removes all strokes from the board.
 * Module 9 will add authorization (only certain users can clear).
 */
function handleClearCanvas(io, socket, roomManager) {
  return () => {
    try {
      const { roomId, userId } = socket.data;

      // Validation
      if (!roomId || !userId) {
        socket.emit("error", {
          code: "NOT_IN_ROOM",
          message: "Must join a room first",
        });
        return;
      }

      // Get room
      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit("error", {
          code: "ROOM_NOT_FOUND",
          message: "Room not found",
        });
        return;
      }

      // Clear all strokes
      const count = room.clearStrokes();

      // ===== SEQUENCING - NEW =====
      const sequence = room.getNextSequence();
      const timestamp = Date.now();

      const event = {
        type: "draw.clear",
        seq: sequence,
        timestamp,
        data: { clearedBy: userId },
      };

      room.addEventToLog(event);

      // Broadcast clear to all clients
      io.to(roomId).emit("draw.clear", event);

      console.log(
        `🧹 [seq:${sequence}] ${userId} cleared canvas in room ${roomId} (${count} strokes removed)`,
      );
    } catch (error) {
      console.error("Error in handleClearCanvas:", error);
      socket.emit("error", {
        code: "CLEAR_FAILED",
        message: "Failed to clear canvas",
      });
    }
  };
}

/**
 * Handle request for missing events
 * NEW for Module 4
 */
function handleRequestEvents(io, socket, roomManager) {
  return ({ fromSeq, toSeq }) => {
    try {
      const { roomId, userId } = socket.data;

      if (!roomId) {
        socket.emit("error", {
          code: "NOT_IN_ROOM",
          message: "Must join a room first",
        });
        return;
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit("error", {
          code: "ROOM_NOT_FOUND",
          message: "Room not found",
        });
        return;
      }

      // Validate sequence numbers
      if (typeof fromSeq !== "number" || typeof toSeq !== "number") {
        socket.emit("error", {
          code: "INVALID_SEQUENCE",
          message: "Sequence numbers must be integers",
        });
        return;
      }

      if (fromSeq > toSeq) {
        socket.emit("error", {
          code: "INVALID_RANGE",
          message: "fromSeq must be <= toSeq",
        });
        return;
      }

      // Limit range to prevent abuse
      const maxRange = 100;
      if (toSeq - fromSeq > maxRange) {
        socket.emit("error", {
          code: "RANGE_TOO_LARGE",
          message: `Range too large. Max ${maxRange} events.`,
        });
        return;
      }

      // Get events
      const events = room.getEventsInRange(fromSeq, toSeq);

      // Send events
      socket.emit("sync.events", {
        fromSeq,
        toSeq,
        events,
        currentSeq: room.getCurrentSequence(),
      });

      console.log(
        `🔄 [sync] ${userId} requested events ${fromSeq}-${toSeq}, ` +
          `sent ${events.length} events`,
      );
    } catch (error) {
      console.error("Error in handleRequestEvents:", error);
      socket.emit("error", {
        code: "SYNC_FAILED",
        message: "Failed to retrieve events",
      });
    }
  };
}

/**
 * Handle sync request from client
 * NEW for Module 4 - Commit 3
 */
function handleSyncRequest(io, socket, roomManager) {
  return ({ lastSeq, _ackId }, callback) => {
    try {
      const { roomId, userId } = socket.data;

      if (!roomId) {
        const error = {
          error: "NOT_IN_ROOM",
          message: "Must join a room first",
        };
        if (callback) callback(error);
        return;
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        const error = { error: "ROOM_NOT_FOUND", message: "Room not found" };
        if (callback) callback(error);
        return;
      }

      const currentSeq = room.getCurrentSequence();

      // Client is up to date
      if (lastSeq >= currentSeq) {
        console.log(`✅ [sync] ${userId} is up to date (seq ${lastSeq})`);

        if (callback) {
          callback({
            success: true,
            currentSeq,
            events: [],
            upToDate: true,
          });
        }
        return;
      }

      // Get missing events
      const events = room.getEventsSince(lastSeq);

      console.log(
        `🔄 [sync] ${userId} requested sync from ${lastSeq}, ` +
          `sending ${events.length} events (current: ${currentSeq})`,
      );

      // Send response
      if (callback) {
        callback({
          success: true,
          currentSeq,
          events,
          upToDate: false,
          from: lastSeq + 1,
          to: currentSeq,
        });
      }

      // Update client's last seen sequence
      room.updateClientSequence(socket.id, currentSeq);
    } catch (error) {
      console.error("Error in handleSyncRequest:", error);
      if (callback) {
        callback({ error: "SYNC_FAILED", message: "Failed to sync" });
      }
    }
  };
}

module.exports = {
  handleDrawStroke,
  handleDeleteStroke,
  handleClearCanvas,
  handleRequestEvents,
  handleSyncRequest,
};
