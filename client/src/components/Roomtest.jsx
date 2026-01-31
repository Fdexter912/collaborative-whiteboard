// client/src/components/RoomTest.jsx
import { useState } from 'react';
import { useSocket, useRoom } from '../hooks/useSocket';

/**
 * RoomTest Component
 * 
 * Test interface for room connection functionality.
 * Demonstrates:
 * - Connection state visualization
 * - Room joining flow
 * - Real-time client list updates
 * - Error handling
 * 
 * This is a temporary component for testing Module 2.
 * Will be replaced with actual whiteboard UI in Module 3.
 */
export default function RoomTest() {
  // Form state
  const [roomId, setRoomId] = useState('test-room');
  const [userId, setUserId] = useState('');
  const [hasJoinedAttempt, setHasJoinedAttempt] = useState(false);
  
  // Socket state
  const { connected, socketId, error: connectionError } = useSocket();
  
  // Room state (only join if user has submitted form)
  const { 
    joined, 
    loading, 
    clients, 
    boardState,
    error: roomError 
  } = useRoom(
    hasJoinedAttempt ? roomId : null,
    hasJoinedAttempt ? userId : null
  );

  // Handle form submission
  const handleJoin = (e) => {
    e.preventDefault();
    
    if (!roomId.trim() || !userId.trim()) {
      alert('Please enter both Room ID and User ID');
      return;
    }
    
    setHasJoinedAttempt(true);
  };

  // Handle leaving room (refresh to rejoin)
  const handleLeave = () => {
    window.location.reload();
  };

  // Render connection status indicator
  const renderConnectionStatus = () => {
    if (connectionError) {
      return <span style={styles.statusBad}>🔴 Error: {connectionError}</span>;
    }
    
    if (connected) {
      return <span style={styles.statusGood}>🟢 Connected</span>;
    }
    
    return <span style={styles.statusWarning}>🟡 Connecting...</span>;
  };

  // Render room status indicator
  const renderRoomStatus = () => {
    if (roomError) {
      return <span style={styles.statusBad}>🔴 Error: {roomError}</span>;
    }
    
    if (loading) {
      return <span style={styles.statusWarning}>🟡 Joining room...</span>;
    }
    
    if (joined) {
      return <span style={styles.statusGood}>🟢 Joined</span>;
    }
    
    return <span style={styles.statusNeutral}>⚪ Not in room</span>;
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Collaborative Whiteboard - Connection Test</h1>
      
      {/* Connection Status Panel */}
      <div style={styles.statusPanel}>
        <h2 style={styles.sectionTitle}>Connection Status</h2>
        <div style={styles.statusGrid}>
          <div>
            <strong>WebSocket:</strong> {renderConnectionStatus()}
          </div>
          {socketId && (
            <div>
              <strong>Socket ID:</strong> <code style={styles.code}>{socketId}</code>
            </div>
          )}
          <div>
            <strong>Room:</strong> {renderRoomStatus()}
          </div>
          {joined && (
            <div>
              <strong>Room ID:</strong> <code style={styles.code}>{roomId}</code>
            </div>
          )}
        </div>
      </div>

      {/* Join Form */}
      {!hasJoinedAttempt && (
        <div style={styles.formPanel}>
          <h2 style={styles.sectionTitle}>Join a Room</h2>
          <form onSubmit={handleJoin} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Room ID:
                <input 
                  type="text" 
                  value={roomId} 
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="e.g., test-room"
                  style={styles.input}
                  disabled={!connected}
                />
              </label>
              <small style={styles.hint}>Use the same room ID to collaborate with others</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Your Name:
                <input 
                  type="text" 
                  value={userId} 
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g., Alice"
                  style={styles.input}
                  disabled={!connected}
                />
              </label>
              <small style={styles.hint}>This will be visible to other users</small>
            </div>
            
            <button 
              type="submit" 
              disabled={!connected || !roomId.trim() || !userId.trim()}
              style={{
                ...styles.button,
                ...((!connected || !roomId.trim() || !userId.trim()) && styles.buttonDisabled)
              }}
            >
              Join Room
            </button>
          </form>
        </div>
      )}

      {/* Room Info Panel */}
      {joined && (
        <div style={styles.roomPanel}>
          <h2 style={styles.sectionTitle}>
            Room: <code style={styles.code}>{roomId}</code>
          </h2>
          
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{clients.length}</div>
              <div style={styles.statLabel}>Users Online</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{boardState?.strokes?.length || 0}</div>
              <div style={styles.statLabel}>Strokes</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{boardState?.textBlocks?.length || 0}</div>
              <div style={styles.statLabel}>Text Blocks</div>
            </div>
          </div>

          <h3 style={styles.subsectionTitle}>Connected Users</h3>
          <ul style={styles.clientList}>
            {clients.map((client) => (
              <li key={client.socketId} style={styles.clientItem}>
                <span style={styles.clientName}>
                  {client.userId}
                  {client.socketId === socketId && (
                    <span style={styles.youBadge}>You</span>
                  )}
                </span>
                <code style={styles.clientId}>{client.socketId}</code>
              </li>
            ))}
          </ul>

          <button onClick={handleLeave} style={styles.leaveButton}>
            Leave Room
          </button>
        </div>
      )}

      {/* Error Display */}
      {(connectionError || roomError) && (
        <div style={styles.errorPanel}>
          <strong>⚠️ Error:</strong> {connectionError || roomError}
        </div>
      )}

      {/* Instructions */}
      <div style={styles.instructions}>
        <h3 style={styles.subsectionTitle}>Testing Instructions</h3>
        <ol style={styles.instructionList}>
          <li>Wait for WebSocket connection (🟢 Connected)</li>
          <li>Enter a room ID and your name</li>
          <li>Click "Join Room"</li>
          <li>Open this page in another tab/browser</li>
          <li>Join the same room with a different name</li>
          <li>Watch the client list update in real-time! ✨</li>
        </ol>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: '1.6',
  },
  title: {
    fontSize: '28px',
    marginBottom: '24px',
    color: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: '20px',
    marginBottom: '16px',
    color: '#2c3e50',
  },
  subsectionTitle: {
    fontSize: '16px',
    marginTop: '20px',
    marginBottom: '12px',
    color: '#34495e',
  },
  statusPanel: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  statusGood: {
    color: '#27ae60',
    fontWeight: '600',
  },
  statusWarning: {
    color: '#f39c12',
    fontWeight: '600',
  },
  statusBad: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  statusNeutral: {
    color: '#95a5a6',
    fontWeight: '600',
  },
  code: {
    backgroundColor: '#ecf0f1',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  formPanel: {
    padding: '20px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontWeight: '500',
    color: '#2c3e50',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    outline: 'none',
  },
  hint: {
    fontSize: '12px',
    color: '#7f8c8d',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#3498db',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
    cursor: 'not-allowed',
  },
  roomPanel: {
    padding: '20px',
    backgroundColor: '#fff',
    border: '2px solid #3498db',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  statCard: {
    padding: '16px',
    backgroundColor: '#ecf0f1',
    borderRadius: '6px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: '14px',
    color: '#7f8c8d',
    marginTop: '4px',
  },
  clientList: {
    listStyle: 'none',
    padding: '0',
    margin: '0',
  },
  clientItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  clientName: {
    fontWeight: '500',
    color: '#2c3e50',
  },
  youBadge: {
    marginLeft: '8px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#27ae60',
    borderRadius: '12px',
  },
  clientId: {
    fontSize: '12px',
    color: '#7f8c8d',
  },
  leaveButton: {
    marginTop: '16px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#e74c3c',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  errorPanel: {
    padding: '16px',
    backgroundColor: '#fee',
    border: '1px solid #fcc',
    borderRadius: '4px',
    color: '#c33',
    marginBottom: '20px',
  },
  instructions: {
    padding: '20px',
    backgroundColor: '#e8f4f8',
    borderRadius: '8px',
  },
  instructionList: {
    margin: '0',
    paddingLeft: '20px',
  },
};