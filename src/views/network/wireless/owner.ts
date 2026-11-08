import type { Collection } from '@/types/network-wireless'
export const running = (job: Collection) => ['queued', 'running'].includes(job.status)
// A single evidence queue is independent from the fast task observer.
export function createOwner(options: { read: (signal: AbortSignal) => Promise<void>, discover: (signal: AbortSignal) => Promise<Collection[]>, track: (id: number, signal: AbortSignal) => Promise<Collection>, changed?: (job: Collection) => void }) {
  let active = false
  let generation = 0
  let abort = new AbortController()
  let slow: ReturnType<typeof setInterval> | undefined
  let fast: ReturnType<typeof setInterval> | undefined
  let read: Promise<void> | undefined
  let pending = false
  let discovery = false
  let tracking = false
  const jobs = new Map<number, Collection>()
  const accept = (job: Collection) => {
    const previous = jobs.get(job.id)
    if (previous && previous.version >= job.version) return
    jobs.set(job.id, job)
    options.changed?.(job)
    if (previous && running(previous) && !running(job)) void refresh()
  }
  function refresh(): Promise<void> {
    if (!active) return Promise.resolve()
    if (read) { pending = true; return read }
    const version = generation
    read = (async() => {
      do {
        pending = false
        try { await options.read(abort.signal) } catch { /* page retains evidence and renders its error */ }
        if (!active || generation !== version) break
      } while (pending)
    })().finally(() => { if (generation === version) read = undefined })
    return read
  }
  async function discover() {
    if (!active || discovery) return
    discovery = true
    const version = generation
    try { const rows = await options.discover(abort.signal); if (active && generation === version) rows.forEach(accept) } catch { /* next visible cycle retries */ } finally { if (generation === version) discovery = false }
  }
  async function track() {
    if (!active || tracking) return
    tracking = true
    const version = generation
    try { for (const job of [...jobs.values()].filter(running)) { if (!active || version !== generation) break; try { const value = await options.track(job.id, abort.signal); if (active && version === generation) accept(value) } catch { /* one failed job cannot starve the rest */ } } } finally { if (generation === version) tracking = false }
  }
  function stop() { active = false; generation++; abort.abort(); clearInterval(slow); clearInterval(fast); pending = false; read = undefined; discovery = false; tracking = false }
  function start() { if (active) return; active = true; abort = new AbortController(); void refresh(); void discover(); slow = setInterval(() => { void refresh(); void discover() }, 15000); fast = setInterval(() => { void track() }, 3000) }
  return { start, stop, refresh, accept }
}
