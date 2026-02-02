// client/src/components/WhiteboardApp.jsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRoom, useSocketEvent } from '../hooks/useSocket';
import { useHistory } from '../hooks/useHistory';
import { useSyncManager } from '../hooks/useSyncManager'; // NEW
import socketService from '../services/socket';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import { renderAllStrokes } from '../utils/canvas';
import { exportToJSON, importFromJSON, downloadJSON, loadJSONFile } from '../utils/export';
import { PerformanceMonitor } from '../utils/performance';

export default function WhiteboardApp({ roomId, userId }) {
  // Room state
  const { joined, loading, clients, boardState, error } = useRoom(roomId, userId);
  
  // Sync manager - NEW
  const syncManager = useSyncManager(roomId);
  
  // Drawing state
  const [strokes, setStrokes] = useState([]);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentWidth, setCurrentWidth] = useState(2);
  
  // Selection state
  const [selectedStroke, setSelectedStroke] = useState(null);
  
  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  // History
  const { addToHistory, undo, redo, canUndo, canRedo, clearHistory } = useHistory();

  // Performance
  const [showStats, setShowStats] = useState(false);
  const [fps, setFps] = useState(0);
  const perfMonitor = useRef(new PerformanceMonitor());

  /**
   * Initialize strokes and sync manager from board state
   */
  useEffect(() => {
    if (boardState?.strokes) {
      console.log('📋 Initializing strokes:', boardState.strokes.length);
      setStrokes(boardState.strokes);
      clearHistory();
      
      // Initialize sync manager with current sequence - NEW
      const sequence = boardState.sequence || 0;
      syncManager.initialize(sequence);
      syncManager.startSyncMonitor();
      
      console.log(`🔄 Sync initialized at sequence ${sequence}`);
    }
  }, [boardState, clearHistory, syncManager]);

  /**
   * Save dark mode preference
   */
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  /**
   * Performance monitoring
   */
  useEffect(() => {
    if (!showStats) return;
    
    const interval = setInterval(() => {
      perfMonitor.current.tick();
      setFps(perfMonitor.current.getFPS());
    }, 100);
    
    return () => clearInterval(interval);
  }, [showStats]);

  /**
   * Apply event to state
   * NEW - Separated from event receiving
   */
  const applyEvent = useCallback((event) => {
    console.log(`📨 Applying event seq ${event.seq}:`, event.type);
    
    switch (event.type) {
      case 'draw.stroke':
        setStrokes(prev => [...prev, event.data]);
        break;
        
      case 'draw.deleteStroke':
        setStrokes(prev => prev.filter(s => s.id !== event.data.strokeId));
        break;
        
      case 'draw.clear':
        setStrokes([]);
        clearHistory();
        break;
        
      default:
        console.warn('Unknown event type:', event.type);
    }
  }, [clearHistory]);

  /**
   * Listen for new strokes from server
   * UPDATED - Use sync manager
   */
  useSocketEvent('draw.stroke', (event) => {
    console.log('📥 Received draw.stroke event:', event);
    
    const readyEvents = syncManager.processEvent(event);
    readyEvents.forEach(applyEvent);
  });

  /**
   * Listen for stroke deletions
   * UPDATED - Use sync manager
   */
  useSocketEvent('draw.deleteStroke', (event) => {
    console.log('📥 Received draw.deleteStroke event:', event);
    
    const readyEvents = syncManager.processEvent(event);
    readyEvents.forEach(applyEvent);
  });

  /**
   * Listen for canvas clear
   * UPDATED - Use sync manager
   */
  useSocketEvent('draw.clear', (event) => {
    console.log('📥 Received draw.clear event:', event);
    
    const readyEvents = syncManager.processEvent(event);
    readyEvents.forEach(applyEvent);
  });

  /**
   * Listen for sync events (missing event recovery)
   * NEW
   */
  useSocketEvent('sync.events', ({ events, currentSeq }) => {
    console.log(`📦 Received ${events.length} sync events, current seq: ${currentSeq}`);
    
    events.forEach(event => {
      const readyEvents = syncManager.processEvent(event);
      readyEvents.forEach(applyEvent);
    });
  });

  /**
   * Handle stroke completion
   */
  const handleStrokeComplete = useCallback((stroke) => {
    console.log('✏️ Stroke completed, sending to server...');
    
    addToHistory({
      type: 'add',
      stroke: stroke
    });
    
    // Optimistic update
    const optimisticStroke = {
      ...stroke,
      id: `temp_${Date.now()}`,
      author: userId,
      timestamp: Date.now()
    };
    
    setStrokes(prev => [...prev, optimisticStroke]);
    
    // Send to server
    const sent = socketService.send('draw.stroke', stroke);
    
    if (!sent) {
      console.error('❌ Failed to send stroke - not connected');
      setStrokes(prev => prev.filter(s => s.id !== optimisticStroke.id));
    }
  }, [userId, addToHistory]);

  /**
   * Handle stroke selection
   */
  const handleStrokeSelect = useCallback((stroke) => {
    console.log('🎯 Stroke selected:', stroke?.id);
    setSelectedStroke(stroke);
  }, []);

  /**
   * Handle delete selected stroke
   */
  const handleDeleteSelected = useCallback(() => {
    if (!selectedStroke) return;
    
    console.log('🗑️ Deleting stroke:', selectedStroke.id);
    
    setStrokes(prev => prev.filter(s => s.id !== selectedStroke.id));
    setSelectedStroke(null);
    
    socketService.send('draw.deleteStroke', { strokeId: selectedStroke.id });
  }, [selectedStroke]);

  /**
   * Handle undo
   */
  const handleUndo = useCallback(() => {
    const action = undo();
    if (!action) return;
    
    if (action.type === 'add') {
      const lastStroke = strokes[strokes.length - 1];
      if (lastStroke) {
        setStrokes(prev => prev.slice(0, -1));
      }
    }
  }, [undo, strokes]);

  /**
   * Handle redo
   */
  const handleRedo = useCallback(() => {
    const action = redo();
    if (!action) return;
    
    if (action.type === 'add') {
      setStrokes(prev => [...prev, action.stroke]);
    }
  }, [redo]);

  /**
   * Handle clear canvas
   */
  const handleClear = useCallback(() => {
    if (!window.confirm('Clear entire canvas? This cannot be undone.')) {
      return;
    }
    
    setStrokes([]);
    clearHistory();
    socketService.send('draw.clear', {});
  }, [clearHistory]);

  /**
   * Handle download
   */
  const handleDownload = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = darkMode ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(0, 0, 800, 600);
    
    renderAllStrokes(ctx, strokes, 800, 600);
    
    const filename = `whiteboard_${roomId}_${Date.now()}.png`;
    import('../utils/canvas').then(({ downloadCanvasAsPNG }) => {
      downloadCanvasAsPNG(canvas, filename);
    });
  }, [roomId, strokes, darkMode]);

  /**
   * Handle export
   */
  const handleExport = useCallback(() => {
    const json = exportToJSON(strokes, roomId, {
      exportedBy: userId,
      clientCount: clients.length
    });
    
    const filename = `whiteboard_${roomId}_${Date.now()}.json`;
    downloadJSON(json, filename);
    
    console.log('📤 Exported', strokes.length, 'strokes');
  }, [strokes, roomId, userId, clients]);

  /**
   * Handle import
   */
  const handleImport = useCallback(async () => {
    if (!window.confirm('Import will replace current strokes. Continue?')) {
      return;
    }
    
    try {
      const jsonString = await loadJSONFile();
      const result = importFromJSON(jsonString);
      
      if (!result.success) {
        alert(`Import failed: ${result.error}`);
        return;
      }
      
      setStrokes([]);
      clearHistory();
      socketService.send('draw.clear', {});
      
      result.data.strokes.forEach(stroke => {
        const { id, author, timestamp, version, ...strokeData } = stroke;
        socketService.send('draw.stroke', strokeData);
      });
      
      console.log('📥 Imported', result.data.strokes.length, 'strokes');
    } catch (error) {
      console.error('Import error:', error);
      alert(`Import failed: ${error.message}`);
    }
  }, [clearHistory]);

  /**
   * Toggle dark mode
   */
  const handleToggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      
      // Ctrl+Y or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
      
      // Delete or Backspace for delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedStroke) {
        e.preventDefault();
        handleDeleteSelected();
      }
      
      // Ctrl+P for stats
      if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowStats(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleDeleteSelected, selectedStroke]);

  // Dynamic styles
  const getStyles = () => ({
    container: {
      ...styles.container,
      backgroundColor: darkMode ? '#1a1a1a' : '#ecf0f1',
    },
    title: {
      ...styles.title,
      color: darkMode ? '#ecf0f1' : '#2c3e50',
    },
    roomInfo: {
      ...styles.roomInfo,
      color: darkMode ? '#95a5a6' : '#7f8c8d',
    },
    usersPanel: {
      ...styles.usersPanel,
      backgroundColor: darkMode ? '#2c3e50' : '#fff',
      borderColor: darkMode ? '#34495e' : '#ddd',
    },
    usersTitle: {
      ...styles.usersTitle,
      color: darkMode ? '#ecf0f1' : '#2c3e50',
    },
    userName: {
      ...styles.userName,
      color: darkMode ? '#bdc3c7' : '#34495e',
    },
    userItem: {
      ...styles.userItem,
      borderBottomColor: darkMode ? '#34495e' : '#ecf0f1',
    },
    canvasInfo: {
      ...styles.canvasInfo,
      backgroundColor: darkMode ? '#2c3e50' : '#fff',
      borderColor: darkMode ? '#34495e' : '#ddd',
      color: darkMode ? '#95a5a6' : '#7f8c8d',
    },
  });

  const dynamicStyles = getStyles();

  // Loading state
  if (loading) {
    return (
      <div style={dynamicStyles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p style={{ color: darkMode ? '#ecf0f1' : '#7f8c8d' }}>Joining room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={dynamicStyles.container}>
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
      <div style={dynamicStyles.container}>
        <div style={styles.info}>
          <p>Waiting to join room...</p>
        </div>
      </div>
    );
  }

  // Get sync stats for display
  const syncStats = syncManager.getStats();

  return (
    <div style={dynamicStyles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={dynamicStyles.title}>Collaborative Whiteboard</h1>
        <div style={dynamicStyles.roomInfo}>
          <span style={styles.roomId}>Room: {roomId}</span>
          <span style={styles.clientCount}>
            👥 {clients.length} user{clients.length !== 1 ? 's' : ''} online
          </span>
          {/* Sync status - NEW */}
          <span style={styles.syncStatus}>
            🔄 Seq: {syncStats.lastAppliedSeq}
            {syncStats.hasGaps && ` (⚠️ ${syncStats.pendingCount} pending)`}
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
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
            selectedStroke={selectedStroke}
            onDeleteSelected={handleDeleteSelected}
            onExport={handleExport}
            onImport={handleImport}
          />
          
          {/* Online Users */}
          <div style={dynamicStyles.usersPanel}>
            <h3 style={dynamicStyles.usersTitle}>Online Users</h3>
            <ul style={styles.usersList}>
              {clients.map(client => (
                <li key={client.socketId} style={dynamicStyles.userItem}>
                  <span style={dynamicStyles.userName}>
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
            onStrokeSelect={handleStrokeSelect}
            currentTool={currentTool}
            currentColor={currentColor}
            currentWidth={currentWidth}
            width={800}
            height={600}
            // darkMode={darkMode}
          />
          
          {/* Canvas Info */}
          <div style={dynamicStyles.canvasInfo}>
            <span>{strokes.length} stroke{strokes.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      {showStats && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          padding: '12px 16px',
          backgroundColor: darkMode ? 'rgba(44, 62, 80, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          border: `1px solid ${darkMode ? '#34495e' : '#ddd'}`,
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '14px',
          color: darkMode ? '#ecf0f1' : '#2c3e50',
          zIndex: 1000,
        }}>
          <div><strong>Performance Stats</strong></div>
          <div>FPS: {fps}</div>
          <div>Strokes: {strokes.length}</div>
          <div>Points: {strokes.reduce((sum, s) => sum + s.points.length, 0)}</div>
          <div style={{ marginTop: '8px', borderTop: `1px solid ${darkMode ? '#34495e' : '#ddd'}`, paddingTop: '8px' }}>
            <strong>Sync Stats</strong>
          </div>
          <div>Last Seq: {syncStats.lastAppliedSeq}</div>
          <div>Pending: {syncStats.pendingCount}</div>
          <div>Applied: {syncStats.appliedCount}</div>
          {syncStats.hasGaps && (
            <div style={{ color: '#e74c3c' }}>
              Gap: {syncStats.gapRange?.from}-{syncStats.gapRange?.to}
            </div>
          )}
          <div style={{ marginTop: '8px', fontSize: '12px', color: darkMode ? '#95a5a6' : '#7f8c8d' }}>
            Press Ctrl+P to toggle
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ecf0f1',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'background-color 0.3s',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: '8px',
    transition: 'color 0.3s',
  },
  roomInfo: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    color: '#7f8c8d',
    transition: 'color 0.3s',
  },
  roomId: {
    fontWeight: '600',
  },
  clientCount: {
    fontWeight: '500',
  },
  syncStatus: {
    fontWeight: '500',
    fontFamily: 'monospace',
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
    transition: 'all 0.3s',
  },
  usersTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '12px',
    transition: 'color 0.3s',
  },
  usersList: {
    listStyle: 'none',
    padding: '0',
    margin: '0',
  },
  userItem: {
    padding: '8px 0',
    borderBottom: '1px solid #ecf0f1',
    transition: 'border-color 0.3s',
  },
  userName: {
    fontSize: '14px',
    color: '#34495e',
    transition: 'color 0.3s',
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
    transition: 'all 0.3s',
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