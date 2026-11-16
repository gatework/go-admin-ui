import { onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
export function useSession() {
  const user = useUserStore()
  const account = user.token
  const active = ref(!document.hidden)
  const pending = ref(false)
  let generation = 0
  let abort = new AbortController()
  let attached = true
  const stop = () => { active.value = false; generation++; abort.abort(); pending.value = false }
  const resume = () => { if (!active.value && attached && !document.hidden && user.token === account) { abort = new AbortController(); active.value = true } }
  const visibility = () => { if (document.hidden) stop(); else resume() }
  onMounted(() => document.addEventListener('visibilitychange', visibility))
  onDeactivated(() => { attached = false; stop() })
  onBeforeUnmount(() => { attached = false; stop(); document.removeEventListener('visibilitychange', visibility) })
  watch(() => user.token, stop, { flush: 'sync' })
  onActivated(() => { attached = true; resume() })
  async function run<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    if (!active.value || document.hidden || user.token !== account || pending.value) return
    pending.value = true
    const version = generation
    try { const result = await work(abort.signal); return active.value && version === generation ? result : undefined } finally { if (version === generation) pending.value = false }
  }
  return { active, pending, run }
}
