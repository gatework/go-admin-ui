import { defineStore } from 'pinia'
import defaults from '@/config/preferences.json'
import { THEME_PRESETS, resolveThemeColor } from '@/config/theme-presets'
import { isOptionalExternalUrl } from '@/utils/external-url'
import { applyColorScheme, resolvesDark, storedScheme } from '@/utils/color-scheme'
import { applyThemeColor } from '@/utils/theme-color'
import { useSettingsStore } from './settings'
import { useAppStore } from './app'
import type { AppState, UiPreferences } from '@/types/preferences'

export const PREFERENCES_KEY = 'motor-admin-ui-preferences'
let removeSystemListener: (() => void) | undefined
const transient = new Set(['globalSettings', 'device', 'systemDark'])
const enums: Record<string, readonly unknown[]> = {
  theme: ['light', 'dark', 'system'], density: ['comfortable', 'compact'],
  layoutMode: ['vertical', 'horizontal', 'content-fullscreen'], contentWidth: ['fluid', 'fixed'],
  breadcrumbStyle: ['normal', 'background'], tabStyle: ['chrome', 'card', 'plain'],
  themePreset: THEME_PRESETS.map(item => item.value), radius: [0, 0.25, 0.5, 0.75, 1],
  device: ['desktop', 'mobile']
}
const ranges: Record<string, [number, number]> = { fontSize: [12, 18], menuWidth: [180, 360], tabMaxCount: [0, 30], watermarkOpacity: [0.04, 0.24] }
function valid(key: string, value: unknown): boolean {
  if (!Object.hasOwn(defaults, key)) return false
  if (enums[key]) return enums[key].includes(value)
  if (ranges[key]) return typeof value === 'number' && Number.isFinite(value) && value >= ranges[key][0] && value <= ranges[key][1] && (key === 'watermarkOpacity' || Number.isInteger(value))
  if (key === 'customThemeColor') return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)
  if (key === 'copyrightCompanyUrl') return isOptionalExternalUrl(value)
  if (key === 'timeZone') {
    try { if (typeof value !== 'string') return false; new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false }
  }
  const fallback = defaults[key as keyof typeof defaults]
  if (typeof fallback === 'boolean') return typeof value === 'boolean'
  return typeof value === 'string' && value.length <= (key === 'watermarkText' ? 120 : 240)
}
function clean(value: unknown, persisted = false): Partial<AppState> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => !(persisted && transient.has(key)) && valid(key, item)))
}

export const usePreferencesStore = defineStore('preferences', {
  state: (): AppState & { systemDark: boolean } => ({ ...defaults, systemDark: resolvesDark('system') } as AppState & { systemDark: boolean }),
  getters: {
    darkMode: state => state.theme === 'dark' || (state.theme === 'system' && state.systemDark),
    componentSize: state => state.density === 'compact' ? 'small' as const : 'medium' as const
  },
  actions: {
    hydratePreferences() {
      // A previous explicit colour-scheme remains authoritative during migration.
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
      const app = useAppStore()
      app.sidebar.opened = !this.menuCollapse
    },
    exportPreferences(): UiPreferences {
      return Object.fromEntries(Object.entries(this.$state).filter(([key]) => !transient.has(key))) as UiPreferences
    },
    updateSettings(partial: Partial<AppState>, persist = true) {
      const patch = clean(partial)
      this.$patch(patch)
      if (patch.menuCollapse !== undefined) useAppStore().sidebar.opened = !patch.menuCollapse
      this.applyAppearance()
      if (persist) this.persistPreferences()
    },
    persistPreferences() {
      try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.exportPreferences())) } catch { /* Changes still apply in this tab. */ }
    },
    resetPreferences() {
      const open = this.globalSettings
      this.$patch({ ...defaults, globalSettings: open, device: this.device } as AppState)
      useAppStore().sidebar.opened = true
      this.applyAppearance()
      this.persistPreferences()
    },
    toggleTheme() { this.updateSettings({ theme: this.darkMode ? 'light' : 'dark' }) },
    applyAppearance() {
      const settings = useSettingsStore()
      const color = resolveThemeColor(this.themePreset, this.customThemeColor)
      settings.$patch({ colorScheme: this.theme, theme: color, tagsView: this.tabBar, topNav: this.layoutMode === 'horizontal', themeStyle: this.semiDarkSidebar ? 'dark' : 'light' })
      applyColorScheme(this.theme)
      applyThemeColor(color)
      const root = document.documentElement
      root.dataset.density = this.density
      root.style.setProperty('--motor-base-font-size', `${this.fontSize}px`)
      root.style.setProperty('--motor-sidebar-width', `${this.menuWidth}px`)
      for (const [size, multiplier] of Object.entries({ xs: 8, sm: 16, md: 24, lg: 32, xl: 40 })) root.style.setProperty(`--motor-radius-${size}`, `${this.radius * multiplier}px`)
      root.style.setProperty('--ga-header-h', '54px')
      useAppStore().size = this.componentSize
    }
  }
})
