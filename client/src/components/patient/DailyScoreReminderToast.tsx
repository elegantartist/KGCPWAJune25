import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Clock, Heart } from 'lucide-react';

interface DailyScoreReminderToastProps {
  userId: number;
  enabled?: boolean;
}

/**
 * Component that checks for 7:00 PM daily score reminders
 * Shows a toast notification if the patient hasn't submitted scores
 */
export function DailyScoreReminderToast({ userId, enabled = true }: DailyScoreReminderToastProps) {
  const { toast } = useToast();
  const [hasShownTodaysReminder, setHasShownTodaysReminder] = useState(false);

  useEffect(() => {
    if (!enabled || !userId) return;

    const checkForReminder = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentHour = now.getHours();
      
      // Only show reminder at or after 7:00 PM
      if (currentHour < 19) return;
      
      // Check if we've already shown today's reminder
      const reminderKey = `reminder-shown-${today}`;
      const shownToday = localStorage.getItem(reminderKey);
      
      if (shownToday || hasShownTodaysReminder) return;
      
      // Check if user has submitted scores today
      const lastSubmitDate = localStorage.getItem('lastScoreSubmitDate');
      const hasSubmittedToday = lastSubmitDate === today;
      
      if (!hasSubmittedToday) {
        // Show reminder toast
        toast({
          title: "Daily Health Scores Reminder",
          description: "Don't forget to submit your daily health scores! It only takes 2 minutes and helps track your progress.",
          duration: 10000, // Show for 10 seconds
          action: (
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-sm">KGC cares about your health</span>
            </div>
          ),
        });
        
        // Mark reminder as shown for today
        localStorage.setItem(reminderKey, 'true');
        setHasShownTodaysReminder(true);
        
        console.log(`[7PM Reminder] Displayed daily score reminder for user ${userId}`);
      }
    };
    
    // Check immediately if it's after 7 PM
    checkForReminder();
    
    // Set up interval to check every 15 minutes
    const interval = setInterval(checkForReminder, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [userId, enabled, toast, hasShownTodaysReminder]);

  // Reset the daily flag at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const midnightTimeout = setTimeout(() => {
      setHasShownTodaysReminder(false);
      // Clean up old reminder flags
      const today = new Date().toISOString().split('T')[0];
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('reminder-shown-') && !key.includes(today)) {
          localStorage.removeItem(key);
        }
      });
    }, msUntilMidnight);
    
    return () => clearTimeout(midnightTimeout);
  }, []);

  // This component doesn't render anything visible
  return null;
}