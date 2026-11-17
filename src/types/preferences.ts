import type { ThemePreset } from '@/config/theme-presets'

export type ThemeMode = 'light' | 'dark' | 'system'
export type DensityMode = 'comfortable' | 'compact'
export type LayoutMode = 'vertical' | 'horizontal'
export type ContentWidthMode = 'fluid' | 'fixed'

/** What the preferences drawer can change. Persisted to localStorage. */
export interface UiPreferences {
  theme: ThemeMode
  themePreset: ThemePreset
  customThemeColor: string
  radius: number
  fontSize: number
  density: DensityMode
  layoutMode: LayoutMode
  contentWidth: ContentWidthMode
  menuCollapse: boolean
  menuWidth: number
  semiDarkSidebar: boolean
  tabBar: boolean
  tabPersist: boolean
  pageTransition: boolean
  dynamicTitle: boolean
  shortcutEnabled: boolean
  timeZone: string
}

/** Preferences plus what only lives for the session. */
export interface PreferencesState extends UiPreferences {
  /** Whether the preferences drawer is open. */
  globalSettings: boolean
}
