import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { OfflineStatus } from '../types';
import { 
  registerServiceWorker, 
  cacheFoodDatabaseForUser, 
  checkFoodDatabaseCache,
  refreshFoodDatabaseCache 
} from '@/services/sw-registration';

interface UseOfflineStorageProps {
  userId: number;
}

export function useOfflineStorage({ userId }: UseOfflineStorageProps) {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>({
    cached: false,
    checking: true,
    caching: false,
    progress: 0,
    statusMessage: 'Checking offline availability...'
  });
  
  // Service worker and cache API detection
  const isServiceWorkerSupported = 'serviceWorker' in navigator;
  const isCacheApiSupported = 'caches' in window;
  
  // Online/offline status detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Service worker registration and offline cache setup
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let registrationComplete = false;
    
    const setupServiceWorker = async () => {
      try {
        // Check if both Service Worker and Cache API are supported
        if (!isServiceWorkerSupported || !isCacheApiSupported) {
          console.log('Service Worker or Cache API not supported in this browser/environment');
          setOfflineStatus(prev => ({
            ...prev,
            checking: false,
            statusMessage: 'Offline access not available in this environment'
          }));
          return;
        }
        
        // Register service worker
        const registration = await registerServiceWorker((status, message) => {
          console.log(`[ServiceWorker] ${status}: ${message}`);
          if (status === 'error') {
            toast({
              title: 'Service Worker Error',
              description: message,
              variant: 'destructive'
            });
            setOfflineStatus(prev => ({
              ...prev,
              checking: false,
              statusMessage: 'Offline access unavailable'
            }));
          }
        });
        
        registrationComplete = true;
        
        // Check if data is already cached
        const isCached = await checkFoodDatabaseCache(userId, (status, message) => {
          console.log(`[Cache Check] ${status}: ${message}`);
        });
        
        setOfflineStatus(prev => ({
          ...prev,
          cached: isCached,
          checking: false,
          statusMessage: isCached 
            ? 'Food database available offline' 
            : 'Food database not yet available offline'
        }));
        
        // If data is not cached and we're online, start caching
        if (!isCached && isOnline) {
          startCaching();
        }
      } catch (error) {
        console.error('Error setting up service worker:', error);
        setOfflineStatus(prev => ({
          ...prev,
          checking: false,
          statusMessage: 'Failed to setup offline access'
        }));
      }
    };
    
    const startCaching = async () => {
      setOfflineStatus(prev => ({
        ...prev,
        caching: true,
        progress: 0,
        statusMessage: 'Preparing food database for offline access...'
      }));
      
      // Simulate progress while caching happens
      progressInterval = setInterval(() => {
        setOfflineStatus(prev => {
          if (prev.progress >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return {
            ...prev,
            progress: Math.min(prev.progress + 5, 95),
            statusMessage: `Caching food database... ${Math.min(prev.progress + 5, 95)}%`
          };
        });
      }, 300);
      
      // Actual caching happens here
      const success = await cacheFoodDatabaseForUser(userId, (status, message) => {
        console.log(`[Food Database Cache] ${status}: ${message}`);
        if (status === 'success') {
          clearInterval(progressInterval);
          setOfflineStatus(prev => ({
            ...prev,
            cached: true,
            caching: false,
            progress: 100,
            statusMessage: 'Food database ready for offline access'
          }));
          
          toast({
            title: 'Food Database Ready Offline',
            description: 'You can now access food recommendations even when offline',
          });
        } else if (status === 'error') {
          clearInterval(progressInterval);
          setOfflineStatus(prev => ({
            ...prev,
            caching: false,
            progress: 0,
            statusMessage: 'Failed to prepare offline access'
          }));
          
          toast({
            title: 'Offline Preparation Failed',
            description: message,
            variant: 'destructive'
          });
        }
      });
      
      if (!success) {
        clearInterval(progressInterval);
        setOfflineStatus(prev => ({
          ...prev,
          caching: false,
          progress: 0,
          statusMessage: 'Failed to prepare offline access'
        }));
      }
    };
    
    // Start the setup process
    setupServiceWorker();
    
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [toast, isServiceWorkerSupported, isCacheApiSupported, userId, isOnline]);
  
  // Function to refresh cache
  const refreshCache = async () => {
    if (!isOnline) {
      toast({
        title: 'Cannot Refresh Offline',
        description: 'Please connect to the internet first',
        variant: 'destructive'
      });
      return;
    }
    
    setOfflineStatus(prev => ({
      ...prev,
      caching: true,
      progress: 0,
      statusMessage: 'Refreshing offline data...'
    }));
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setOfflineStatus(prev => {
        if (prev.progress >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return {
          ...prev,
          progress: Math.min(prev.progress + 10, 95)
        };
      });
    }, 200);
    
    const success = await refreshFoodDatabaseCache(userId, (status, message) => {
      if (status === 'success') {
        clearInterval(progressInterval);
        setOfflineStatus(prev => ({
          ...prev,
          cached: true,
          caching: false,
          progress: 100,
          statusMessage: 'Food database refreshed for offline access'
        }));
        
        toast({
          title: 'Cache Refreshed',
          description: 'Food database has been updated for offline access',
        });
      } else if (status === 'error') {
        clearInterval(progressInterval);
        setOfflineStatus(prev => ({
          ...prev,
          caching: false,
          progress: 0,
          statusMessage: 'Failed to refresh offline data'
        }));
        
        toast({
          title: 'Refresh Failed',
          description: message,
          variant: 'destructive'
        });
      }
    });
    
    if (!success) {
      clearInterval(progressInterval);
      setOfflineStatus(prev => ({
        ...prev,
        caching: false,
        progress: 0,
        statusMessage: 'Failed to refresh offline data'
      }));
    }
  };
  
  return {
    isOnline,
    offlineStatus,
    refreshCache,
    isServiceWorkerSupported,
    isCacheApiSupported
  };
}