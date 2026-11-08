import { effectScope, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDetail } from '@/views/network/delivery/use-detail'
import { getDelivery, getDeliveryTarget } from '@/api/network/delivery'
import type { DeliveryOrder, DeliveryTarget } from '@/types/network-delivery'

vi.mock('@/api/network/delivery', () => ({ getDelivery: vi.fn(), getDeliveryTarget: vi.fn() }))
const order = (id: number) => ({ id, status: 'succeeded', targets: [{ id: id * 10, status: 'succeeded', completedSteps: 1 }] }) as DeliveryOrder
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }
const flush = async() => { await Promise.resolve(); await nextTick(); await Promise.resolve(); await nextTick() }
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers() })

describe('delivery detail sessions', () => {
  it('ignores a previous order response after switching to another order', async() => {
    const old = deferred<{ code: number, msg: string, data: DeliveryOrder }>()
    vi.mocked(getDelivery).mockImplementation(id => id === 1 ? old.promise : Promise.resolve({ code: 200, msg: '', data: order(id) }))
    vi.mocked(getDeliveryTarget).mockImplementation(async(_id, targetId) => ({ code: 200, msg: '', data: { id: targetId } as DeliveryTarget }))
    const id = ref<number | undefined>(1)
    const scope = effectScope()
    const state = scope.run(() => useDetail(id, ref(true)))!
    id.value = 2
    await flush()
    old.resolve({ code: 200, msg: '', data: order(1) })
    await flush()
    expect(state.order.value?.id).toBe(2)
    expect(state.target.value?.id).toBe(20)
    scope.stop()
  })

  it('clears private output on close and discards a delayed target response', async() => {
    vi.mocked(getDelivery).mockResolvedValue({ code: 200, msg: '', data: order(1) })
    const pending = deferred<{ code: number, msg: string, data: DeliveryTarget }>()
    vi.mocked(getDeliveryTarget).mockReturnValue(pending.promise)
    const visible = ref(true)
    const scope = effectScope()
    const state = scope.run(() => useDetail(ref(1), visible))!
    await flush()
    visible.value = false
    await flush()
    pending.resolve({ code: 200, msg: '', data: { id: 10, output: 'private output' } as DeliveryTarget })
    await flush()
    expect(state.order.value).toBeUndefined()
    expect(state.target.value).toBeUndefined()
    scope.stop()
  })
})
