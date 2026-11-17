import { useLockScreenStore } from '@/stores/lock-screen'
import { usePreferencesStore } from '@/stores/preferences'
import { requestedPreferenceSection } from '@/components/global-setting/requested-section'

/** Locks the screen, or opens the preferences at the lock section when no password is set yet. */
export function useLockNow() {
  const lock = useLockScreenStore()
  const preferences = usePreferencesStore()
  return () => {
    if (lock.lock()) return
    requestedPreferenceSection.value = 'lock'
    preferences.openSettings()
  }
}
