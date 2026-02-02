// client/src/hooks/useSyncManager.js
import { useRef, useCallback, useEffect } from 'react';
import { EventQueue } from '../utils/eventQueue';
import socketService from '../services/socket';

/**
 * useSyncManager Hook
 * 
 * Manages event synchronization and ordering.
 * Handles missing event detection and recovery.
 */
export function useSyncManager(roomId) {
  const eventQueue = useRef(new EventQueue());
  const syncTimer = useRef(null);

  /**
   * Initialize sync manager with starting sequence
   */
  const initialize = useCallback((startSeq) => {
    eventQueue.current.initialize(startSeq);
  }, []);

  /**
   * Process incoming event
   * Returns events ready to apply
   */
  const processEvent = useCallback((event) => {
    return eventQueue.current.addEvent(event);
  }, []);

  /**
   * Request missing events from server
   */
  const requestMissingEvents = useCallback(() => {
    const gapRange = eventQueue.current.getGapRange();
    
    if (!gapRange) {
      return;
    }

    console.log(`🔄 Requesting missing events ${gapRange.from}-${gapRange.to}`);
    
    socketService.send('sync.requestEvents', {
      fromSeq: gapRange.from,
      toSeq: gapRange.to
    });
  }, []);

  /**
   * Check for gaps and request if needed
   */
  const checkAndSync = useCallback(() => {
    if (eventQueue.current.hasGaps()) {
      console.log('🔍 Gap detected, requesting missing events...');
      requestMissingEvents();
    }
  }, [requestMissingEvents]);

  /**
   * Start periodic gap checking
   */
  const startSyncMonitor = useCallback(() => {
    if (syncTimer.current) {
      return;
    }

    // Check for gaps every 2 seconds
    syncTimer.current = setInterval(() => {
      checkAndSync();
    }, 2000);

    console.log('👁️  Sync monitor started');
  }, [checkAndSync]);

  /**
   * Stop periodic gap checking
   */
  const stopSyncMonitor = useCallback(() => {
    if (syncTimer.current) {
      clearInterval(syncTimer.current);
      syncTimer.current = null;
      console.log('👁️  Sync monitor stopped');
    }
  }, []);

  /**
   * Get current stats
   */
  const getStats = useCallback(() => {
    return eventQueue.current.getStats();
  }, []);

  /**
   * Clear sync state
   */
  const clear = useCallback(() => {
    eventQueue.current.clear();
    stopSyncMonitor();
  }, [stopSyncMonitor]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopSyncMonitor();
    };
  }, [stopSyncMonitor]);

  return {
    initialize,
    processEvent,
    requestMissingEvents,
    startSyncMonitor,
    stopSyncMonitor,
    checkAndSync,
    getStats,
    clear
  };
}