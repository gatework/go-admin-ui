import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from 'vue-router'
import path from 'path'
import { TABS_STORAGE_KEY } from '@/config/app-meta'
import { usePermissionStore } from '@/stores/permission'
import { usePreferencesStore } from '@/stores/preferences'
import { useTagsViewStore, type VisitedView } from '@/stores/tagsView'

/** Past this many, opening a page closes the oldest closable tab. */
export const MAX_TABS = 12

export type TabAction = 'refresh' | 'close' | 'others' | 'all'

interface MenuNode { path: string, name?: unknown, meta?: Record<string, unknown>, children?: MenuNode[] }

const isAffix = (view: VisitedView) => Boolean(view.meta?.affix)

/** Pinned tabs: every route in the menu tree marked `meta.affix`. */
const affixViews = (nodes: MenuNode[], base = '/'): VisitedView[] => nodes.flatMap(node => {
  const full = path.resolve(base, node.path)
  const own = node.meta?.affix && node.name ? [{ fullPath: full, path: full, name: String(node.name), meta: { ...node.meta }}] : []
  return [...own, ...affixViews(node.children ?? [], full)]
})

/** A plain copy of a route: what the tab renders, and what survives JSON. */
const snapshot = (route: RouteLocationNormalizedLoaded | VisitedView): VisitedView => ({
  fullPath: route.fullPath,
  path: route.path,
  name: route.name ? String(route.name) : undefined,
  meta: { ...route.meta },
  query: { ...(route.query as object) },
  params: { ...(route.params as object) }
})

/**
 * The open tabs: opening on navigation, closing, refreshing, and remembering
 * them across a reload.
 *
 * Call once, from the tab bar. The list itself lives in the tagsView store,
 * because keep-alive reads its `cachedViews`.
 */
export function useTabs() {
  const route = useRoute()
  const router = useRouter()
  const store = useTagsViewStore()
  const preferences = usePreferencesStore()
  const permission = usePermissionStore()

  const tabs = computed(() => store.visitedViews)
  const activeKey = computed(() => route.fullPath)

  const save = () => {
    try {
      if (preferences.tabPersist) sessionStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(store.visitedViews.map(snapshot)))
      else sessionStorage.removeItem(TABS_STORAGE_KEY)
    } catch { /* Storage unavailable: tabs still work for this page load. */ }
  }

  /** Reopens what the last page load had, keeping only paths this account can still reach. */
  const restore = () => {
    if (store.restored) return
    store.restored = true
    if (!preferences.tabPersist) return
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(TABS_STORAGE_KEY) || '[]')
      if (!Array.isArray(saved)) return
      store.setVisitedViews(saved.filter((view): view is VisitedView =>
        typeof view?.fullPath === 'string' && view.fullPath.startsWith('/') && !view.fullPath.startsWith('//') && router.resolve(view.fullPath).matched.length > 0
      ))
    } catch { /* Damaged storage starts from the current route. */ }
  }

  const trim = () => {
    const closable = store.visitedViews.filter(view => !isAffix(view) && view.path !== route.path)
    while (store.visitedViews.length > MAX_TABS && closable.length) store.delView(closable.shift()!)
  }

  const add = () => {
    if (!route.name || route.path.startsWith('/redirect')) return
    store.addView(route)
    trim()
  }

  /** After the current tab closes: the last one left, or home. */
  const leaveTo = (views: VisitedView[]) => router.push(views.at(-1)?.fullPath || '/')

  const open = (key: string | number) => { void router.push(String(key)) }

  const close = async(view: VisitedView) => {
    if (isAffix(view)) return
    const { visitedViews } = store.delView(view)
    if (view.path === route.path) await leaveTo(visitedViews)
  }

  const closeOthers = async(view: VisitedView) => {
    if (view.fullPath && view.path !== route.path) await router.push(view.fullPath)
    store.delOthersViews(view)
  }

  const closeAll = async() => {
    const { visitedViews } = store.delAllViews()
    if (!visitedViews.some(view => view.path === route.path)) await leaveTo(visitedViews)
  }

  /** Drops the cached instance and re-enters the route through /redirect, so the page is rebuilt. */
  const refresh = async(view: VisitedView) => {
    store.delCachedView(view)
    await nextTick()
    await router.replace({ path: '/redirect' + (view.fullPath || view.path) })
  }

  const run = (action: TabAction, view: VisitedView) => {
    if (action === 'refresh') return refresh(view)
    if (action === 'close') return close(view)
    if (action === 'others') return closeOthers(view)
    return closeAll()
  }

  onMounted(() => {
    restore()
    for (const view of affixViews(permission.routes as unknown as MenuNode[])) store.addVisitedView(view)
    add()
    window.addEventListener('beforeunload', save)
  })
  onBeforeUnmount(() => {
    save()
    window.removeEventListener('beforeunload', save)
  })
  watch(() => route.fullPath, add)
  watch(() => preferences.tabPersist, save)

  return { tabs, activeKey, isAffix, open, close, run }
}
