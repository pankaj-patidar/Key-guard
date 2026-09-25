import { create } from 'zustand'

interface NotificationState {
  unreadCount: number
  isPanelOpen: boolean
  setUnreadCount: (count: number) => void
  openPanel: () => void
  closePanel: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  isPanelOpen: false,
  setUnreadCount: (count) => set({ unreadCount: count }),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
}))
