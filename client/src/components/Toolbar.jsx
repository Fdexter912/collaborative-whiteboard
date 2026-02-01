// client/src/components/Toolbar.jsx
import { DEFAULT_PALETTE } from '../utils/colors';

export default function Toolbar({
  currentTool = 'pen',
  onToolChange,
  currentColor = '#000000',
  onColorChange,
  currentWidth = 2,
  onWidthChange,
  onClear,
  onDownload,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  disabled = false,
  darkMode = false,
  onToggleDarkMode
}) {
  
  const tools = [
    { id: 'pen', label: '✏️ Pen', description: 'Draw solid lines' },
    { id: 'highlighter', label: '🖍️ Highlighter', description: 'Semi-transparent marker' },
    { id: 'eraser', label: '🧹 Eraser', description: 'Erase strokes' }
  ];

  const widths = [
    { value: 1, label: 'Thin' },
    { value: 2, label: 'Normal' },
    { value: 4, label: 'Medium' },
    { value: 8, label: 'Thick' },
    { value: 16, label: 'Very Thick' }
  ];

  // Get dynamic styles based on dark mode
  const getStyles = () => ({
    ...styles,
    toolbar: {
      ...styles.toolbar,
      backgroundColor: darkMode ? '#2c3e50' : '#f8f9fa',
      borderColor: darkMode ? '#34495e' : '#ddd',
    },
    sectionLabel: {
      ...styles.sectionLabel,
      color: darkMode ? '#ecf0f1' : '#2c3e50',
    },
    toolButton: {
      ...styles.toolButton,
      backgroundColor: darkMode ? '#34495e' : '#fff',
      borderColor: darkMode ? '#4a5f7f' : '#ddd',
      color: darkMode ? '#ecf0f1' : '#2c3e50',
    },
    customColorLabel: {
      ...styles.customColorLabel,
      color: darkMode ? '#95a5a6' : '#7f8c8d',
    },
  });

  const dynamicStyles = getStyles();

  return (
    <div style={dynamicStyles.toolbar}>
      {/* Tool Selection */}
      <div style={styles.section}>
        <label style={dynamicStyles.sectionLabel}>Tool</label>
        <div style={styles.toolGrid}>
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => onToolChange?.(tool.id)}
              disabled={disabled}
              style={{
                ...dynamicStyles.toolButton,
                ...(currentTool === tool.id && styles.toolButtonActive),
                ...(disabled && styles.buttonDisabled)
              }}
              title={tool.description}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color Picker */}
      <div style={styles.section}>
        <label style={dynamicStyles.sectionLabel}>Color</label>
        <div style={styles.colorGrid}>
          {DEFAULT_PALETTE.map(color => (
            <button
              key={color}
              onClick={() => onColorChange?.(color)}
              disabled={disabled || currentTool === 'eraser'}
              style={{
                ...styles.colorButton,
                backgroundColor: color,
                border: currentColor === color ? '3px solid #3498db' : '1px solid #ddd',
                ...(disabled && styles.buttonDisabled)
              }}
              title={color}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
        
        {/* Custom Color Input */}
        <div style={styles.customColorContainer}>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onColorChange?.(e.target.value)}
            disabled={disabled || currentTool === 'eraser'}
            style={styles.customColorInput}
          />
          <span style={dynamicStyles.customColorLabel}>Custom</span>
        </div>
      </div>

      {/* Stroke Width */}
      <div style={styles.section}>
        <label style={dynamicStyles.sectionLabel}>
          Width: {currentWidth}px
        </label>
        <input
          type="range"
          min="0.5"
          max="50"
          step="0.5"
          value={currentWidth}
          onChange={(e) => onWidthChange?.(parseFloat(e.target.value))}
          disabled={disabled}
          style={{
            ...styles.slider,
            ...(disabled && styles.buttonDisabled)
          }}
        />
        
        {/* Quick Width Buttons */}
        <div style={styles.widthGrid}>
          {widths.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onWidthChange?.(value)}
              disabled={disabled}
              style={{
                ...styles.widthButton,
                backgroundColor: darkMode ? '#34495e' : '#fff',
                borderColor: darkMode ? '#4a5f7f' : '#ddd',
                color: darkMode ? '#ecf0f1' : '#2c3e50',
                ...(currentWidth === value && styles.widthButtonActive),
                ...(disabled && styles.buttonDisabled)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* History Actions - NEW */}
      <div style={styles.section}>
        <label style={dynamicStyles.sectionLabel}>History</label>
        <div style={styles.historyGrid}>
          <button
            onClick={onUndo}
            disabled={disabled || !canUndo}
            style={{
              ...styles.historyButton,
              ...(disabled || !canUndo ? styles.buttonDisabled : {})
            }}
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          
          <button
            onClick={onRedo}
            disabled={disabled || !canRedo}
            style={{
              ...styles.historyButton,
              ...(disabled || !canRedo ? styles.buttonDisabled : {})
            }}
            title="Redo (Ctrl+Y)"
          >
            ↷ Redo
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={styles.section}>
        <label style={dynamicStyles.sectionLabel}>Actions</label>
        <div style={styles.actionGrid}>
          <button
            onClick={onClear}
            disabled={disabled}
            style={{
              ...styles.actionButton,
              ...styles.clearButton,
              ...(disabled && styles.buttonDisabled)
            }}
            title="Clear entire canvas"
          >
            🗑️ Clear
          </button>
          
          <button
            onClick={onDownload}
            disabled={disabled}
            style={{
              ...styles.actionButton,
              ...styles.downloadButton,
              ...(disabled && styles.buttonDisabled)
            }}
            title="Download as PNG"
          >
            💾 Download
          </button>
        </div>
      </div>

      {/* Dark Mode Toggle - NEW */}
      <div style={styles.section}>
        <button
          onClick={onToggleDarkMode}
          style={{
            ...styles.actionButton,
            backgroundColor: darkMode ? '#f39c12' : '#34495e',
            width: '100%',
          }}
          title="Toggle dark mode"
        >
          {darkMode ? '☀️' : '🌙'} {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </div>
  );
}

// Styles
const styles = {
  toolbar: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  section: {
    marginBottom: '24px',
  },
  sectionLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '8px',
  },
  toolGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  toolButton: {
    padding: '10px',
    fontSize: '14px',
    fontWeight: '500',
    border: '2px solid #ddd',
    borderRadius: '6px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  toolButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#e3f2fd',
    fontWeight: '600',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '8px',
    marginBottom: '12px',
  },
  colorButton: {
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  customColorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  customColorInput: {
    width: '60px',
    height: '40px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  customColorLabel: {
    fontSize: '14px',
    color: '#7f8c8d',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  widthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
  },
  widthButton: {
    padding: '6px 8px',
    fontSize: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  widthButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#e3f2fd',
    fontWeight: '600',
  },
  historyGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  historyButton: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#fff',
    backgroundColor: '#95a5a6',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  actionButton: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#fff',
  },
  clearButton: {
    backgroundColor: '#e74c3c',
  },
  downloadButton: {
    backgroundColor: '#27ae60',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};