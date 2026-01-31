// server/src/index.js
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const RoomManager = require('./managers/RoomManager');
const { handleRoomJoin, handleDisconnect } = require('./socket/RoomHandlers');

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Socket.IO configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize managers
const roomManager = new RoomManager();

// API Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: io.engine.clientsCount
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    ...roomManager.getStats(),
    connections: io.engine.clientsCount,
    uptime: process.uptime()
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Register event handlers (factory pattern)
  socket.on('room.join', handleRoomJoin(io, socket, roomManager));
  socket.on('disconnect', handleDisconnect(io, socket, roomManager));
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log('=================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV}`);
  console.log(`✅ Client URL: ${process.env.CLIENT_URL}`);
  console.log('=================================');
});