// client/src/components/WhiteboardApp.jsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { useRoom, useSocketEvent } from '../hooks/useSocket';
import socketService from '../services/socket';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import { downloadCanvasAsPNG } from '../utils/canvas';

/**
 * WhiteboardApp Component
 * 
 * Main whiteboard application that combines:
 * - Canvas for drawing
 * - Toolbar for controls
 * - Socket integration for real-time sync
 */
export default function WhiteboardApp({ roomId, userId }) {
  // Room state
  const { joined, loading, clients, boardState, error } = useRoom(roomId, userId);
  
  // Drawing state
  const [strokes, setStrokes] = useState([]);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentWidth, setCurrentWidth] = useState(2);
  
  // Canvas ref for download
  const canvasRef = useRef(null);

  /**
   * Initialize strokes from board state - FIXED
   */
  useEffect(() => {
    if (boardState?.strokes) {
      console.log('📋 Initializing strokes:', boardState.strokes.length);
      setStrokes(boardState.strokes);
    }
  }, [boardState]);

  /**
   * Listen for new strokes from server
   */
  useSocketEvent('draw.stroke', (stroke) => {
    console.log('📥 Received stroke:', stroke.id);
    setStrokes(prev => [...prev, stroke]);
  });

  /**
   * Listen for stroke deletions
   */
  useSocketEvent('draw.deleteStroke', ({ strokeId }) => {
    console.log('🗑️ Stroke deleted:', strokeId);
    setStrokes(prev => prev.filter(s => s.id !== strokeId));
  });

  /**
   * Listen for canvas clear
   */
  useSocketEvent('draw.clear', ({ clearedBy }) => {
    console.log('🧹 Canvas cleared by:', clearedBy);
    setStrokes([]);
  });

  /**
   * Handle stroke completion
   */
  const handleStrokeComplete = useCallback((stroke) => {
    console.log('✏️ Stroke completed, sending to server...');
    
    // Optimistic update - add locally immediately
    const optimisticStroke = {
      ...stroke,
      id: `temp_${Date.now()}`, // Temporary ID
      author: userId,
      timestamp: Date.now()
    };
    
    setStrokes(prev => [...prev, optimisticStroke]);
    
    // Send to server
    const sent = socketService.send('draw.stroke', stroke);
    
    if (!sent) {
      console.error('❌ Failed to send stroke - not connected');
      // Remove optimistic stroke
      setStrokes(prev => prev.filter(s => s.id !== optimisticStroke.id));
    }
  }, [userId]);

  /**
   * Handle clear canvas
   */
  const handleClear = useCallback(() => {
    if (!window.confirm('Clear entire canvas? This cannot be undone.')) {
      return;
    }
    
    // Optimistic update
    setStrokes([]);
    
    // Send to server
    socketService.send('draw.clear', {});
  }, []);

  /**
   * Handle download canvas
   */
  const handleDownload = useCallback(() => {
    // We need to get the actual canvas element from the Canvas component
    // For now, create a temporary canvas from current strokes
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 600);
    
    // Import renderAllStrokes
    import('../utils/canvas').then(({ renderAllStrokes }) => {
      renderAllStrokes(ctx, strokes, 800, 600);
      
      const filename = `whiteboard_${roomId}_${Date.now()}.png`;
      downloadCanvasAsPNG(canvas, filename);
    });
  }, [roomId, strokes]);

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>Joining room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>❌ Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Not joined state
  if (!joined) {
    return (
      <div style={styles.container}>
        <div style={styles.info}>
          <p>Waiting to join room...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Collaborative Whiteboard</h1>
        <div style={styles.roomInfo}>
          <span style={styles.roomId}>Room: {roomId}</span>
          <span style={styles.clientCount}>
            👥 {clients.length} user{clients.length !== 1 ? 's' : ''} online
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Toolbar */}
        <div style={styles.sidebar}>
          <Toolbar
            currentTool={currentTool}
            onToolChange={setCurrentTool}
            currentColor={currentColor}
            onColorChange={setCurrentColor}
            currentWidth={currentWidth}
            onWidthChange={setCurrentWidth}
            onClear={handleClear}
            onDownload={handleDownload}
          />
          
          {/* Online Users */}
          <div style={styles.usersPanel}>
            <h3 style={styles.usersTitle}>Online Users</h3>
            <ul style={styles.usersList}>
              {clients.map(client => (
                <li key={client.socketId} style={styles.userItem}>
                  <span style={styles.userName}>
                    {client.userId}
                    {client.userId === userId && (
                      <span style={styles.youBadge}>You</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Canvas */}
        <div style={styles.canvasContainer}>
          <Canvas
            strokes={strokes}
            onStrokeComplete={handleStrokeComplete}
            currentTool={currentTool}
            currentColor={currentColor}
            currentWidth={currentWidth}
            width={800}
            height={600}
          />
          
          {/* Canvas Info */}
          <div style={styles.canvasInfo}>
            <span>{strokes.length} stroke{strokes.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles remain the same...
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ecf0f1',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: '8px',
  },
  roomInfo: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    color: '#7f8c8d',
  },
  roomId: {
    fontWeight: '600',
  },
  clientCount: {
    fontWeight: '500',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '20px',
    alignItems: 'start',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  usersPanel: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  usersTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '12px',
  },
  usersList: {
    listStyle: 'none',
    padding: '0',
    margin: '0',
  },
  userItem: {
    padding: '8px 0',
    borderBottom: '1px solid #ecf0f1',
  },
  userName: {
    fontSize: '14px',
    color: '#34495e',
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
  canvasContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  canvasInfo: {
    padding: '8px 12px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
    color: '#7f8c8d',
    textAlign: 'center',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: '#7f8c8d',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #ecf0f1',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  error: {
    padding: '40px',
    backgroundColor: '#fee',
    border: '1px solid #fcc',
    borderRadius: '8px',
    color: '#c33',
    textAlign: 'center',
  },
  info: {
    padding: '40px',
    backgroundColor: '#e8f4f8',
    border: '1px solid #b8dce8',
    borderRadius: '8px',
    color: '#2980b9',
    textAlign: 'center',
  },
};