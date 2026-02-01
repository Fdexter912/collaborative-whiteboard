// client/src/hooks/useSocket.js
import { useEffect, useState, useRef } from 'react';
import socketService from '../services/socket';

/**
 * useSocket Hook
 * 
 * Manages WebSocket connection state in React components.
 */
export function useSocket(serverUrl = null) {
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Connect to server
    socketService.connect(serverUrl);

    // Listen for connection status changes
    const unsubscribeStatus = socketService.on('connection.status', ({ connected, socketId }) => {
      console.log('🔌 Connection status changed:', { connected, socketId });
      setConnected(connected);
      setSocketId(socketId || null);
      
      if (connected) {
        setError(null);
      }
    });

    // Listen for connection errors
    const unsubscribeError = socketService.on('connection.error', ({ error }) => {
      console.error('❌ Connection error:', error);
      setError(error?.message || 'Connection error');
    });

    // Listen for connection failures
    const unsubscribeFailed = socketService.on('connection.failed', () => {
      console.error('❌ Connection failed after retries');
      setError('Failed to connect after multiple attempts');
    });

    return () => {
      unsubscribeStatus();
      unsubscribeError();
      unsubscribeFailed();
    };
  }, [serverUrl]);

  return {
    connected,
    socketId,
    error,
    socket: socketService
  };
}

/**
 * useRoom Hook - COMPLETELY REWRITTEN
 * 
 * Manages room lifecycle and state synchronization.
 */
export function useRoom(roomId, userId) {
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [boardState, setBoardState] = useState(null);
  const [error, setError] = useState(null);
  
  const { socket, connected } = useSocket();
  const isMounted = useRef(true);
  const hasAttemptedJoin = useRef(false);

  // Track mounted state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Join room when connected
  useEffect(() => {
    // Reset if roomId or userId changes
    if (!roomId || !userId) {
      setJoined(false);
      setLoading(false);
      setClients([]);
      setBoardState(null);
      setError(null);
      hasAttemptedJoin.current = false;
      return;
    }

    // Don't join if not connected
    if (!connected) {
      console.log('⏳ Waiting for connection before joining room...');
      return;
    }

    // Don't join if already attempted (prevent double join)
    if (hasAttemptedJoin.current) {
      console.log('⏭️ Already attempted to join room, skipping');
      return;
    }

    hasAttemptedJoin.current = true;
    setLoading(true);
    setError(null);

    console.log(`🚪 Attempting to join room: ${roomId} as ${userId}`);

    socketService.joinRoom(roomId, userId)
      .then((data) => {
        console.log('✅ Successfully joined room:', data);
        
        if (!isMounted.current) {
          console.log('⚠️ Component unmounted, ignoring join response');
          return;
        }

        setJoined(true);
        setLoading(false);
        setClients(data.clients || []);
        setBoardState(data.boardState || { strokes: [], textBlocks: [] });
        setError(null);
      })
      .catch((err) => {
        console.error('❌ Failed to join room:', err);
        
        if (!isMounted.current) return;

        setJoined(false);
        setLoading(false);
        setError(err.message || 'Failed to join room');
        hasAttemptedJoin.current = false; // Allow retry
      });

    // Cleanup: reset join attempt flag if roomId/userId changes
    return () => {
      hasAttemptedJoin.current = false;
    };
  }, [connected, roomId, userId, socket]);

  // Listen for user joined events
  useEffect(() => {
    if (!joined) return;

    console.log('👂 Listening for user.joined events');

    const unsubscribe = socketService.on('user.joined', (data) => {
      console.log('👤 User joined:', data);
      if (isMounted.current && data.clients) {
        setClients(data.clients);
      }
    });

    return unsubscribe;
  }, [joined]);

  // Listen for user left events
  useEffect(() => {
    if (!joined) return;

    console.log('👂 Listening for user.left events');

    const unsubscribe = socketService.on('user.left', (data) => {
      console.log('👋 User left:', data);
      if (isMounted.current && data.clients) {
        setClients(data.clients);
      }
    });

    return unsubscribe;
  }, [joined]);

  return {
    joined,
    loading,
    clients,
    boardState,
    error
  };
}

/**
 * useSocketEvent Hook
 * 
 * Subscribe to a socket event with automatic cleanup.
 */
export function useSocketEvent(event, handler, deps = []) {
  const handlerRef = useRef(handler);

  // Update ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    // Wrapper to always call latest handler
    const eventHandler = (...args) => {
      handlerRef.current(...args);
    };

    const unsubscribe = socketService.on(event, eventHandler);

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}