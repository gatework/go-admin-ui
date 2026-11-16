import { computed, onScopeDispose, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { getDelivery, getDeliveryTarget } from '@/api/network/delivery'
import type { DeliveryOrder, DeliveryTarget } from '@/types/network-delivery'
import { isActive } from './presentation'

export function useDetail(id: Ref<number | undefined>, visible: Ref<boolean>) {
  const order = ref<DeliveryOrder>()
  const target = ref<DeliveryTarget>()
  const selectedId = ref<number>()
  const loading = ref(false)
  const refreshing = ref(false)
  const failed = ref(false)
  const targetLoading = ref(false)
  const targetFailed = ref(false)
  const polling = computed(() => Boolean(visible.value && order.value && isActive(order.value.status)))
  let generation = 0
  let targetGeneration = 0
  let controller: AbortController | undefined
  let targetController: AbortController | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  function invalidate() {
    generation++; targetGeneration++; controller?.abort(); targetController?.abort(); clearTimeout(timer)
    order.value = undefined; target.value = undefined; selectedId.value = undefined; loading.value = false; refreshing.value = false; targetLoading.value = false
  }
  async function loadTarget() {
    targetController?.abort()
    const current = ++targetGeneration
    const orderId = id.value
    const targetId = selectedId.value
    if (!visible.value || !orderId || !targetId) { target.value = undefined; return }
    targetController = new AbortController()
    if (target.value?.id !== targetId) target.value = undefined
    targetLoading.value = true; targetFailed.value = false
    try {
      const result = await getDeliveryTarget(orderId, targetId, targetController.signal)
      if (current === targetGeneration && visible.value && orderId === id.value) target.value = result.data
    } catch { if (current === targetGeneration) targetFailed.value = true } finally { if (current === targetGeneration) targetLoading.value = false }
  }
  async function refresh() {
    if (!visible.value || !id.value || refreshing.value || document.hidden) return
    clearTimeout(timer)
    const current = generation
    controller = new AbortController()
    refreshing.value = true; loading.value = !order.value
    try {
      const result = await getDelivery(id.value, controller.signal)
      if (current !== generation || !visible.value) return
      order.value = result.data; failed.value = false
      const targets = result.data.targets || []
      if (!targets.some(row => row.id === selectedId.value)) selectedId.value = targets[0]?.id
      else await loadTarget()
    } catch { if (current === generation) failed.value = true } finally {
      if (current === generation) {
        loading.value = false; refreshing.value = false
        if (visible.value && (!order.value || isActive(order.value.status))) timer = setTimeout(() => void refresh(), 3000)
      }
    }
  }
  function visibilityChanged() { if (document.hidden) clearTimeout(timer); else if (visible.value) void refresh() }
  watch([id, visible], () => { invalidate(); failed.value = false; targetFailed.value = false; if (visible.value) void refresh() }, { immediate: true })
  watch(selectedId, () => { void loadTarget() })
  document.addEventListener('visibilitychange', visibilityChanged)
  onScopeDispose(() => { invalidate(); document.removeEventListener('visibilitychange', visibilityChanged) })
  return { order, target, selectedId, loading, refreshing, failed, targetLoading, targetFailed, polling, refresh, loadTarget }
}
