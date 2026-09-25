import { create } from 'zustand'

interface PublicSettings {
  app_name: string
  app_logo_url: string
  story_points_enabled: boolean
  story_points_scale: string
  default_ticket_priority: string
}

interface SettingsState {
  settings: PublicSettings
  setSettings: (s: PublicSettings) => void
}

const DEFAULTS: PublicSettings = {
  app_name: 'Key Guard',
  app_logo_url: '',
  story_points_enabled: true,
  story_points_scale: '1,2,3,5,8,13,21',
  default_ticket_priority: 'medium',
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULTS,
  setSettings: (settings) => set({ settings }),
}))
