import { defineStore } from 'pinia'

export type DeviceType = 'desktop' | 'mobile'

/**
 * Viewport class and the phone navigation drawer.
 *
 * Whether the desktop rail is collapsed is a preference
 * (`preferences.menuCollapse`), because it is remembered. The drawer is not: it
 * opens over the page and closes on the next navigation.
 */
export const useAppStore = defineStore('app', {
  state: () => ({
    device: 'desktop' as DeviceType,
    drawerOpen: false
  }),
  getters: {
    mobile: state => state.device === 'mobile'
  },
  actions: {
    setDevice(device: DeviceType) {
      this.device = device
      if (device === 'desktop') this.drawerOpen = false
    },
    toggleDrawer() { this.drawerOpen = !this.drawerOpen },
    closeDrawer() { this.drawerOpen = false }
  }
})
