export const APP_META = {
  name: 'motor',
  shortName: 'M',
  description: 'Focused operations, clear permissions, reliable auditing.'
} as const

export const UI_PREFERENCES_STORAGE_KEY = 'motor-admin-ui-preferences'
export const LOCK_SCREEN_STORAGE_KEY = 'motor-admin-lock-screen'
export const TABS_STORAGE_KEY = 'motor-admin-tabs'

/** Preserve deployment names while mapping previous default brands to motor. */
export function resolveAppName(name?: string): string {
  const value = name?.trim()
  if (!value || /^(?:motor(?: admin)?|go[- ]admin(?:\s*(?:后台)?管理系统)?)$/i.test(value)) {
    return APP_META.name
  }
  return value
}
