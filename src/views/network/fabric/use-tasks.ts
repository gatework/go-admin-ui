import { onActivated, onDeactivated, onScopeDispose, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { getChange, getCollection, listChange, listCollection } from '@/api/network/fabric'
import type { Change, Collection } from '@/types/network-fabric'

export const activeTask = (status: string) => ['queued', 'running'].includes(status)
type Kind = 'collection' | 'change'
// The detail owns observation, so closing a drawer cannot interrupt tracking.
export function useFabricTasks(id: () => number, completed: () => void | Promise<void>, enabled: () => boolean = () => true) {
  const user = useUserStore()
  const collections = ref<Record<number, Collection>>({})
  const changes = ref<Record<number, Change>>({})
  const revision = ref(0)
  const failed = ref(false)
  let generation = 0
  let active = true
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined
  let flight: Promise<void> | undefined
  let nextDiscovery = 0
  let notification: Promise<void> | undefined
  const terminal = new Set<string>()
  const visible = () => active && enabled() && !document.hidden
  const hasActive = () => [...Object.values(collections.value), ...Object.values(changes.value)].some(row => activeTask(row.status))
  function stop() { generation++; controller?.abort(); clearTimeout(timer); flight = undefined; notification = undefined }
  function schedule() {
    clearTimeout(timer)
    if (!visible() || flight) return
    const delay = Math.max(0, nextDiscovery - Date.now())
    timer = setTimeout(() => void refresh(), hasActive() ? Math.min(3000, delay) : delay)
  }
  function observe(kind: Kind, task: Collection | Change) {
    if (!active || !enabled() || task.fabricId !== id()) return false
    const rows = kind === 'collection' ? collections : changes
    const previous = rows.value[task.id]
    const key = `${kind}:${task.id}`
    if (previous && task.version < previous.version || terminal.has(key) && activeTask(task.status)) return false
    rows.value = { ...rows.value, [task.id]: task } as typeof rows.value
    // Unknown/uncertain outcomes remain evidence; assessment decides resolution.
    if (previous && activeTask(previous.status) && !activeTask(task.status) && !terminal.has(key)) {
      terminal.add(key); revision.value++; return true
    }
    return false
  }
  function notify(): Promise<void> {
    if (notification) return notification
    const current = generation
    // History drawers feed snapshots in a loop: merge that turn as one batch.
    notification = Promise.resolve().then(async() => {
      if (current !== generation) return
      notification = undefined
      try { await completed() } catch { if (current === generation) failed.value = true }
    })
    return notification
  }
  function track(kind: Kind, task: Collection | Change) {
    const done = observe(kind, task)
    schedule()
    return done ? notify() : Promise.resolve()
  }
  function refresh(): Promise<void> {
    if (!visible()) return Promise.resolve()
    if (flight) return flight
    clearTimeout(timer)
    const current = generation
    const fabricId = id()
    controller = new AbortController()
    const signal = controller.signal
    flight = Promise.resolve().then(async() => {
      if (current !== generation) return
      let taskFailed = false
      let completedBatch = false
      let completion: Promise<void> | undefined
      try {
        if (Date.now() >= nextDiscovery) {
          nextDiscovery = Date.now() + 15000
          // Discovery remains periodic even when history starts empty. A failing
          // kind must not prevent another kind or a known task being observed.
          for (const kind of ['collection', 'change'] as const) {
            try {
              for (let pageIndex = 1; ; pageIndex++) {
                const result = kind === 'collection' ? await listCollection(fabricId, { pageIndex, pageSize: 100, status: 'active' }, signal) : await listChange(fabricId, { pageIndex, pageSize: 100, status: 'active' }, signal)
                if (current !== generation) return
                for (const row of result.data.list) if (activeTask(row.status)) observe(kind, row)
                if (pageIndex * 100 >= result.data.count || !result.data.list.length) break
              }
            } catch { if (current !== generation) return; taskFailed = true }
          }
        }
        for (const [kind, rows] of [['collection', collections.value], ['change', changes.value]] as const) {
          for (const row of Object.values(rows)) {
            if (!activeTask(row.status)) continue
            try {
              const result = kind === 'collection' ? await getCollection(row.id, signal) : await getChange(row.id, signal)
              if (current !== generation) return
              completedBatch = observe(kind, result.data) || completedBatch
            } catch { if (current !== generation) return; taskFailed = true }
          }
        }
        if (current !== generation) return
        failed.value = taskFailed
        if (completedBatch) completion = notify()
      } finally {
        // Release task-network ownership before awaiting the detail queue.
        // This cleanup belongs only to this poll; no later completion cleanup
        // may clear a newer task poll while assessment is still in flight.
        if (current === generation) { flight = undefined; schedule() }
      }
      await completion
    })
    return flight
  }
  function resume() { nextDiscovery = 0; if (visible()) void refresh() }
  function visibilityChanged() { stop(); resume() }
  function reset() { stop(); collections.value = {}; changes.value = {}; terminal.clear(); failed.value = false; nextDiscovery = 0 }
  watch([id, enabled], () => { reset(); if (visible()) void refresh() }, { immediate: true, flush: 'sync' })
  watch(() => user.token, () => { active = false; reset() }, { flush: 'sync' })
  onDeactivated(() => { active = false; stop() })
  onActivated(() => { if (!active) { active = true; resume() } })
  document.addEventListener('visibilitychange', visibilityChanged)
  onScopeDispose(() => { active = false; stop(); document.removeEventListener('visibilitychange', visibilityChanged) })
  return { collections, changes, revision, failed, track, refresh }
}
export type FabricTasks = ReturnType<typeof useFabricTasks>
