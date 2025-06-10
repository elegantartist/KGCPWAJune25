// src/stores/notificationStore.ts
import { create } from 'zustand';

interface NotificationState {
  hasNewChatMessages: boolean;
  pendingMessageCount: number;
  setHasNewChatMessages: (hasNew: boolean) => void;
  setPendingMessageCount: (count: number) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  hasNewChatMessages: false,
  pendingMessageCount: 0,
  setHasNewChatMessages: (hasNew) => set({ hasNewChatMessages: hasNew }),
  setPendingMessageCount: (count) => set({ pendingMessageCount: count }),
  clearNotifications: () => set({ hasNewChatMessages: false, pendingMessageCount: 0 }),
}));