// server/src/socket/drawingHandlers.js
const Stroke = require('../models/Stroke');
const { RateLimiter } = require('../utils/validation');

// Rate limiter: Max 100 strokes per minute per user
const strokeRateLimiter = new RateLimiter(100, 60000);

// Clean up rate limiter every 5 minutes
setInterval(() => {
  strokeRateLimiter.cleanup();
}, 5 * 60 * 1000);

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

      // Check if user is in a room
      if (!roomId || !userId) {
        socket.emit('error', {
          code: 'NOT_IN_ROOM',
          message: 'Must join a room before drawing'
        });
        return;
      }

      // Get room
      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit('error', {
          code: 'ROOM_NOT_FOUND',
          message: 'Room not found'
        });
        return;
      }

      // Rate limiting
      if (!strokeRateLimiter.isAllowed(userId)) {
        socket.emit('error', {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many strokes. Please slow down.'
        });
        console.warn(`⚠️  Rate limit exceeded for ${userId} in room ${roomId}`);
        return;
      }

      // Validate stroke data
      const validation = Stroke.validate(strokeData);
      if (!validation.valid) {
        socket.emit('error', {
          code: 'INVALID_STROKE',
          message: 'Invalid stroke data',
          errors: validation.errors
        });
        return;
      }

      // Additional validation: Check data size
      const pointCount = strokeData.points.length;
      if (pointCount > 10000) {
        socket.emit('error', {
          code: 'STROKE_TOO_LARGE',
          message: 'Stroke has too many points (max 10,000)'
        });
        return;
      }

      // ===== CREATE STROKE =====

      // Create stroke with server metadata
      const stroke = Stroke.create(strokeData, userId);

      // Add to room
      room.addStroke(stroke);

      // ===== BROADCAST =====

      // Broadcast to all clients in room (including sender)
      io.to(roomId).emit('draw.stroke', stroke.toJSON());

      // Log for monitoring
      console.log(
        `✏️  ${userId} drew stroke ${stroke.id} in room ${roomId} ` +
        `(${pointCount} points, ${room.stats.totalStrokes} total strokes)`
      );

    } catch (error) {
      console.error('Error in handleDrawStroke:', error);
      socket.emit('error', {
        code: 'DRAW_FAILED',
        message: 'Failed to process stroke'
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
        socket.emit('error', {
          code: 'NOT_IN_ROOM',
          message: 'Must join a room first'
        });
        return;
      }

      if (!strokeId || typeof strokeId !== 'string') {
        socket.emit('error', {
          code: 'INVALID_STROKE_ID',
          message: 'Stroke ID must be a string'
        });
        return;
      }

      // Get room
      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit('error', {
          code: 'ROOM_NOT_FOUND',
          message: 'Room not found'
        });
        return;
      }

      // Remove stroke
      const removed = room.removeStroke(strokeId);

      if (!removed) {
        socket.emit('error', {
          code: 'STROKE_NOT_FOUND',
          message: 'Stroke not found'
        });
        return;
      }

      // Broadcast deletion to all clients
      io.to(roomId).emit('draw.deleteStroke', { strokeId });

      console.log(`🗑️  ${userId} deleted stroke ${strokeId} in room ${roomId}`);

    } catch (error) {
      console.error('Error in handleDeleteStroke:', error);
      socket.emit('error', {
        code: 'DELETE_FAILED',
        message: 'Failed to delete stroke'
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
        socket.emit('error', {
          code: 'NOT_IN_ROOM',
          message: 'Must join a room first'
        });
        return;
      }

      // Get room
      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit('error', {
          code: 'ROOM_NOT_FOUND',
          message: 'Room not found'
        });
        return;
      }

      // Clear all strokes
      const count = room.clearStrokes();

      // Broadcast clear to all clients
      io.to(roomId).emit('draw.clear', { clearedBy: userId });

      console.log(`🧹 ${userId} cleared canvas in room ${roomId} (${count} strokes removed)`);

    } catch (error) {
      console.error('Error in handleClearCanvas:', error);
      socket.emit('error', {
        code: 'CLEAR_FAILED',
        message: 'Failed to clear canvas'
      });
    }
  };
}

module.exports = {
  handleDrawStroke,
  handleDeleteStroke,
  handleClearCanvas
};