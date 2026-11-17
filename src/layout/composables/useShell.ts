import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { MENU_WIDTH_RANGE, usePreferencesStore } from '@/stores/preferences'

/** Below this the rail becomes a drawer over the page. Bootstrap's `lg`. */
export const MOBILE_MAX = 991

const clampWidth = (value: number) => Math.round(Math.min(MENU_WIDTH_RANGE[1], Math.max(MENU_WIDTH_RANGE[0], value)))

/**
 * Shell state shared by the layout, the header and the sidebar: which viewport
 * class we are in, whether the navigation is showing, and how wide it is.
 *
 * Call `watchViewport()` once, from the layout. Everything else is derived, so
 * any shell component can call `useShell()` for the same answers.
 */
export function useShell() {
  const app = useAppStore()
  const preferences = usePreferencesStore()

  const horizontal = computed(() => preferences.layoutMode === 'horizontal' && !app.mobile)
  /** The rail is collapsed to icons. Never on a phone, where it is a full-width drawer. */
  const collapsed = computed(() => !app.mobile && preferences.menuCollapse)
  /** Navigation is on screen: the open drawer on a phone, the expanded rail on a desktop. */
  const navigationOpen = computed(() => app.mobile ? app.drawerOpen : !preferences.menuCollapse)

  const toggleNavigation = () => {
    if (app.mobile) app.toggleDrawer()
    else preferences.updateSettings({ menuCollapse: !preferences.menuCollapse })
  }
  const resizeBy = (delta: number) => preferences.updateSettings({ menuWidth: clampWidth(preferences.menuWidth + delta) })

  /** Drag handler for the rail's edge. Returns a function that ends the drag early. */
  const startResize = (event: PointerEvent) => {
    event.preventDefault()
    const move = (moveEvent: PointerEvent) => preferences.updateSettings({ menuWidth: clampWidth(moveEvent.clientX) }, false)
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      preferences.persistPreferences()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return end
  }

  return { app, preferences, horizontal, collapsed, navigationOpen, toggleNavigation, resizeBy, startResize }
}

/** Keeps `app.device` in step with the viewport and closes the drawer on navigation. */
export function watchViewport() {
  const app = useAppStore()
  const route = useRoute()
  let query: MediaQueryList | undefined
  const sync = () => app.setDevice(query?.matches ? 'mobile' : 'desktop')

  onMounted(() => {
    query = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`)
    sync()
    query.addEventListener('change', sync)
  })
  onBeforeUnmount(() => query?.removeEventListener('change', sync))
  watch(() => route.fullPath, () => app.closeDrawer())
}
