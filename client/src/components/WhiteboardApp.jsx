// client/src/components/WhiteboardApp.jsx
import { useState, useCallback, useEffect } from "react";
import { useRoom, useSocketEvent } from "../hooks/useSocket";
import { useHistory } from "../hooks/useHistory";
import socketService from "../services/socket";
import Canvas from "./Canvas";
import Toolbar from "./Toolbar";
import { downloadCanvasAsPNG, renderAllStrokes } from "../utils/canvas";

export default function WhiteboardApp({ roomId, userId }) {
  // Room state
  const { joined, loading, clients, boardState, error } = useRoom(
    roomId,
    userId,
  );

  // Drawing state
  const [strokes, setStrokes] = useState([]);
  const [currentTool, setCurrentTool] = useState("pen");
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentWidth, setCurrentWidth] = useState(2);
  const [selectedStroke, setSelectedStroke] = useState(null);

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  // History for undo/redo
  const { addToHistory, undo, redo, canUndo, canRedo, clearHistory } =
    useHistory();

  /**
   * Initialize strokes from board state
   */
  useEffect(() => {
    if (boardState?.strokes) {
      console.log("📋 Initializing strokes:", boardState.strokes.length);
      setStrokes(boardState.strokes);
      clearHistory(); // Reset history when joining new room
    }
  }, [boardState, clearHistory]);

  /**
   * Save dark mode preference
   */
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  /**
   * Listen for new strokes from server
   */
  useSocketEvent("draw.stroke", (stroke) => {
    console.log("📥 Received stroke:", stroke.id);
    setStrokes((prev) => [...prev, stroke]);
  });

  /**
   * Listen for stroke deletions
   */
  useSocketEvent("draw.deleteStroke", ({ strokeId }) => {
    console.log("🗑️ Stroke deleted:", strokeId);
    setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
  });

  /**
   * Listen for canvas clear
   */
  useSocketEvent("draw.clear", ({ clearedBy }) => {
    console.log("🧹 Canvas cleared by:", clearedBy);
    setStrokes([]);
    clearHistory();
  });

  /**
   * Handle stroke completion
   */
  const handleStrokeComplete = useCallback(
    (stroke) => {
      console.log("✏️ Stroke completed, sending to server...");

      // Add to history for undo
      addToHistory({
        type: "add",
        stroke: stroke,
      });

      // Optimistic update
      const optimisticStroke = {
        ...stroke,
        id: `temp_${Date.now()}`,
        author: userId,
        timestamp: Date.now(),
      };

      setStrokes((prev) => [...prev, optimisticStroke]);

      // Send to server
      const sent = socketService.send("draw.stroke", stroke);

      if (!sent) {
        console.error("❌ Failed to send stroke - not connected");
        setStrokes((prev) => prev.filter((s) => s.id !== optimisticStroke.id));
      }
    },
    [userId, addToHistory],
  );

  /**
   * Handle undo
   */
  const handleUndo = useCallback(() => {
    const action = undo();
    if (!action) return;

    if (action.type === "add") {
      // Remove the last stroke
      const lastStroke = strokes[strokes.length - 1];
      if (lastStroke) {
        setStrokes((prev) => prev.slice(0, -1));
        // Note: In a production app, you'd sync this with server
      }
    }
  }, [undo, strokes]);

  /**
   * Handle redo
   */
  const handleRedo = useCallback(() => {
    const action = redo();
    if (!action) return;

    if (action.type === "add") {
      // Re-add the stroke
      setStrokes((prev) => [...prev, action.stroke]);
    }
  }, [redo]);

  /**
   * Handle clear canvas
   */
  const handleClear = useCallback(() => {
    if (!window.confirm("Clear entire canvas? This cannot be undone.")) {
      return;
    }

    setStrokes([]);
    clearHistory();
    socketService.send("draw.clear", {});
  }, [clearHistory]);

  /**
   * Handle download canvas
   */
  const handleDownload = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;

    const ctx = canvas.getContext("2d");

    // Background color based on dark mode
    ctx.fillStyle = darkMode ? "#1a1a1a" : "#ffffff";
    ctx.fillRect(0, 0, 800, 600);

    // Render all strokes
    renderAllStrokes(ctx, strokes, 800, 600);

    const filename = `whiteboard_${roomId}_${Date.now()}.png`;
    downloadCanvasAsPNG(canvas, filename);
  }, [roomId, strokes, darkMode]);

  /**
   * Toggle dark mode
   */
  const handleToggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  // Handle stroke selection for deletion
  const handleStrokeSelect = useCallback((stroke) => {
    console.log("🎯 Stroke selected:", stroke?.id);
    setSelectedStroke(stroke);
  }, []);

  // Handle delete
  const handleDeleteSelected = useCallback(() => {
    if (!selectedStroke) return;

    console.log("🗑️ Deleting stroke:", selectedStroke.id);

    // Optimistic update
    setStrokes((prev) => prev.filter((s) => s.id !== selectedStroke.id));
    setSelectedStroke(null);

    // Send to server
    socketService.send("draw.deleteStroke", { strokeId: selectedStroke.id });
  }, [selectedStroke]);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl+Y or Cmd+Shift+Z for redo
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "z"))
      ) {
        e.preventDefault();
        handleRedo();
      }

      // Delete or Backspace for delete
      if ((e.key === "Delete" || e.key === "Backspace") && selectedStroke) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleDeleteSelected, selectedStroke]);

  // Get dynamic styles
  const getStyles = () => ({
    container: {
      ...styles.container,
      backgroundColor: darkMode ? "#1a1a1a" : "#ecf0f1",
    },
    title: {
      ...styles.title,
      color: darkMode ? "#ecf0f1" : "#2c3e50",
    },
    roomInfo: {
      ...styles.roomInfo,
      color: darkMode ? "#95a5a6" : "#7f8c8d",
    },
    usersPanel: {
      ...styles.usersPanel,
      backgroundColor: darkMode ? "#2c3e50" : "#fff",
      borderColor: darkMode ? "#34495e" : "#ddd",
    },
    usersTitle: {
      ...styles.usersTitle,
      color: darkMode ? "#ecf0f1" : "#2c3e50",
    },
    userName: {
      ...styles.userName,
      color: darkMode ? "#bdc3c7" : "#34495e",
    },
    userItem: {
      ...styles.userItem,
      borderBottomColor: darkMode ? "#34495e" : "#ecf0f1",
    },
    canvasInfo: {
      ...styles.canvasInfo,
      backgroundColor: darkMode ? "#2c3e50" : "#fff",
      borderColor: darkMode ? "#34495e" : "#ddd",
      color: darkMode ? "#95a5a6" : "#7f8c8d",
    },
  });

  const dynamicStyles = getStyles();

  // Loading state
  if (loading) {
    return (
      <div style={dynamicStyles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p style={{ color: darkMode ? "#ecf0f1" : "#7f8c8d" }}>
            Joining room...
          </p>
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

  return (
    <div style={dynamicStyles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={dynamicStyles.title}>Collaborative Whiteboard</h1>
        <div style={dynamicStyles.roomInfo}>
          <span style={styles.roomId}>Room: {roomId}</span>
          <span style={styles.clientCount}>
            👥 {clients.length} user{clients.length !== 1 ? "s" : ""} online
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
          />

          {/* Online Users */}
          <div style={dynamicStyles.usersPanel}>
            <h3 style={dynamicStyles.usersTitle}>Online Users</h3>
            <ul style={styles.usersList}>
              {clients.map((client) => (
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
            <span>
              {strokes.length} stroke{strokes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles (same as before, just base styles)
const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#ecf0f1",
    padding: "20px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    transition: "background-color 0.3s",
  },
  header: {
    marginBottom: "24px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: "8px",
    transition: "color 0.3s",
  },
  roomInfo: {
    display: "flex",
    gap: "16px",
    fontSize: "14px",
    color: "#7f8c8d",
    transition: "color 0.3s",
  },
  roomId: {
    fontWeight: "600",
  },
  clientCount: {
    fontWeight: "500",
  },
  content: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: "20px",
    alignItems: "start",
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  usersPanel: {
    padding: "20px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    border: "1px solid #ddd",
    transition: "all 0.3s",
  },
  usersTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: "12px",
    transition: "color 0.3s",
  },
  usersList: {
    listStyle: "none",
    padding: "0",
    margin: "0",
  },
  userItem: {
    padding: "8px 0",
    borderBottom: "1px solid #ecf0f1",
    transition: "border-color 0.3s",
  },
  userName: {
    fontSize: "14px",
    color: "#34495e",
    transition: "color 0.3s",
  },
  youBadge: {
    marginLeft: "8px",
    padding: "2px 8px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#fff",
    backgroundColor: "#27ae60",
    borderRadius: "12px",
  },
  canvasContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  canvasInfo: {
    padding: "8px 12px",
    backgroundColor: "#fff",
    borderRadius: "4px",
    border: "1px solid #ddd",
    fontSize: "14px",
    color: "#7f8c8d",
    textAlign: "center",
    transition: "all 0.3s",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    color: "#7f8c8d",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #ecf0f1",
    borderTop: "4px solid #3498db",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
  error: {
    padding: "40px",
    backgroundColor: "#fee",
    border: "1px solid #fcc",
    borderRadius: "8px",
    color: "#c33",
    textAlign: "center",
  },
  info: {
    padding: "40px",
    backgroundColor: "#e8f4f8",
    border: "1px solid #b8dce8",
    borderRadius: "8px",
    color: "#2980b9",
    textAlign: "center",
  },
};
