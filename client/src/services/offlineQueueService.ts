// src/services/offlineQueueService.ts
import { toast } from '@/hooks/use-toast';
import { useNotificationStore } from '../stores/notificationStore';

interface QueuedMessage {
  id: string;
  text: string;
  sentAt: string;
  userId: number;
  sessionId?: string;
}

class OfflineQueueService {
  private static instance: OfflineQueueService;
  private readonly QUEUE_KEY = 'kgc_offline_message_queue';

  private constructor() {}

  static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  // Add message to offline queue
  addToQueue(message: QueuedMessage): void {
    try {
      const queue = this.getQueue();
      queue.push(message);
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
      
      // Update notification count
      useNotificationStore.getState().setPendingMessageCount(queue.length);
    } catch (error) {
      console.error('Failed to add message to offline queue:', error);
    }
  }

  // Get current queue
  getQueue(): QueuedMessage[] {
    try {
      const queueJson = localStorage.getItem(this.QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('Failed to read offline queue:', error);
      return [];
    }
  }

  // Clear successfully synced messages from queue
  clearSyncedMessagesFromQueue(syncedMessageIds: string[]): void {
    try {
      const queue = this.getQueue();
      const remainingMessages = queue.filter(msg => !syncedMessageIds.includes(msg.id));
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(remainingMessages));
      
      // Update notification count
      useNotificationStore.getState().setPendingMessageCount(remainingMessages.length);
    } catch (error) {
      console.error('Failed to clear synced messages from queue:', error);
    }
  }

  // Sync offline messages when back online
  async syncOfflineMessages(): Promise<void> {
    const queuedMessages = this.getQueue();
    
    if (queuedMessages.length === 0) {
      return;
    }

    try {
      // Use the correct key for the auth token, consistent with the rest of the app.
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/sync-offline-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: queuedMessages }),
      });

      const data = await response.json();

      if (data.success && data.messagesProcessed > 0) {
        // --- NOTIFICATION LOGIC ---

        // 1. Trigger a toast notification.
        toast({
          title: "You're back online!",
          description: `Your ${data.messagesProcessed} message(s) have been answered.`
        });

        // 2. Update a global state to show a notification badge on the chatbot button.
        useNotificationStore.getState().setHasNewChatMessages(true);

        // 3. Clear the successfully synced messages from the local queue.
        const syncedMessageIds = data.syncedMessageIds || queuedMessages.map(msg => msg.id);
        this.clearSyncedMessagesFromQueue(syncedMessageIds);
      }
    } catch (error) {
      console.error("Failed to sync offline messages:", error);
    }
  }

  // Get pending message count
  getPendingCount(): number {
    return this.getQueue().length;
  }

  // Clear all queued messages (for emergency cleanup)
  clearAllMessages(): void {
    localStorage.removeItem(this.QUEUE_KEY);
    useNotificationStore.getState().setPendingMessageCount(0);
  }
}

export const offlineQueueService = OfflineQueueService.getInstance();