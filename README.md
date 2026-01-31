# Real-Time Collaborative Whiteboard

A production-quality collaborative whiteboard application built to demonstrate real-time systems engineering, WebSocket communication, and distributed state synchronization.

## 🎯 Project Goals

This project serves as a comprehensive demonstration of:
- Real-time collaborative systems architecture
- WebSocket protocol implementation and optimization
- Conflict resolution in distributed systems
- State synchronization strategies
- Production-ready error handling and recovery

## 🛠 Tech Stack

### Frontend
- React 18 with Vite
- Socket.IO Client
- HTML5 Canvas API
- Markdown rendering

### Backend
- Node.js with Express
- Socket.IO for WebSocket management
- In-memory state with database persistence
- RESTful APIs for room management

## 📚 Learning Modules

This project is built incrementally through structured modules:

- [x] **Module 1: Real-Time Architecture & Data Flow** ✅
  - WebSocket vs HTTP polling
  - Server authority model
  - Event-driven architecture
  - Latency vs consistency tradeoffs

- [x] **Module 2: Session & Room Management** ✅
  - Connection lifecycle management
  - Room creation and isolation
  - User presence tracking
  - Automatic reconnection
  - Real-time client synchronization

- [ ] Module 3: Canvas Drawing Model
- [ ] Module 4: Real-Time Synchronization
- [ ] Module 5: Conflict Resolution
- [ ] Module 6: Markdown & Text Collaboration
- [ ] Module 7: Persistence & Recovery
- [ ] Module 8: Performance Optimization
- [ ] Module 9: Security & Abuse Prevention
- [ ] Module 10: Scaling & Production Readiness

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/collaborative-whiteboard.git
cd collaborative-whiteboard
```

**2. Setup Backend**
```bash
cd server
npm install
cp .env.example .env
npm run dev
```
Server runs on http://localhost:3001

**3. Setup Frontend (in new terminal)**
```bash
cd client
npm install
cp .env.example .env
npm run dev
```
Client runs on http://localhost:5173

### Testing Module 2

1. Open http://localhost:5173 in your browser
2. Wait for "🟢 Connected" status
3. Enter a room ID (e.g., "test-room") and your name
4. Click "Join Room"
5. Open another browser tab/window
6. Join the same room with a different name
7. Watch the client list update in real-time! ✨

## 📊 Module 2 Architecture

### Connection Lifecycle
```
Client                          Server
  |                               |
  |-- connect (WebSocket) ------->|
  |<-- connected (socketId) ------|
  |                               |
  |-- room.join ----------------->|
  |   {roomId, userId}            |
  |                               |-- Create/Get Room
  |                               |-- Add Client
  |                               |
  |<-- room.joined ---------------|
  |   {clients, boardState}       |
  |                               |
  |<-- user.joined (broadcast) ---|
  |   (to other clients)          |
  |                               |
```

### State Management
- **Server**: Single source of truth
- **Rooms**: In-memory Map for O(1) access
- **Clients**: Tracked per-room with metadata
- **Cleanup**: Automatic deletion of empty rooms

## 🏗️ Project Structure
```
collaborative-whiteboard/
├── server/
│   ├── src/
│   │   ├── index.js              # Server entry point
│   │   ├── socket/
│   │   │   └── roomHandlers.js   # WebSocket event handlers
│   │   ├── managers/
│   │   │   └── RoomManager.js    # Room lifecycle management
│   │   └── models/
│   │       └── Room.js            # Room data structure
│   └── package.json
│
└── client/
    ├── src/
    │   ├── App.jsx                # App entry point
    │   ├── components/
    │   │   └── RoomTest.jsx       # Connection test UI
    │   ├── hooks/
    │   │   └── useSocket.js       # React hooks for socket
    │   └── services/
    │       └── socket.js          # Socket.IO client wrapper
    └── package.json
```

## 📝 Key Features (Module 2)

### Backend
✅ WebSocket server with Socket.IO  
✅ Room-based client isolation  
✅ Automatic empty room cleanup  
✅ Connection lifecycle management  
✅ Comprehensive error handling  
✅ Health check and stats endpoints  

### Frontend
✅ Singleton SocketService  
✅ Automatic reconnection with backoff  
✅ React hooks for state management  
✅ Real-time presence updates  
✅ Loading and error states  
✅ Test UI for validation  

## 🔧 API Endpoints

### HTTP
- `GET /health` - Server health check
- `GET /api/stats` - Room and connection statistics

### WebSocket Events

**Client → Server:**
- `room.join` - Join a room
```javascript
  { roomId: string, userId: string }
```

**Server → Client:**
- `room.joined` - Successful join confirmation
```javascript
  { 
    success: true,
    roomId: string,
    userId: string,
    socketId: string,
    boardState: { strokes: [], textBlocks: [] },
    clients: [{ socketId, userId, joinedAt }],
    metadata: { id, clientCount, createdAt }
  }
```

- `user.joined` - Another user joined (broadcast)
```javascript
  {
    userId: string,
    socketId: string,
    joinedAt: number,
    clients: [...]
  }
```

- `user.left` - User disconnected (broadcast)
```javascript
  {
    userId: string,
    socketId: string,
    clients: [...],
    reason: string
  }
```

- `error` - Error response
```javascript
  {
    code: string,
    message: string
  }
```

## 📖 Technical Decisions

### Why Socket.IO over raw WebSockets?
- Automatic reconnection with exponential backoff
- Built-in room management
- Fallback to HTTP long-polling
- Better browser compatibility
- Production-ready abstractions

### Why server authority?
- Security: Validation on trusted server
- Consistency: Single source of truth
- Simplicity: Clients are stateless
- Scalability: Easier to add persistence

### Why in-memory state?
- Low latency for real-time operations
- Simple implementation for MVP
- Will add persistence in Module 7
- Acceptable tradeoff for learning project

## 🧪 Development

### Run Tests
```bash
# Manual testing for now
# Automated tests will be added in later modules
```

### Monitor Server
```bash
# Check server health
curl http://localhost:3001/health

# Check room statistics
curl http://localhost:3001/api/stats
```

## 📝 Git Workflow

This project uses conventional commits:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `chore`: Maintenance

Each module is developed incrementally with atomic commits.

## 🤝 Contributing

This is a learning project built for portfolio demonstration. 
Feel free to fork and experiment!

## 📜 License

MIT License - See LICENSE file for details

## 🎓 Learning Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [React Hooks](https://react.dev/reference/react)
- [WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [Real-Time Systems Design](https://martinfowler.com/articles/patterns-of-distributed-systems/)

---

**Current Status:** Module 2 Complete ✅  
**Next:** Module 3 - Canvas Drawing Model