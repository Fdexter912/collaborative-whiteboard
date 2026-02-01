// client/src/components/Canvas.jsx
import { useRef, useEffect, useState, useCallback } from 'react';
import { 
  getCanvasCoordinates, 
  drawStroke, 
  renderAllStrokes,
  simplifyStroke
} from '../utils/canvas';

/**
 * Canvas Component
 * 
 * Interactive drawing canvas with mouse/touch support.
 * Handles local drawing and communicates with server.
 * 
 * Props:
 * - strokes: Array of stroke objects from server
 * - onStrokeComplete: Callback when user finishes drawing
 * - currentTool: Current drawing tool
 * - currentColor: Current stroke color
 * - currentWidth: Current stroke width
 * - width: Canvas width (default: 800)
 * - height: Canvas height (default: 600)
 */
export default function Canvas({
  strokes = [],
  onStrokeComplete,
  currentTool = 'pen',
  currentColor = '#000000',
  currentWidth = 2,
  width = 800,
  height = 600,
//   darkMode = false
}) {
  // Canvas refs
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  
  // Track if component is mounted
  const isMounted = useRef(true);

  /**
   * Initialize canvases on mount
   */
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

    const ctx = canvas.getContext('2d');
    renderAllStrokes(ctx, strokes, width, height);
  }, [strokes, width, height]);

  /**
   * Render current stroke being drawn
   */
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas || !currentStroke) return;

    const ctx = canvas.getContext('2d');
    
    // Clear drawing canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw current stroke
    if (currentStroke.points.length > 0) {
      drawStroke(ctx, currentStroke);
    }
  }, [currentStroke, width, height]);

  /**
   * Start drawing
   */
  const handleMouseDown = useCallback((event) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const point = getCanvasCoordinates(event, canvas);
    
    setIsDrawing(true);
    setCurrentStroke({
      points: [point],
      color: currentColor,
      width: currentWidth,
      tool: currentTool,
      type: 'stroke'
    });
  }, [currentColor, currentWidth, currentTool]);

  /**
   * Continue drawing
   */
  const handleMouseMove = useCallback((event) => {
    if (!isDrawing) return;

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const point = getCanvasCoordinates(event, canvas);
    
    setCurrentStroke(prev => {
      if (!prev) return null;
      
      // Add point to stroke
      return {
        ...prev,
        points: [...prev.points, point]
      };
    });
  }, [isDrawing]);

  /**
   * Finish drawing
   */
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentStroke) return;

    setIsDrawing(false);
    
    // Simplify stroke to reduce data size
    const simplifiedStroke = {
      ...currentStroke,
      points: simplifyStroke(currentStroke.points)
    };
    
    // Clear drawing canvas
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
    }
    
    // Send to parent component
    if (onStrokeComplete && simplifiedStroke.points.length >= 2) {
      onStrokeComplete(simplifiedStroke);
    }
    
    setCurrentStroke(null);
  }, [isDrawing, currentStroke, onStrokeComplete, width, height]);

  /**
   * Handle mouse leaving canvas
   */
  const handleMouseLeave = useCallback(() => {
    if (isDrawing) {
      handleMouseUp();
    }
  }, [isDrawing, handleMouseUp]);

  /**
   * Prevent context menu on right click
   */
  const handleContextMenu = useCallback((event) => {
    event.preventDefault();
  }, []);

  return (
    <div 
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        border: '2px solid #ddd',
        borderRadius: '4px',
        cursor: currentTool === 'eraser' ? 'crosshair' : 'default',
        touchAction: 'none', // Prevent scrolling on touch
        userSelect: 'none' // Prevent text selection
      }}
    >
      {/* Background canvas - completed strokes */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: '#ffffff'
        }}
      />
      
      {/* Drawing canvas - current stroke */}
      <canvas
        ref={drawingCanvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'auto'
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