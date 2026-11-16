import { shallowRef } from 'vue'

export type PreferenceTab =
  'appearance' | 'layout' | 'shortcuts' | 'general' | 'extensions'

/**
 * The tab a caller wants the preferences drawer to show next. The drawer is
 * an async component, so a one-off event sent before its first mount was
 * lost; it reads this ref when it mounts and clears it once applied.
 */
export const requestedPreferencesTab = shallowRef<PreferenceTab>()
