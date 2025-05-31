// Service Worker Registration for KGC Progressive Web App
// 
// NOTE: The Service Worker implementation has been completely disabled
// to ensure application stability. The app now requires full internet connectivity.
// 
// This file is being kept as a placeholder for future reference, but all service
// worker functionality has been removed.

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

// Dummy register function that doesn't actually register a service worker
export function register(_config?: Config): void {
  console.log('Service worker registration is disabled to ensure application stability.');
  return;
}

// Special unregister function that will actually attempt to unregister any existing workers
// This helps clean up any previously registered service workers to prevent conflicts
export function unregister(): void {
  if ('serviceWorker' in navigator) {
    // Aggressively unregister all service workers
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log(`Found ${registrations.length} service worker registrations to remove`);
      
      for (const registration of registrations) {
        registration.unregister().then(success => {
          if (success) {
            console.log('Successfully unregistered service worker: ', registration.scope);
          } else {
            console.warn('Failed to unregister service worker: ', registration.scope);
          }
        });
      }
    });
  }
}

// Audio caching functions removed as part of Mood Booster feature removal

// Dummy update function that doesn't actually update any service worker
export function updateServiceWorker(): void {
  console.log('Service worker updates are disabled to ensure application stability.');
  return;
}