import { onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'

// A request can finish after its drawer closed. Its result belongs to the old
// component/account, while the server remains authoritative about the action.
export function useOperation() {
  const user = useUserStore()
  const pending = ref(false)
  let generation = 0
  const invalidate = () => { generation++ }
  watch(() => user.token, invalidate, { flush: 'sync' })
  onBeforeUnmount(invalidate)
  onDeactivated(invalidate)
  async function run<T>(action: () => Promise<T>, apply: (result: T) => void, reject?: (error: unknown) => void) {
    if (pending.value) return
    pending.value = true
    const current = generation
    try { const result = await action(); if (current === generation) apply(result) } catch(error) { if (current === generation) reject?.(error) /* Transport owns error feedback. */ } finally { pending.value = false }
  }
  return { pending, run, invalidate }
}
