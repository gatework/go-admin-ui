import { onActivated, onDeactivated, onScopeDispose, ref, watch } from 'vue'
import { getFabric } from '@/api/network/fabric'
import { useUserStore } from '@/stores/user'
import type { FabricDetail } from '@/types/network-fabric'

// One queue for manual refresh, the periodic assessment and task completions.
export function useFabricDetail(id: () => number) {
  const user = useUserStore()
  const record = ref<FabricDetail>()
  const loading = ref(false)
  const failed = ref(false)
  let generation = 0
  let active = true
  let pending = false
  let controller: AbortController | undefined
  let flight: Promise<void> | undefined
  let timer: ReturnType<typeof setInterval> | undefined
  const visible = () => active && !document.hidden
  function stop() {
    generation++; controller?.abort(); clearInterval(timer)
    flight = undefined; pending = false; loading.value = false
  }
  function load(): Promise<void> {
    if (!visible()) return Promise.resolve()
    if (flight) { pending = true; return flight }
    const current = generation
    const fabricId = id()
    flight = (async() => {
      try {
        do {
          pending = false
          controller = new AbortController()
          loading.value = !record.value
          try {
            const response = await getFabric(fabricId, controller.signal)
            if (current !== generation) return
            record.value = response.data; failed.value = false
          } catch {
            if (current !== generation) return
            failed.value = true
          } finally { if (current === generation) loading.value = false }
        } while (pending && visible())
      } finally { if (current === generation) flight = undefined }
    })()
    return flight
  }
  function resume() {
    if (!visible()) return
    clearInterval(timer)
    // Keep the clock independent of slow reads. Ticks add at most one follow-up;
    // they never abort a response that is still useful for this owner.
    timer = setInterval(() => void load(), 15000)
    void load()
  }
  function visibilityChanged() { stop(); resume() }
  watch(id, () => { stop(); record.value = undefined; failed.value = false; resume() }, { immediate: true, flush: 'sync' })
  watch(() => user.token, () => { active = false; stop(); record.value = undefined; failed.value = false }, { flush: 'sync' })
  onDeactivated(() => { active = false; stop() })
  onActivated(() => { if (!active) { active = true; resume() } })
  document.addEventListener('visibilitychange', visibilityChanged)
  onScopeDispose(() => { active = false; stop(); document.removeEventListener('visibilitychange', visibilityChanged) })
  return { record, loading, failed, load }
}
