import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '@/stores/app'

beforeEach(() => setActivePinia(createPinia()))

describe('app store', () => {
  it('starts on a desktop with the drawer closed', () => {
    const app = useAppStore()
    expect(app.device).toBe('desktop')
    expect(app.mobile).toBe(false)
    expect(app.drawerOpen).toBe(false)
  })

  it('opens and closes the phone drawer', () => {
    const app = useAppStore()
    app.setDevice('mobile')
    app.toggleDrawer()
    expect(app.drawerOpen).toBe(true)
    app.closeDrawer()
    expect(app.drawerOpen).toBe(false)
  })

  // Otherwise widening the window with the drawer open leaves a scrim-less
  // "open" flag behind, and the next narrow layout starts with the menu out.
  it('closes the drawer when the viewport becomes a desktop', () => {
    const app = useAppStore()
    app.setDevice('mobile')
    app.toggleDrawer()
    app.setDevice('desktop')
    expect(app.drawerOpen).toBe(false)
  })
})
