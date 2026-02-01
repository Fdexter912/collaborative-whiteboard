// client/src/hooks/useHistory.js
import { useState, useCallback } from 'react';

/**
 * useHistory Hook
 * 
 * Provides undo/redo functionality for stroke history.
 * Maintains a stack of actions with pointer management.
 * 
 * @param {number} maxHistory - Maximum history size (default: 50)
 * @returns {Object} History state and actions
 */
export function useHistory(maxHistory = 50) {
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  /**
   * Add action to history
   */
  const addToHistory = useCallback((action) => {
    setHistory(prev => {
      // Remove any "future" history if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new action
      newHistory.push(action);
      
      // Limit history size
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        setCurrentIndex(prev => prev); // Don't change index if we're shifting
      } else {
        setCurrentIndex(newHistory.length - 1);
      }
      
      return newHistory;
    });
  }, [currentIndex, maxHistory]);

  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    if (currentIndex < 0) return null;
    
    const action = history[currentIndex];
    setCurrentIndex(prev => prev - 1);
    
    return action;
  }, [currentIndex, history]);

  /**
   * Redo next action
   */
  const redo = useCallback(() => {
    if (currentIndex >= history.length - 1) return null;
    
    const nextIndex = currentIndex + 1;
    const action = history[nextIndex];
    setCurrentIndex(nextIndex);
    
    return action;
  }, [currentIndex, history]);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  /**
   * Check if undo is available
   */
  const canUndo = currentIndex >= 0;

  /**
   * Check if redo is available
   */
  const canRedo = currentIndex < history.length - 1;

  return {
    addToHistory,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
    historyLength: history.length,
    currentIndex
  };
}