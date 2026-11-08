import { onScopeDispose, reactive } from 'vue'
import { getDiagnosticJob, startDiagnostic, stopDiagnostic } from '@/api/network/diagnostics'
import type { DiagnosticJob, DiagnosticRequest } from '@/types/diagnostics'

export interface DiagnosticSlot {
  id: string | null
  job: DiagnosticJob | null
  submitting: boolean
  stopping: boolean
  refreshing: boolean
  pollFailed: boolean
  startFailed: boolean
  missing: boolean
  revision: number
}
const newSlot = (): DiagnosticSlot => ({ id: null, job: null, submitting: false, stopping: false, refreshing: false, pollFailed: false, startFailed: false, missing: false, revision: 0 })
const storageKey = 'motor-network-diagnostics'

export function useDiagnostics() {
  const run = reactive(newSlot())
  const session = reactive(newSlot())
  const slots = [run, session]
  let active = true
  let disposed = false
  let restored = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const busy = (slot: DiagnosticSlot) => slot.submitting || slot.stopping || (!!slot.id && (!slot.job || slot.job.status === 'running') && !slot.missing)
  function save() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(slots.map(slot => slot.missing ? null : slot.id))) } catch { /* Storage can be disabled; the in-memory session still works. */ }
  }
  function schedule() {
    clearTimeout(timer)
    if (!active || disposed || !slots.some(slot => slot.job?.status === 'running' && !slot.pollFailed && !slot.missing)) return
    timer = setTimeout(() => { void refresh(false) }, 1000)
  }
  async function read(slot: DiagnosticSlot, id: string) {
    if (slot.refreshing) return
    const revision = slot.revision
    slot.refreshing = true
    try {
      const { data } = await getDiagnosticJob(id)
      if (disposed || revision !== slot.revision) return
      slot.job = data
      slot.pollFailed = false
      slot.missing = false
    } catch(error) {
      if (disposed || revision !== slot.revision) return
      slot.pollFailed = true
      slot.missing = (error as { code?: number }).code === 404
    } finally {
      slot.refreshing = false
      save()
    }
  }
  async function refresh(retry = true) {
    await Promise.all(slots.map(slot => slot.id && !slot.missing && (retry || (slot.job?.status === 'running' && !slot.pollFailed)) ? read(slot, slot.id) : undefined))
    schedule()
  }
  async function start(request: DiagnosticRequest) {
    const slot = request.mode === 'server' ? session : run
    if (busy(slot)) return
    slot.submitting = true
    slot.startFailed = false
    slot.revision++
    try {
      const { data } = await startDiagnostic(request)
      if (disposed) return
      slot.job = data
      slot.id = data.id
      slot.missing = false
      slot.pollFailed = false
      save()
    } catch {
      slot.startFailed = true
    } finally {
      slot.submitting = false
      schedule()
    }
  }
  async function stop(slot: DiagnosticSlot) {
    if (!slot.id || slot.stopping || slot.missing) return
    slot.stopping = true
    slot.revision++
    try {
      const { data } = await stopDiagnostic(slot.id)
      if (disposed) return
      slot.job = data
      slot.pollFailed = false
      save()
    } catch {
      slot.pollFailed = true
    } finally {
      slot.stopping = false
      schedule()
    }
  }
  function pause() { active = false; clearTimeout(timer) }
  async function resume() {
    active = true
    if (!restored) {
      restored = true
      try {
        const ids: unknown = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
        slots.forEach((slot, index) => {
          const id = slot.id || (Array.isArray(ids) ? ids[index] : null)
          slot.id = typeof id === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(id) ? id : null
        })
        await Promise.all(slots.map(slot => slot.id ? read(slot, slot.id) : undefined))
      } catch { /* Ignore malformed local state. */ }
      schedule()
    } else await refresh()
  }
  onScopeDispose(() => { disposed = true; pause() })
  return { run, session, busy, start, stop, refresh, pause, resume }
}
