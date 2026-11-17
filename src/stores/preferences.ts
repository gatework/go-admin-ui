import { defineStore } from 'pinia'
import defaults from '@/config/preferences.json'
import { THEME_PRESETS, resolveThemeColor } from '@/config/theme-presets'
import { applyColorScheme, resolvesDark, storedScheme } from '@/utils/color-scheme'
import { applyThemeColor } from '@/utils/theme-color'
import { UI_PREFERENCES_STORAGE_KEY } from '@/config/app-meta'
import type { PreferencesState, UiPreferences } from '@/types/preferences'

export const PREFERENCES_KEY = UI_PREFERENCES_STORAGE_KEY
export const MENU_WIDTH_RANGE = [180, 360] as const
export const FONT_SIZE_RANGE = [12, 18] as const
export const RADIUS_STEPS = [0, 0.25, 0.5, 0.75, 1] as const

/** Session-only keys: never written to storage, never read back from it. */
const transient = new Set(['globalSettings', 'systemDark'])

const enums: Record<string, readonly unknown[]> = {
  theme: ['light', 'dark', 'system'],
  density: ['comfortable', 'compact'],
  layoutMode: ['vertical', 'horizontal'],
  contentWidth: ['fluid', 'fixed'],
  themePreset: THEME_PRESETS.map(item => item.value),
  radius: RADIUS_STEPS
}
const ranges: Record<string, readonly [number, number]> = { fontSize: FONT_SIZE_RANGE, menuWidth: MENU_WIDTH_RANGE }

const isTimeZone = (value: unknown): boolean => {
  if (typeof value !== 'string') return false
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false }
}

/**
 * Whether `value` is acceptable for `key`.
 *
 * Everything that reaches the store passes through here -- updates from the
 * drawer and whatever localStorage holds -- so a key this build no longer has,
 * or a value from an older build, is dropped instead of applied.
 */
function valid(key: string, value: unknown): boolean {
  if (!Object.hasOwn(defaults, key)) return false
  if (enums[key]) return enums[key].includes(value)
  if (ranges[key]) return Number.isInteger(value) && (value as number) >= ranges[key][0] && (value as number) <= ranges[key][1]
  if (key === 'customThemeColor') return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)
  if (key === 'timeZone') return isTimeZone(value)
  return typeof value === typeof defaults[key as keyof typeof defaults]
}

function clean(value: unknown, persisted = false): Partial<PreferencesState> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => !(persisted && transient.has(key)) && valid(key, item)))
}

let removeSystemListener: (() => void) | undefined

/**
 * Appearance and layout preferences: the one store the shell, the drawer and
 * the login toolbar read.
 */
export const usePreferencesStore = defineStore('preferences', {
  state: (): PreferencesState & { systemDark: boolean } => ({ ...(defaults as PreferencesState), systemDark: resolvesDark('system') }),
  getters: {
    darkMode: state => state.theme === 'dark' || (state.theme === 'system' && state.systemDark),
    componentSize: state => state.density === 'compact' ? 'small' as const : 'medium' as const,
    themeColor: state => resolveThemeColor(state.themePreset, state.customThemeColor)
  },
  actions: {
    hydratePreferences() {
      // The colour scheme has its own key, read by index.html before first paint.
      this.theme = storedScheme()
      try { this.$patch(clean(JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}'), true)) } catch { /* Damaged or restricted storage keeps defaults. */ }
      removeSystemListener?.()
      if (typeof window.matchMedia === 'function') {
        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const update = () => { this.systemDark = media.matches; if (this.theme === 'system') this.applyAppearance() }
        media.addEventListener('change', update)
        removeSystemListener = () => media.removeEventListener('change', update)
      }
      this.applyAppearance()
    },
    exportPreferences(): UiPreferences {
      return Object.fromEntries(Object.entries(this.$state).filter(([key]) => !transient.has(key))) as unknown as UiPreferences
    },
    updateSettings(partial: Partial<PreferencesState>, persist = true) {
      this.$patch(clean(partial))
      this.applyAppearance()
      if (persist) this.persistPreferences()
    },
    persistPreferences() {
      try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.exportPreferences())) } catch { /* Changes still apply in this tab. */ }
    },
    resetPreferences() {
      this.$patch({ ...(defaults as PreferencesState), globalSettings: this.globalSettings })
      this.applyAppearance()
      this.persistPreferences()
    },
    toggleTheme() { this.updateSettings({ theme: this.darkMode ? 'light' : 'dark' }) },
    openSettings() { this.globalSettings = true },
    closeSettings() { this.globalSettings = false },
    /** Pushes the stored values onto the document: scheme, accent, density, type and radius. */
    applyAppearance() {
      applyColorScheme(this.theme)
      applyThemeColor(this.themeColor)
      const root = document.documentElement
      root.dataset.density = this.density
      root.style.setProperty('--motor-base-font-size', `${this.fontSize}px`)
      for (const [size, multiplier] of Object.entries({ xs: 8, sm: 16, md: 24, lg: 32, xl: 40 })) root.style.setProperty(`--motor-radius-${size}`, `${this.radius * multiplier}px`)
    }
  }
})
