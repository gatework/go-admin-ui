import { onScopeDispose, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { getCircuitTraffic } from '@/api/network/circuit'
import type { CircuitPeriod, CircuitTraffic } from '@/types/network-circuit'

export function useCircuitTraffic(id: Ref<number | undefined>, visible: Ref<boolean>, period: Ref<CircuitPeriod>) {
  const data = ref<CircuitTraffic>()
  const loading = ref(false)
  const failed = ref(false)
  let generation = 0
  let controller: AbortController | undefined
  function cancel() {
    generation++
    controller?.abort()
    data.value = undefined
    loading.value = false
    failed.value = false
  }
  async function refresh() {
    cancel()
    if (!visible.value || !id.value) return
    const current = generation
    controller = new AbortController()
    loading.value = true
    try {
      const response = await getCircuitTraffic(id.value, period.value, controller.signal)
      if (current === generation && visible.value) data.value = response.data
    } catch {
      if (current === generation && visible.value) failed.value = true
    } finally { if (current === generation) loading.value = false }
  }
  watch([id, visible, period], refresh, { immediate: true })
  onScopeDispose(cancel)
  return { data, loading, failed, refresh, cancel }
}
