// server/src/socket/roomHandlers.js

/**
 * Room Event Handlers
 * 
 * Handle WebSocket events for room lifecycle:
 * - room.join: Client requests to join a room
 * - disconnect: Client connection drops
 * 
 * Event Flow:
 * 1. Client sends event -> 2. Validate input ->
 * 3. Update server state -> 4. Broadcast to room ->
 * 5. Send acknowledgment
 */

/**
 * Handle room join request
 * 
 * Event: 'room.join'
 * Payload: { roomId: string, userId: string }
 * 
 * Success Response: 'room.joined' with full room state
 * Error Response: 'error' with message
 * Broadcast: 'user.joined' to other clients in room
 */
function handleRoomJoin(io, socket, roomManager) {
  return ({ roomId, userId }) => {
    try {
      // ===== INPUT VALIDATION =====
      // Never trust client input - validate everything
      
      if (!roomId || typeof roomId !== 'string') {
        socket.emit('error', { 
          code: 'INVALID_ROOM_ID',
          message: 'Room ID must be a non-empty string' 
        });
        return;
      }

      if (!userId || typeof userId !== 'string') {
        socket.emit('error', { 
          code: 'INVALID_USER_ID',
          message: 'User ID must be a non-empty string' 
        });
        return;
      }

      // Sanitize inputs
      roomId = roomId.trim();
      userId = userId.trim();

      // Validate length
      if (roomId.length === 0 || roomId.length > 100) {
        socket.emit('error', { 
          code: 'INVALID_ROOM_ID_LENGTH',
          message: 'Room ID must be 1-100 characters' 
        });
        return;
      }

      if (userId.length === 0 || userId.length > 50) {
        socket.emit('error', { 
          code: 'INVALID_USER_ID_LENGTH',
          message: 'User ID must be 1-50 characters' 
        });
        return;
      }

      // ===== STATE MANAGEMENT =====
      
      // Get or create room
      const room = roomManager.getOrCreateRoom(roomId);

      // Add client to room
      const clientInfo = room.addClient(socket.id, userId);

      // Join Socket.IO room for broadcasting
      // This enables: io.to(roomId).emit(...)
      socket.join(roomId);

      // Store room context in socket for disconnect handling
      socket.data.roomId = roomId;
      socket.data.userId = userId;

      // ===== RESPONSE & BROADCAST =====

      // Send full state to joining client
      socket.emit('room.joined', {
        success: true,
        roomId,
        userId,
        socketId: socket.id,
        boardState: room.boardState,
        clients: room.getClientList(),
        metadata: room.getMetadata(),
        sequebce: room.getCurrentSequence()
      });

      // Notify other clients in the room
      socket.to(roomId).emit('user.joined', {
        userId,
        socketId: socket.id,
        joinedAt: clientInfo.joinedAt,
        clients: room.getClientList() // Updated list including new user
      });

      console.log(
        `👤 ${userId} (${socket.id}) joined room ${roomId} ` +
        `(${room.getClientCount()} clients)`
      );

    } catch (error) {
      console.error('Error in handleRoomJoin:', error);
      socket.emit('error', { 
        code: 'JOIN_FAILED',
        message: 'Failed to join room. Please try again.' 
      });
    }
  };
}

/**
 * Handle client disconnect
 * 
 * Event: 'disconnect'
 * Reason: string (io server disconnect, transport close, etc.)
 * 
 * Broadcast: 'user.left' to remaining clients in room
 * 
 * Disconnect reasons:
 * - 'transport close': Network issue
 * - 'client namespace disconnect': Client called disconnect()
 * - 'server namespace disconnect': Server kicked client
 * - 'ping timeout': Client didn't respond to ping
 */
function handleDisconnect(io, socket, roomManager) {
  return (reason) => {
    try {
      const { roomId, userId } = socket.data;

      // Client wasn't in a room
      if (!roomId) {
        console.log(`🔌 ${socket.id} disconnected (not in any room) - Reason: ${reason}`);
        return;
      }

      const room = roomManager.getRoom(roomId);
      
      // Room already deleted (race condition)
      if (!room) {
        console.log(`⚠️  Room ${roomId} not found during disconnect`);
        return;
      }

      // Remove client from room
      const clientInfo = room.removeClient(socket.id);

      // Notify remaining clients
      io.to(roomId).emit('user.left', {
        userId: clientInfo?.userId || userId,
        socketId: socket.id,
        clients: room.getClientList(), // Updated list without disconnected user
        reason
      });

      console.log(
        `👋 ${userId} (${socket.id}) left room ${roomId} ` +
        `(${room.getClientCount()} clients remaining) - Reason: ${reason}`
      );

      // Cleanup empty room
      roomManager.deleteRoomIfEmpty(roomId);

    } catch (error) {
      console.error('Error in handleDisconnect:', error);
    }
  };
}

module.exports = {
  handleRoomJoin,
  handleDisconnect
};