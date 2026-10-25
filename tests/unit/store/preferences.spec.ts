import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePreferencesStore, PREFERENCES_KEY } from '@/stores/preferences'

beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()) })
describe('local UI preferences', () => {
  it('validates persisted values and excludes transient state', () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ fontSize: 99, menuWidth: 300, globalSettings: true, theme: 'dark', copyrightCompanyUrl: 'javascript:alert(1)' }))
    const preferences = usePreferencesStore()
    preferences.hydratePreferences()
    expect(preferences.fontSize).toBe(14)
    expect(preferences.menuWidth).toBe(300)
    expect(preferences.theme).toBe('dark')
    expect(preferences.globalSettings).toBe(false)
    expect(preferences.copyrightCompanyUrl).toBe('')
    preferences.updateSettings({ globalSettings: true, fontSize: 16 })
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)
    expect(saved.fontSize).toBe(16)
    expect(saved.globalSettings).toBeUndefined()
    expect(saved.device).toBeUndefined()
  })
  it('rejects invalid updates and restores defaults and appearance together', () => {
    const preferences = usePreferencesStore()
    preferences.updateSettings({ radius: 1, fontSize: 18, timeZone: 'bad/timezone', menuWidth: -1 })
    expect(preferences.timeZone).toBe('Asia/Hong_Kong')
    expect(preferences.menuWidth).toBe(232)
    expect(document.documentElement.style.getPropertyValue('--motor-base-font-size')).toBe('18px')
    preferences.resetPreferences()
    expect(preferences.fontSize).toBe(14)
    expect(document.documentElement.style.getPropertyValue('--motor-base-font-size')).toBe('14px')
  })
  it('recovers damaged storage and preserves an existing theme choice', () => {
    localStorage.setItem(PREFERENCES_KEY, '{')
    localStorage.setItem('color-scheme', 'dark')
    const preferences = usePreferencesStore()
    expect(() => preferences.hydratePreferences()).not.toThrow()
    expect(preferences.theme).toBe('dark')
  })
})
