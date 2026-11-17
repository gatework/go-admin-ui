import { onBeforeUnmount, onMounted } from 'vue'
import { useLockScreenStore } from '@/stores/lock-screen'
import { usePreferencesStore } from '@/stores/preferences'
import { openCommandPalette } from './useCommandPalette'
import { useLockNow } from './useLockNow'
import { useLogout } from './useLogout'

export interface Shortcut {
  /** i18n key naming the action. */
  label: string
  /** Keys as shown to the reader; `Mod` is ⌘ on macOS and Ctrl elsewhere. */
  keys: string[]
}

/** The shortcuts the shell handles, in the order the preferences drawer lists them. */
export const SHORTCUTS: Shortcut[] = [
  { label: 'settings.shortcuts.search', keys: ['Mod', 'K'] },
  { label: 'settings.shortcuts.preferences', keys: ['Mod', ','] },
  { label: 'settings.shortcuts.lock', keys: ['Alt', 'L'] },
  { label: 'settings.shortcuts.logout', keys: ['Alt', 'Q'] }
]

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)
export const keyLabel = (key: string) => key === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : key === 'Alt' && isMac ? '⌥' : key

/** Registers the global shortcuts for as long as the layout is mounted. */
export function useShortcuts() {
  const preferences = usePreferencesStore()
  const lock = useLockScreenStore()
  const lockNow = useLockNow()
  const logout = useLogout()

  const onKeydown = (event: KeyboardEvent) => {
    if (!preferences.shortcutEnabled || lock.locked || event.repeat) return
    const mod = event.metaKey || event.ctrlKey
    // The search opens from anywhere, including a focused input: that is where
    // a keyboard user usually is. The others must not fire while typing.
    const typing = Boolean((event.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]'))
    const action = mod && event.code === 'KeyK'
      ? openCommandPalette
      : typing
        ? undefined
        : mod && event.code === 'Comma'
          ? () => preferences.openSettings()
          : event.altKey && event.code === 'KeyL'
            ? lockNow
            : event.altKey && event.code === 'KeyQ'
              ? logout
              : undefined
    if (!action) return
    event.preventDefault()
    void action()
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
