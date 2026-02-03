// client/src/hooks/useSyncManager.js
import { useRef, useCallback, useEffect, useState } from "react";
import { EventQueue } from "../utils/eventQueue";
import socketService from "../services/socket";

export function useSyncManager(roomId) {
  const eventQueue = useRef(new EventQueue());
  const syncTimer = useRef(null);
  const syncInProgress = useRef(false);

  // Track sync state - NEW
  const [syncStatus, setSyncStatus] = useState({
    syncing: false,
    lastSyncTime: null,
    failedAttempts: 0,
  });

  const initialize = useCallback((startSeq) => {
    eventQueue.current.initialize(startSeq);
    setSyncStatus({
      syncing: false,
      lastSyncTime: Date.now(),
      failedAttempts: 0,
    });
  }, []);

  const processEvent = useCallback((event) => {
    return eventQueue.current.addEvent(event);
  }, []);

  /**
   * Request missing events using new sync protocol
   * UPDATED for Commit 3
   */
  const requestMissingEvents = useCallback(() => {
    const gapRange = eventQueue.current.getGapRange();

    if (!gapRange) {
      return;
    }

    console.log(`🔄 Requesting missing events ${gapRange.from}-${gapRange.to}`);

    socketService.send("sync.requestEvents", {
      fromSeq: gapRange.from,
      toSeq: gapRange.to,
    });
  }, []);

  /**
   * Request full sync from server
   * NEW for Commit 3
   */
  const requestFullSync = useCallback(async () => {
    if (syncInProgress.current) {
      console.log("⏳ Sync already in progress, skipping...");
      return;
    }

    const lastSeq = eventQueue.current.getLastAppliedSeq();

    console.log(`🔄 Requesting full sync from sequence ${lastSeq}`);

    syncInProgress.current = true;
    setSyncStatus((prev) => ({ ...prev, syncing: true }));

    try {
      const response = await socketService.requestSync(lastSeq);

      if (response.upToDate) {
        console.log("✅ Already up to date");
        setSyncStatus({
          syncing: false,
          lastSyncTime: Date.now(),
          failedAttempts: 0,
        });
      } else {
        console.log(`📦 Received ${response.events.length} events in sync`);

        // Process all events
        const allReady = [];
        response.events.forEach((event) => {
          const ready = eventQueue.current.addEvent(event);
          allReady.push(...ready);
        });

        setSyncStatus({
          syncing: false,
          lastSyncTime: Date.now(),
          failedAttempts: 0,
        });

        // Emit sync complete event with all ready events
        socketService.emitToListeners("sync.complete", allReady);

        return allReady;
      }
    } catch (error) {
      console.error("❌ Sync request failed:", error);

      setSyncStatus((prev) => ({
        syncing: false,
        lastSyncTime: Date.now(),
        failedAttempts: prev.failedAttempts + 1,
      }));

      throw error;
    } finally {
      syncInProgress.current = false;
    }
  }, []);

  /**
   * Check for gaps and sync
   * UPDATED for Commit 3
   */
  const checkAndSync = useCallback(async () => {
    // Don't sync if already syncing
    if (syncInProgress.current) {
      return;
    }

    const stats = eventQueue.current.getStats();

    // No gaps - all good
    if (!stats.hasGaps) {
      return;
    }

    const gapRange = stats.gapRange;
    const gapSize = gapRange.to - gapRange.from + 1;

    console.log(
      `🔍 Gap detected: ${gapSize} missing events (${gapRange.from}-${gapRange.to})`,
    );

    // Small gap - request specific events
    if (gapSize <= 10) {
      requestMissingEvents();
    } else {
      // Large gap - request full sync
      console.log("📦 Large gap detected, requesting full sync...");
      try {
        const events = await requestFullSync();
        return events;
      } catch (error) {
        console.error("Full sync failed:", error);
      }
    }
  }, [requestMissingEvents, requestFullSync]);

  /**
   * Start sync monitor
   * UPDATED for Commit 3
   */
  const startSyncMonitor = useCallback(() => {
    if (syncTimer.current) {
      return;
    }

    // Check every 2 seconds
    syncTimer.current = setInterval(() => {
      checkAndSync();
    }, 2000);

    console.log("👁️  Sync monitor started");
  }, [checkAndSync]);

  const stopSyncMonitor = useCallback(() => {
    if (syncTimer.current) {
      clearInterval(syncTimer.current);
      syncTimer.current = null;
      console.log("👁️  Sync monitor stopped");
    }
  }, []);

  const getStats = useCallback(() => {
    return {
      ...eventQueue.current.getStats(),
      syncStatus,
    };
  }, [syncStatus]);

  const clear = useCallback(() => {
    eventQueue.current.clear();
    stopSyncMonitor();
    setSyncStatus({
      syncing: false,
      lastSyncTime: null,
      failedAttempts: 0,
    });
  }, [stopSyncMonitor]);

  useEffect(() => {
    return () => {
      stopSyncMonitor();
    };
  }, [stopSyncMonitor]);

  return {
    initialize,
    processEvent,
    requestMissingEvents,
    requestFullSync, // NEW
    startSyncMonitor,
    stopSyncMonitor,
    checkAndSync,
    getStats,
    clear,
    syncStatus, // NEW
  };
}
