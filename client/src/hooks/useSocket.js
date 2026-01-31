// client/src/hooks/useSocket.js
import { useEffect, useState, useCallback, useRef } from 'react';
import socketService from '../services/socket';

/**
 * useSocket Hook
 * 
 * Manages WebSocket connection state in React components.
 * Automatically connects on mount and disconnects on unmount.
 * 
 * @param {string} serverUrl - Optional server URL override
 * @returns {Object} Connection state and socket instance
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
      setConnected(connected);
      setSocketId(socketId || null);
      
      if (connected) {
        setError(null); // Clear errors on successful connection
      }
    });

    // Listen for connection errors
    const unsubscribeError = socketService.on('connection.error', ({ error }) => {
      setError(error?.message || 'Connection error');
    });

    // Listen for connection failures
    const unsubscribeFailed = socketService.on('connection.failed', () => {
      setError('Failed to connect after multiple attempts');
    });

    // Cleanup on unmount
    return () => {
      unsubscribeStatus();
      unsubscribeError();
      unsubscribeFailed();
      // Note: Don't disconnect socket here - it's shared across components
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
 * useRoom Hook
 * 
 * Manages room lifecycle and state synchronization.
 * Automatically joins room when connected and leaves on unmount.
 * 
 * @param {string} roomId - Room identifier (null to not join)
 * @param {string} userId - User identifier (null to not join)
 * @returns {Object} Room state and client list
 */
export function useRoom(roomId, userId) {
  const [joined, setJoined] = useState(false);
  const [clients, setClients] = useState([]);
  const [boardState, setBoardState] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { socket, connected } = useSocket();
  
  // Track if component is mounted (prevent state updates after unmount)
  const isMounted = useRef(true);

  // Join room when connected and credentials are provided
  useEffect(() => {
    if (!connected || !roomId || !userId) {
      return;
    }

    let unsubscribeUserJoined;
    let unsubscribeUserLeft;

    const joinRoomAsync = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await socketService.joinRoom(roomId, userId);
        
        if (isMounted.current) {
          setJoined(true);
          setClients(data.clients || []);
          setBoardState(data.boardState || { strokes: [], textBlocks: [] });
          setLoading(false);
        }

        // Listen for user joined events
        unsubscribeUserJoined = socketService.on('user.joined', ({ clients: updatedClients }) => {
          if (isMounted.current) {
            setClients(updatedClients);
            console.log('👤 User joined room');
          }
        });

        // Listen for user left events
        unsubscribeUserLeft = socketService.on('user.left', ({ clients: updatedClients }) => {
          if (isMounted.current) {
            setClients(updatedClients);
            console.log('👋 User left room');
          }
        });

      } catch (err) {
        if (isMounted.current) {
          setError(err.message || 'Failed to join room');
          setLoading(false);
        }
      }
    };

    joinRoomAsync();

    // Cleanup
    return () => {
      if (unsubscribeUserJoined) unsubscribeUserJoined();
      if (unsubscribeUserLeft) unsubscribeUserLeft();
    };
  }, [connected, roomId, userId, socket]);

  // Track mounted state
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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
 * Useful for listening to custom events in components.
 * 
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Array} deps - Dependency array (like useEffect)
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
  }, [event, ...deps]);
}