import { onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { createReadOwner } from './presentation'
export function useWorkspace() {
  const user = useUserStore(); const account = user.token; const owner = createReadOwner(); const failed = ref(false); const loading = ref(false); const pending = ref(false); let active = true; let generation = 0; let scopeController = new AbortController(); let readGeneration = 0
  const allowed = (action: string) => user.permisaction.some(value => value === '*:*:*' || value === `network:firewall:${action}`)
  function stop() { active = false; generation++; scopeController.abort(); owner.stop(); loading.value = false }
  function resume() { if (user.token === account) { active = true; if (scopeController.signal.aborted) scopeController = new AbortController(); owner.resume() } }
  onDeactivated(stop); onBeforeUnmount(stop); onActivated(resume); watch(() => user.token, stop, { flush: 'sync' })
  async function read<T>(work: (signal: AbortSignal) => Promise<T>, apply: (value: T) => void) { const own = ++readGeneration; failed.value = false; loading.value = true; try { await owner.run(work, apply) } catch { if (active && own === readGeneration) failed.value = true } finally { if (own === readGeneration) loading.value = false } }
  async function write<T>(work: () => Promise<T>, apply: (value: T) => void) { if (!active || pending.value || user.token !== account) return; const own = generation; pending.value = true; failed.value = false; try { const result = await work(); if (active && own === generation) apply(result) } catch { if (active && own === generation) failed.value = true } finally { pending.value = false } }
  function invalidate() { generation++; readGeneration++; scopeController.abort(); scopeController = new AbortController(); owner.stop(); if (active) owner.resume(); loading.value = false }
  async function guard<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (!active || user.token !== account) throw new DOMException('Inactive workspace', 'AbortError')
    const own = generation; const result = await work(scopeController.signal)
    if (!active || own !== generation || user.token !== account) throw new DOMException('Inactive workspace', 'AbortError')
    return result
  }
  return { allowed, failed, loading, pending, read, write, guard, invalidate, current: () => active && user.token === account }
}
export function usePolling(refresh: () => Promise<void>, shouldPoll: () => boolean) {
  let timer: ReturnType<typeof setTimeout> | undefined; let active = false
  const tick = async() => { if (!active) return; if (!document.hidden && shouldPoll()) await refresh(); if (active) timer = setTimeout(() => { void tick() }, 2500) }
  const start = () => { if (!active) { active = true; void tick() } }; const stop = () => { active = false; clearTimeout(timer) }
  onMounted(start); onActivated(start); onDeactivated(stop); onBeforeUnmount(stop)
}
