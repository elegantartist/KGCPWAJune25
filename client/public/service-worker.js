/**
 * KEEP GOING CARE - SERVICE WORKER DEACTIVATION NOTICE
 * ====================================================
 * 
 * This service worker has been PERMANENTLY DISABLED to ensure application stability.
 * 
 * The application now requires a full internet connection to function properly.
 * This change was made after multiple instances of instability and data 
 * inconsistency issues with the previous offline-capable implementation.
 * 
 * PLEASE NOTE: 
 * Any code using service worker caching and offline functionality should be updated
 * to rely on direct API calls instead.
 * 
 * All offline data caching, persistence, and background sync functionality 
 * has been removed from this service worker implementation.
 * 
 * Last Updated: May 02, 2025
 */

// This service worker immediately unregisters itself as soon as it's installed
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation bypassed - offline functionality disabled');
  // Skip waiting to immediately activate and then unregister
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated - performing unregistration and cache cleanup');
  event.waitUntil(
    (async () => {
      // Clear all caches used by previous service worker versions
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('[Service Worker] All caches cleared successfully');
      } catch (error) {
        console.error('[Service Worker] Error clearing caches:', error);
      }
      
      // The service worker will unregister itself
      self.registration.unregister()
        .then(success => {
          console.log('[Service Worker] Unregistration result:', success ? 'successful' : 'failed');
        })
        .catch(error => {
          console.error('[Service Worker] Unregistration error:', error);
        });
    })()
  );
});

// Do not intercept any fetch events - let all network requests go directly through the browser
self.addEventListener('fetch', (event) => {
  // Passthrough - do not intercept any requests
  return;
});

// Respond to messages from the main thread but don't do anything with them
self.addEventListener('message', (event) => {
  // Just respond that the service worker is disabled
  if (event.source && event.source.postMessage) {
    event.source.postMessage({
      type: 'SERVICE_WORKER_DISABLED',
      message: 'The service worker is permanently disabled for application stability. Online connection required.'
    });
  }
});