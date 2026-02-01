// client/src/components/Canvas.jsx
import { useRef, useEffect, useState, useCallback } from "react";
import {
  getCanvasCoordinates,
  drawStroke,
  renderAllStrokes,
  simplifyStroke,
} from "../utils/canvas";
import { findStrokeAtPoint, highlightStroke } from "../utils/strokeSelection";

export default function Canvas({
  strokes = [],
  onStrokeComplete,
  onStrokeSelect,
  currentTool = "pen",
  currentColor = "#000000",
  currentWidth = 2,
  width = 800,
  height = 600,
  darkMode = false,
}) {
  // Canvas refs
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const selectionCanvasRef = useRef(null); // NEW: For selection highlight

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);

  // Selection state
  const [selectedStroke, setSelectedStroke] = useState(null);
  const [hoveredStroke, setHoveredStroke] = useState(null);

  // Track if component is mounted
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Render all strokes when strokes array changes
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    renderAllStrokes(ctx, strokes, width, height);
  }, [strokes, width, height]);

  /**
   * Render current stroke being drawn
   */
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas || !currentStroke) return;

    const ctx = canvas.getContext("2d");

    // Clear drawing canvas
    ctx.clearRect(0, 0, width, height);

    // Draw current stroke
    if (currentStroke.points.length > 0) {
      drawStroke(ctx, currentStroke);
    }
  }, [currentStroke, width, height]);

  /**
   * Render selection highlight
   */
  useEffect(() => {
    const canvas = selectionCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    // Highlight hovered stroke
    if (hoveredStroke && currentTool === "select") {
      highlightStroke(ctx, hoveredStroke);
    }

    // Highlight selected stroke
    if (selectedStroke) {
      ctx.save();
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = selectedStroke.width + 4;
      ctx.globalAlpha = 0.5;

      ctx.beginPath();
      const [startX, startY] = selectedStroke.points[0];
      ctx.moveTo(startX, startY);

      for (let i = 1; i < selectedStroke.points.length; i++) {
        const [x, y] = selectedStroke.points[i];
        ctx.lineTo(x, y);
      }

      ctx.stroke();
      ctx.restore();
    }
  }, [hoveredStroke, selectedStroke, currentTool, width, height]);

  /**
   * Handle mouse down
   */
  const handleMouseDown = useCallback(
    (event) => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;

      const point = getCanvasCoordinates(event, canvas);

      // Selection mode
      if (currentTool === "select") {
        const stroke = findStrokeAtPoint(point, strokes, 15);
        setSelectedStroke(stroke);

        if (stroke && onStrokeSelect) {
          onStrokeSelect(stroke);
        }
        return;
      }

      // Drawing mode
      setIsDrawing(true);
      setCurrentStroke({
        points: [point],
        color: currentColor,
        width: currentWidth,
        tool: currentTool,
        type: "stroke",
      });

      // Clear selection when starting to draw
      setSelectedStroke(null);
    },
    [currentColor, currentWidth, currentTool, strokes, onStrokeSelect],
  );

  /**
   * Handle mouse move
   */
  const handleMouseMove = useCallback(
    (event) => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;

      const point = getCanvasCoordinates(event, canvas);

      // Selection mode - show hover
      if (currentTool === "select" && !isDrawing) {
        const stroke = findStrokeAtPoint(point, strokes, 15);
        setHoveredStroke(stroke);
        return;
      }

      // Drawing mode
      if (!isDrawing) return;

      setCurrentStroke((prev) => {
        if (!prev) return null;

        return {
          ...prev,
          points: [...prev.points, point],
        };
      });
    },
    [isDrawing, currentTool, strokes],
  );

  /**
   * Handle mouse up
   */
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentStroke) return;

    setIsDrawing(false);

    // Simplify stroke
    const simplifiedStroke = {
      ...currentStroke,
      points: simplifyStroke(currentStroke.points),
    };

    // Clear drawing canvas
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);
    }

    // Send to parent
    if (onStrokeComplete && simplifiedStroke.points.length >= 2) {
      onStrokeComplete(simplifiedStroke);
    }

    setCurrentStroke(null);
  }, [isDrawing, currentStroke, onStrokeComplete, width, height]);

  /**
   * Handle mouse leave
   */
  const handleMouseLeave = useCallback(() => {
    if (isDrawing) {
      handleMouseUp();
    }
    setHoveredStroke(null);
  }, [isDrawing, handleMouseUp]);

  /**
   * Prevent context menu
   */
  const handleContextMenu = useCallback((event) => {
    event.preventDefault();
  }, []);

  // Get cursor style
  const getCursor = () => {
    if (currentTool === "select") {
      return hoveredStroke ? "pointer" : "default";
    }
    if (currentTool === "eraser") {
      return "crosshair";
    }
    return "crosshair";
  };

  return (
    <div
      style={{
        position: "relative",
        width: `${width}px`,
        height: `${height}px`,
        border: `2px solid ${darkMode ? "#34495e" : "#ddd"}`,
        borderRadius: "4px",
        cursor: getCursor(),
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {/* Background canvas - completed strokes */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: darkMode ? "#1a1a1a" : "#ffffff",
        }}
      />

      {/* Selection canvas - highlights */}
      <canvas
        ref={selectionCanvasRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      />

      {/* Drawing canvas - current stroke */}
      <canvas
        ref={drawingCanvasRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "auto",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}
