import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id:           string;
  email:        string;
  full_name:    string;
  role:         "admin" | "pm" | "devops" | "developer" | "viewer";
  avatar_url:   string | null;
  is_active:    boolean;
}

interface AuthState {
  user:         AuthUser | null;
  accessToken:  string | null;
  refreshToken: string | null;
  setTokens:    (access: string, refresh: string) => void;
  setUser:      (user: AuthUser) => void;
  logout:       () => void;
  isAdmin:      () => boolean;
  canManage:    () => boolean;
  canReveal:    () => boolean;
  canEditCreds: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,

      setTokens: (access, refresh) => {
        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);
        set({ accessToken: access, refreshToken: refresh });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, accessToken: null, refreshToken: null });
      },

      isAdmin:      () => get().user?.role === "admin",
      canManage:    () => ["admin", "pm"].includes(get().user?.role ?? ""),
      canReveal:    () => ["admin", "pm", "devops", "developer"].includes(get().user?.role ?? ""),
      canEditCreds: () => get().user?.role === "admin",
    }),
    {
      name: "key-guard-auth",
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }),
    }
  )
);
