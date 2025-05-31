import { useEffect, useState } from 'react';
import { createHapticFeedback, createMenuFeedback } from '../lib/hapticFeedback';

// Websocket connection for real-time feature usage tracking
let socket: WebSocket | null = null;
let keepGoingSessionStartTime: number | null = null;
let keepGoingActiveTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 4000; // 4 seconds between reconnection attempts

/**
 * Initializes the WebSocket connection for Keep Going feature monitoring
 */
export function initializeKeepGoingMonitor(userId: number) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return; // Already connected
  }
  
  // Create WebSocket connection
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  console.log('Connecting to MCP WebSocket:', wsUrl);
  socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log('MCP WebSocket connection established');
    reconnectAttempts = 0;
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Handle specialized Keep Going recommendations
      if (data.type === 'keep_going_recommendation') {
        // Show recommendation in UI
        const recommendationEvent = new CustomEvent('keepGoingRecommendation', {
          detail: data.recommendation
        });
        window.dispatchEvent(recommendationEvent);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };
  
  socket.onerror = (error) => {
    console.error('MCP WebSocket error:', error);
  };
  
  socket.onclose = () => {
    console.log('MCP WebSocket connection closed');
    
    // Attempt to reconnect if not at max attempts
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Attempting to reconnect to MCP in ${RECONNECT_DELAY}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      
      setTimeout(() => {
        initializeKeepGoingMonitor(userId);
      }, RECONNECT_DELAY);
    } else {
      console.log('Maximum reconnection attempts reached');
    }
  };
}

/**
 * Records Keep Going feature usage via WebSocket
 */
export function recordKeepGoingUsage(userId: number, duration?: number) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'record_feature_usage',
      userId,
      featureName: 'keep-going',
      metadata: duration ? { duration } : undefined
    }));
    
    console.log('Recorded Keep Going feature usage');
  } else {
    console.warn('WebSocket not connected, reconnecting...');
    initializeKeepGoingMonitor(userId);
    
    // Retry after a short delay
    setTimeout(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'record_feature_usage',
          userId,
          featureName: 'keep-going',
          metadata: duration ? { duration } : undefined
        }));
      }
    }, 1000);
  }
}

/**
 * Starts tracking an active Keep Going session
 */
export function startKeepGoingSession(userId: number) {
  // Create haptic feedback when starting session (vibration + sound for 2 seconds)
  createHapticFeedback(2000);
  
  // Record the start of the session
  keepGoingSessionStartTime = Date.now();
  
  // Record initial usage
  recordKeepGoingUsage(userId);
  
  // Set up timer to record ongoing usage every 30 seconds for long sessions
  keepGoingActiveTimer = setInterval(() => {
    if (keepGoingSessionStartTime) {
      const sessionDuration = Math.floor((Date.now() - keepGoingSessionStartTime) / 1000);
      recordKeepGoingUsage(userId, sessionDuration);
    }
  }, 30000); // Record ongoing usage every 30 seconds
}

/**
 * Ends tracking for an active Keep Going session
 */
export function endKeepGoingSession(userId: number) {
  if (keepGoingSessionStartTime) {
    // Calculate session duration in seconds
    const sessionDuration = Math.floor((Date.now() - keepGoingSessionStartTime) / 1000);
    
    // Record final usage with duration
    recordKeepGoingUsage(userId, sessionDuration);
    
    // Reset tracking
    keepGoingSessionStartTime = null;
  }
  
  // Clear the active timer if it exists
  if (keepGoingActiveTimer) {
    clearInterval(keepGoingActiveTimer);
    keepGoingActiveTimer = null;
  }
}

/**
 * React hook for Keep Going feature monitoring
 */
export function useKeepGoingMonitor(userId: number) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  // Initialize WebSocket connection
  useEffect(() => {
    initializeKeepGoingMonitor(userId);
    
    // Listen for recommendation events
    const handleRecommendation = (event: CustomEvent) => {
      setRecommendations(prev => [event.detail, ...prev]);
    };
    
    window.addEventListener('keepGoingRecommendation', handleRecommendation as EventListener);
    
    return () => {
      window.removeEventListener('keepGoingRecommendation', handleRecommendation as EventListener);
      
      // Clean up session if component unmounts during active session
      if (keepGoingSessionStartTime) {
        endKeepGoingSession(userId);
      }
    };
  }, [userId]);
  
  return {
    startKeepGoingSession: () => startKeepGoingSession(userId),
    endKeepGoingSession: () => endKeepGoingSession(userId),
    recommendations,
    clearRecommendations: () => setRecommendations([])
  };
}