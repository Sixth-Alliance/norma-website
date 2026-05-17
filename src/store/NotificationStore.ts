import { create } from "zustand";
import { getUnreadNotificationCount } from "@/src/app/api/action";
import { logger } from "@/src/utils/logger";

export interface NotificationState {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  fetchUnreadCount: () => Promise<void>;
  decrement: (n?: number) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  setUnreadCount: (n: number) => set({ unreadCount: n }),
  fetchUnreadCount: async () => {
    try {
      const { count } = await getUnreadNotificationCount();
      set({ unreadCount: count || 0 });
    } catch (e) {
      // keep previous value on error
      logger.error("Failed to fetch unread notification count:", e);
    }
  },
  decrement: (n = 1) => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - n) })),
}));

export default useNotificationStore;
