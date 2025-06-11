import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, WifiOff, Wifi } from 'lucide-react';
import { ConnectivityLevel } from '@shared/types';
import { X } from 'lucide-react';

interface ConnectivityBannerProps {
  level: ConnectivityLevel;
}

const ConnectivityBanner: React.FC<ConnectivityBannerProps> = ({ level }) => {
  const [visible, setVisible] = useState(false); // Start hidden by default
  const [message, setMessage] = useState<{
    title: string;
    description: string;
    isOffline: boolean;
  } | null>(null);
  
  // Track the last shown notification type to prevent rapid toggling
  const lastNotificationRef = useRef<{ type: string; timestamp: number }>({
    type: '',
    timestamp: 0
  });
  
  // Flag to track if this is the first render
  const isFirstRender = useRef(true);
  
  // Close the banner
  const handleClose = () => {
    setVisible(false);
  };
  
  // Set appropriate message based on connectivity level
  useEffect(() => {
    // Skip notification on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      
      // Just initialize the notification type without showing the banner
      const initialType = level === ConnectivityLevel.OFFLINE ? 'offline' : 'online';
      lastNotificationRef.current = { 
        type: initialType, 
        timestamp: Date.now() 
      };
      return;
    }
    
    // Only update if there has been at least 2 seconds since the last notification
    // to prevent unstable notification flashing
    const now = Date.now();
    const notificationType = level === ConnectivityLevel.OFFLINE ? 'offline' : 'online';
    const isDifferentType = lastNotificationRef.current.type !== notificationType;
    const timeSinceLastChange = now - lastNotificationRef.current.timestamp;
    
    if (isDifferentType || timeSinceLastChange > 2000) {
      if (level === ConnectivityLevel.OFFLINE) {
        setMessage({
          title: "You are offline",
          description: "Your critical data is still accessible. Changes will sync when you are back online.",
          isOffline: true
        });
        lastNotificationRef.current = { type: 'offline', timestamp: now };
      } else {
        setMessage({
          title: "You are back online",
          description: "All features are now available. Your data will sync automatically.",
          isOffline: false
        });
        lastNotificationRef.current = { type: 'online', timestamp: now };
        
        // Auto-hide the online notification after 5 seconds
        setTimeout(() => {
          setVisible(false);
        }, 5000);
      }
      
      // Only show the notification when connectivity actually changes
      // (not on initial load)
      if (isDifferentType) {
        setVisible(true);
      }
    }
  }, [level]);
  
  if (!message || !visible) {
    return null;
  }
  
  return (
    <Alert 
      className={`relative m-2 ${message.isOffline ? 'bg-destructive text-destructive-foreground' : 'bg-green-50'}`}
    >
      <button 
        onClick={handleClose}
        className="absolute top-2 right-2 text-current opacity-70 hover:opacity-100"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
      {message.isOffline ? (
        <WifiOff className="h-4 w-4" />
      ) : (
        <Wifi className="h-4 w-4 text-green-500" />
      )}
      <AlertTitle>{message.title}</AlertTitle>
      <AlertDescription>
        {message.description}
      </AlertDescription>
    </Alert>
  );
};

export { ConnectivityBanner };