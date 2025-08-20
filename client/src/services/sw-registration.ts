// Service Worker Registration for Food Database Offline Functionality
// This service ensures CPD-aligned food data is available offline
// 
// IMPORTANT: This code must be kept in the final version for AWS deployment
// While it may not function fully in development environments like Replit,
// it will provide critical offline capabilities when deployed to production.

export type SwStatusCallback = (status: 'success' | 'error' | 'info', message: string) => void;

// Service worker registration with status reporting to Supervisor Agent
export async function registerServiceWorker(
  onStatusUpdate: SwStatusCallback = () => {}
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    onStatusUpdate('error', 'Service Worker not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    
    onStatusUpdate('success', 'Service Worker registered successfully');
    
    // Set up message event listener
    navigator.serviceWorker.addEventListener('message', (event) => {
      // Handle cache completion messages
      if (event.data && event.data.type === 'CPD_CACHE_COMPLETE') {
        const status = event.data.success ? 'success' : 'error';
        onStatusUpdate(status, event.data.message);
      }
      
      // Handle feature-specific notifications
      if (event.data && event.data.type === 'SW_NOTIFICATION' && event.data.feature === 'food-database') {
        // Log notifications for debugging
        console.log('[SW Notification]', event.data.message);
        
        // Forward status updates through the callback
        const importance = event.data.importance || 'info';
        const status = importance === 'high' ? 'success' : 'info';
        onStatusUpdate(status, event.data.message);
      }
    });
    
    return registration;
  } catch (error) {
    onStatusUpdate('error', `Service Worker registration failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// Trigger caching of food database data for a specific user
export async function cacheFoodDatabaseForUser(
  userId: number,
  onStatusUpdate: SwStatusCallback = () => {}
): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    onStatusUpdate('error', 'Service Worker not supported in this browser');
    return false;
  }

  try {
    // Check if service worker is active
    if (!navigator.serviceWorker.controller) {
      onStatusUpdate('info', 'Service Worker not yet controlling the page, trying to activate');
      
      // Try to get the registration and activate it
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        await registration.active.postMessage({ type: 'ACTIVATE_NOW' });
        
        // Wait for the service worker to take control
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
          
          // Timeout after 3 seconds
          setTimeout(() => resolve(), 3000);
        });
      }
    }

    // Notify that we're starting the cache process
    onStatusUpdate('info', 'Starting to cache food database data for offline access');
    
    // Send message to service worker to cache the data
    navigator.serviceWorker.controller?.postMessage({
      type: 'CACHE_CPDS',
      userId
    });
    
    return true;
  } catch (error) {
    onStatusUpdate('error', `Failed to initiate food database caching: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Check if any food database data is already cached
export async function checkFoodDatabaseCache(
  userId: number,
  onStatusUpdate: SwStatusCallback = () => {}
): Promise<boolean> {
  try {
    // Try to fetch from cache storage
    const cacheName = 'kgc-cpd-cache-v1';
    const cacheKeys = await caches.keys();
    
    if (!cacheKeys.includes(cacheName)) {
      onStatusUpdate('info', 'No food database cache exists yet');
      return false;
    }
    
    const cache = await caches.open(cacheName);
    const cpdResponse = await cache.match(`/api/users/${userId}/cpds`);
    const foodResponse = await cache.match('/api/food-database/cpd-aligned');
    
    const hasCachedData = !!cpdResponse && !!foodResponse;
    
    if (hasCachedData) {
      onStatusUpdate('success', 'Food database data is available for offline use');
    } else {
      onStatusUpdate('info', 'Some food database data may need to be cached');
    }
    
    return hasCachedData;
  } catch (error) {
    onStatusUpdate('error', `Failed to check food database cache: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Force refresh the food database cache
export async function refreshFoodDatabaseCache(
  userId: number,
  onStatusUpdate: SwStatusCallback = () => {}
): Promise<boolean> {
  try {
    // Clear existing cache
    const cacheName = 'kgc-cpd-cache-v1';
    await caches.delete(cacheName);
    
    onStatusUpdate('info', 'Existing food database cache cleared, refreshing data');
    
    // Trigger new cache population
    return await cacheFoodDatabaseForUser(userId, onStatusUpdate);
  } catch (error) {
    onStatusUpdate('error', `Failed to refresh food database cache: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}