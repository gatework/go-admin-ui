import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { getChangeCandidates } from '@/api/network/fabric'
import type { ChangeCandidateInput, ChangeCandidates } from '@/types/network-fabric'

// Candidate requests are reads. They must not share the write lock: changing
// source or scope immediately removes the previous response's authority.
export function useChangeCandidates(fabricId: number, input: () => ChangeCandidateInput | undefined) {
  const user = useUserStore()
  const candidates = ref<ChangeCandidates>()
  const loading = ref(false)
  const failed = ref(false)
  const signature = computed(() => JSON.stringify(input()))
  let generation = 0
  let controller: AbortController | undefined
  function invalidate() { generation++; controller?.abort(); candidates.value = undefined; loading.value = false; failed.value = false }
  async function refresh() {
    invalidate()
    const snapshot = input()
    if (!snapshot) return
    const current = generation
    controller = new AbortController()
    loading.value = true
    try {
      const response = await getChangeCandidates(fabricId, { ...snapshot, ...(snapshot.targetDeviceIds ? { targetDeviceIds: [...snapshot.targetDeviceIds] } : {}) }, controller.signal)
      if (current === generation) candidates.value = response.data
    } catch { if (current === generation) failed.value = true } finally { if (current === generation) loading.value = false }
  }
  watch(signature, refresh, { immediate: true, flush: 'sync' })
  watch(() => user.token, invalidate, { flush: 'sync' })
  onBeforeUnmount(invalidate)
  onDeactivated(invalidate)
  return { candidates, loading, failed, refresh, invalidate }
}
