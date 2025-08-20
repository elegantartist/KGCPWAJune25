import { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectivityLevel } from '@/../../shared/types';
import { useSimpleToast } from '@/hooks/simple-toast';

/**
 * Robust connectivity hook for reliable offline functionality
 * 
 * This implementation focuses on stability and reliable offline support
 * for critical patient-facing features like self-scoring and motivational content
 */
export function useConnectivity() {
  const { toast } = useSimpleToast();
  const [connectivityLevel, setConnectivityLevel] = useState<ConnectivityLevel>(
    navigator.onLine ? ConnectivityLevel.FULL : ConnectivityLevel.OFFLINE
  );
  
  // Keep a reference to the original fetch function
  const originalFetch = useRef<typeof window.fetch | null>(null);
  
  // Initialize the original fetch reference
  useEffect(() => {
    if (!originalFetch.current) {
      originalFetch.current = window.fetch;
    }
  }, []);
  
  // Function to check if a URL should be cached for offline use
  const shouldCacheUrl = useCallback((url: string): boolean => {
    // Always cache critical patient resources
    const criticalPaths = [
      '/api/patient/scores',
      '/api/patient/profile', 
      '/api/patient/care-plan',
      '/api/patient/motivational-images',
      '/api/patient/progress',
      '/api/patient/badges',
      '/api/health-prompts',
      '/api/motivational-responses'
    ];
    
    return criticalPaths.some(path => url.includes(path));
  }, []);
  
  // Install a fetch interceptor with simplified but robust caching
  useEffect(() => {
    if (!originalFetch.current) return;
    
    // Create a wrapper around fetch that handles connectivity issues
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      // Extract URL
      const url = typeof input === 'string' 
        ? input 
        : input instanceof URL 
          ? input.toString() 
          : input instanceof Request 
            ? input.url 
            : '';
      
      // For offline mode, use cached data when available
      if (connectivityLevel === ConnectivityLevel.OFFLINE) {
        // Check if we have a cached response for this URL in localStorage
        const cacheKey = `kgc_cache_${url}`;
        const cachedResponse = localStorage.getItem(cacheKey);
        
        if (cachedResponse) {
          console.log(`[Connectivity] Using cached response for: ${url}`);
          // Return the cached response
          return new Response(cachedResponse, {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-From-Cache': 'true' }
          });
        }
        
        // For patient self-scoring, allow offline data to be stored locally
        if (url.includes('/api/patient/scores') && init?.method === 'POST') {
          try {
            // Store the submission in a pending queue
            const pendingSubmissions = JSON.parse(localStorage.getItem('kgc_pending_submissions') || '[]');
            
            // Get the request body
            const body = init.body instanceof FormData 
              ? Object.fromEntries(Array.from(init.body.entries()))
              : typeof init.body === 'string' 
                ? JSON.parse(init.body) 
                : {};
            
            // Add timestamp for later submission
            pendingSubmissions.push({
              url,
              body,
              timestamp: new Date().toISOString(),
              method: init.method
            });
            
            // Store for later synchronization
            localStorage.setItem('kgc_pending_submissions', JSON.stringify(pendingSubmissions));
            
            // Return success response to prevent app errors
            return new Response(JSON.stringify({
              success: true,
              message: 'Your scores have been saved and will be synchronized when you are back online.',
              offline: true,
              pendingSync: true
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('Error storing offline submission:', error);
          }
        }
        
        // Special case for the chatbot when offline - return supportive cached responses
        if (url.includes('/api/mcp/generate')) {
          // Provide offline-friendly supportive response for the chatbot
          const offlineResponses = [
            "I notice you are currently offline. I am still here to chat and provide support. What is on your mind today?",
            "You appear to be offline right now, but I can still help with basic support and guidance. How are you feeling?",
            "While offline, I can still discuss your recent progress and help you think through any challenges you are facing.",
            "Even though you are offline, we can still have a meaningful conversation about your health goals and strategies."
          ];
          
          const randomResponse = offlineResponses[Math.floor(Math.random() * offlineResponses.length)];
          
          return new Response(JSON.stringify({
            primaryResponse: randomResponse,
            provider: "local",
            alternativeResponses: [],
            evaluationSummary: "Offline response",
            allResponsesValid: true,
            offline: true
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // For motivational images, provide access to the locally stored ones
        if (url.includes('/api/patient/motivational-images')) {
          const cachedImages = localStorage.getItem('kgc_motivational_images');
          if (cachedImages) {
            return new Response(cachedImages, {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'X-From-Cache': 'true' }
            });
          }
        }
        
        // For other requests that we can't serve offline, return an appropriate error
        return new Response(JSON.stringify({
          error: 'You are currently offline',
          offline: true,
          url: url,
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      try {
        // For online mode, proceed with the fetch but cache critical resources
        const response = await originalFetch.current!(input, init);
        
        // Don't cache failed responses
        if (!response.ok) {
          return response;
        }
        
        // Clone the response so we can read it twice
        const clonedResponse = response.clone();
        
        // Only cache GET requests for critical patient resources
        if (init?.method !== 'POST' && init?.method !== 'PUT' && init?.method !== 'DELETE' && shouldCacheUrl(url)) {
          try {
            const responseData = await clonedResponse.text();
            if (responseData) {
              // Cache the response for offline use
              const cacheKey = `kgc_cache_${url}`;
              localStorage.setItem(cacheKey, responseData);
              
              // For motivational images, maintain a special cache
              if (url.includes('/api/patient/motivational-images')) {
                localStorage.setItem('kgc_motivational_images', responseData);
              }
            }
          } catch (cacheError) {
            console.error('Error caching response:', cacheError);
          }
        }
        
        // Process any pending submissions if we are back online
        if (connectivityLevel === ConnectivityLevel.FULL && url.includes('/api/sync')) {
          try {
            const pendingSubmissions = JSON.parse(localStorage.getItem('kgc_pending_submissions') || '[]');
            if (pendingSubmissions.length > 0) {
              // Process in background to avoid blocking
              setTimeout(async () => {
                const successfulSubmissions = [];
                
                for (const submission of pendingSubmissions) {
                  try {
                    // Attempt to submit
                    await originalFetch.current!(submission.url, {
                      method: submission.method,
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(submission.body)
                    });
                    successfulSubmissions.push(submission);
                  } catch (error) {
                    console.error('Error syncing submission:', error);
                  }
                }
                
                // Remove successful submissions
                const remaining = pendingSubmissions.filter(
                  sub => !successfulSubmissions.includes(sub)
                );
                localStorage.setItem('kgc_pending_submissions', JSON.stringify(remaining));
                
                // Notify user if we synced data
                if (successfulSubmissions.length > 0) {
                  toast({
                    title: "Data synchronized",
                    description: `Successfully synced ${successfulSubmissions.length} offline submissions.`,
                    variant: "default",
                  });
                }
              }, 100);
            }
          } catch (error) {
            console.error('Error processing pending submissions:', error);
          }
        }
        
        return response;
      } catch (error) {
        console.error('Fetch error:', error);
        
        // If we get a network error and have a cached version, return that
        const cacheKey = `kgc_cache_${url}`;
        const cachedResponse = localStorage.getItem(cacheKey);
        
        if (cachedResponse) {
          console.log(`[Connectivity] Network error, falling back to cached response for: ${url}`);
          // Update connectivity since we failed to connect
          setConnectivity(ConnectivityLevel.OFFLINE);
          
          return new Response(cachedResponse, {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              'X-From-Cache': 'true',
              'X-Fallback': 'network-error'
            }
          });
        }
        
        // Re-throw the error if we have no cached response
        throw error;
      }
    };
    
    // Clean up function to restore original fetch
    return () => {
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
      }
    };
  }, [connectivityLevel, shouldCacheUrl, toast]);
  
  // Tracker for last notification timestamp to prevent duplicates
  const lastNotificationRef = useRef<{time: number, type: string}>({time: 0, type: ''});
  
  // Function to update the connectivity level with user notification
  const setConnectivity = useCallback((level: ConnectivityLevel) => {
    const previousLevel = connectivityLevel;
    
    // Don't update if the level is the same
    if (level === previousLevel) return;
    
    // Update state and storage
    setConnectivityLevel(level);
    localStorage.setItem('kgc_connectivity_level', level.toString());
    
    // Prevent duplicate notifications (at least 5 seconds apart)
    const now = Date.now();
    const notificationType = level === ConnectivityLevel.OFFLINE ? 'offline' : 'online';
    const timeSinceLastNotification = now - lastNotificationRef.current.time;
    const isSameNotificationType = lastNotificationRef.current.type === notificationType;
    
    // Only show toast if it's been at least 5 seconds since last notification of same type
    if (timeSinceLastNotification > 5000 || !isSameNotificationType) {
      // Show toast notification for significant connectivity changes
      if (level === ConnectivityLevel.OFFLINE) {
        toast({
          title: "You are offline",
          description: "Your critical data is still accessible. Changes will sync when you are back online.",
          variant: "destructive",
        });
        // Update last notification timestamp and type
        lastNotificationRef.current = {time: now, type: 'offline'};
      } else if (level === ConnectivityLevel.FULL && previousLevel === ConnectivityLevel.OFFLINE) {
        toast({
          title: "You are back online",
          description: "All features are now available. Your data will sync automatically.",
          variant: "default",
        });
        // Update last notification timestamp and type
        lastNotificationRef.current = {time: now, type: 'online'};
        
        // Auto-sync data when coming back online
        fetch('/api/sync', { method: 'POST' }).catch(() => {}); // Ignore errors
      }
    }
  }, [connectivityLevel, toast]);
  
  // Automatic connectivity detection
  useEffect(() => {
    const handleOnline = () => setConnectivity(ConnectivityLevel.FULL);
    const handleOffline = () => setConnectivity(ConnectivityLevel.OFFLINE);
    
    // Set initial state WITHOUT showing notifications
    if (navigator.onLine) {
      // Just set the state without notification on initial load
      setConnectivityLevel(ConnectivityLevel.FULL);
      localStorage.setItem('kgc_connectivity_level', ConnectivityLevel.FULL.toString());
    } else {
      // Just set the state without notification on initial load
      setConnectivityLevel(ConnectivityLevel.OFFLINE);
      localStorage.setItem('kgc_connectivity_level', ConnectivityLevel.OFFLINE.toString());
    }
    
    // Check for pending submissions when coming back online
    if (navigator.onLine) {
      try {
        const pendingSubmissions = JSON.parse(localStorage.getItem('kgc_pending_submissions') || '[]');
        if (pendingSubmissions.length > 0) {
          // Trigger a sync request in the background
          fetch('/api/sync', { method: 'POST' }).catch(() => {}); // Ignore errors
        }
      } catch (error) {
        console.error('Error checking pending submissions:', error);
      }
    }
    
    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setConnectivity]);
  
  // Simplified feature availability check for healthcare applications
  const isFeatureAvailable = useCallback((
    feature: string,
    offlineSupported: boolean = false
  ): { available: boolean; message: string } => {
    // Healthcare features are always available when online
    if (connectivityLevel === ConnectivityLevel.ONLINE || offlineSupported) {
      return { available: true, message: '' };
    }
    
    return { 
      available: false,
      message: `${feature} requires an internet connection. Please check your connection and try again.`
    };
  }, [connectivityLevel]);
  
  return {
    connectivityLevel,
    setConnectivity,
    isFeatureAvailable,
    isOffline: connectivityLevel === ConnectivityLevel.OFFLINE,
    isMinimal: false, // No longer used but kept for API compatibility
    isFunctional: false, // No longer used but kept for API compatibility
    isFull: connectivityLevel === ConnectivityLevel.FULL,
  };
}