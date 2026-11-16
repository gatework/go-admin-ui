import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useCircuitTraffic } from '@/views/network/circuit/use-traffic'
import { trafficFixture } from '../../fixtures/network-circuit'
import type { CircuitPeriod } from '@/types/network-circuit'

const fetchTraffic = vi.hoisted(() => vi.fn())
vi.mock('@/api/network/circuit', () => ({ getCircuitTraffic: fetchTraffic }))
describe('traffic request lifecycle', () => {
  beforeEach(() => { fetchTraffic.mockReset() })
  it('aborts replaced periods and ignores late responses even if the transport resolves after abort', async() => {
    const pending: ((data: unknown) => void)[] = []
    fetchTraffic.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
    const scope = effectScope()
    const id = ref<number | undefined>(7)
    const visible = ref(true)
    const period = ref<CircuitPeriod>('1h')
    const resource = scope.run(() => useCircuitTraffic(id, visible, period))!
    await nextTick()
    period.value = '7d'
    await nextTick()
    expect(fetchTraffic.mock.calls[0][2].aborted).toBe(true)
    const latest = { ...trafficFixture(), period: '7d' }
    pending[1]({ code: 200, data: latest })
    await flushPromises()
    pending[0]({ code: 200, data: trafficFixture() })
    await flushPromises()
    expect(resource.data.value?.period).toBe('7d')
    visible.value = false
    await nextTick()
    expect(resource.data.value).toBeUndefined()
    scope.stop()
  })

  it('does not leak prior records after a switch, close or failure and can retry', async() => {
    fetchTraffic.mockResolvedValueOnce({ code: 200, data: trafficFixture() }).mockRejectedValueOnce(new Error('safe failure')).mockResolvedValue({ code: 200, data: { ...trafficFixture(), series: [] }})
    const scope = effectScope()
    const id = ref<number | undefined>(7)
    const visible = ref(true)
    const resource = scope.run(() => useCircuitTraffic(id, visible, ref<CircuitPeriod>('1h')))!
    await flushPromises()
    id.value = 8
    await flushPromises()
    expect(resource.data.value).toBeUndefined()
    expect(resource.failed.value).toBe(true)
    await resource.refresh()
    expect(resource.failed.value).toBe(false)
    expect(resource.data.value?.series).toEqual([])
    scope.stop()
    expect(fetchTraffic.mock.calls.at(-1)?.[2].aborted).toBe(true)
  })
})
