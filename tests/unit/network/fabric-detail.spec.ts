/* eslint-disable vue/one-component-per-file -- mounted lifecycle owners */
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useFabricDetail } from '@/views/network/fabric/use-detail'
import { useFabricTasks } from '@/views/network/fabric/use-tasks'
import { useUserStore } from '@/stores/user'
const api = vi.hoisted(() => ({ getFabric: vi.fn(), listCollection: vi.fn(), listChange: vi.fn(), getCollection: vi.fn(), getChange: vi.fn() }))
vi.mock('@/api/network/fabric', () => api)
beforeEach(() => {
  vi.useFakeTimers(); setActivePinia(createPinia()); Object.values(api).forEach(mock => mock.mockReset())
  api.getFabric.mockImplementation(id => Promise.resolve({ data: { id, version: 1, completeScope: false }}))
  api.listCollection.mockResolvedValue({ data: { list: [], count: 0 }})
  api.listChange.mockResolvedValue({ data: { list: [], count: 0 }})
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})
afterEach(() => vi.useRealTimers())
function owner() {
  const id = ref(1)
  let detail!: ReturnType<typeof useFabricDetail>
  const wrapper = mount(defineComponent({ setup() { detail = useFabricDetail(() => id.value); return () => h('div') } }))
  return { id, detail, wrapper }
}
it('refreshes full detail every 15 seconds with no tasks and no history permission, preserving data on failure', async() => {
  const { detail, wrapper } = owner()
  expect(detail.loading.value).toBe(true)
  await flushPromises()
  expect(detail.loading.value).toBe(false)
  api.getFabric.mockRejectedValueOnce(new Error('offline'))
  await vi.advanceTimersByTimeAsync(15000)
  expect(api.getFabric).toHaveBeenCalledTimes(2)
  expect(detail.record.value?.version).toBe(1)
  expect(detail.failed.value).toBe(true)
  api.getFabric.mockResolvedValue({ data: { id: 1, version: 3, completeScope: false }})
  await vi.advanceTimersByTimeAsync(15000)
  expect(detail.record.value?.version).toBe(3)
  expect(detail.failed.value).toBe(false)
  wrapper.unmount()
})
it('coalesces manual, timer and completion refresh into one follow-up without aborting or starving a slow response', async() => {
  const { detail, wrapper } = owner(); await flushPromises()
  let resolve!: (value: unknown) => void
  let followUp!: (value: unknown) => void
  api.getFabric.mockImplementationOnce(() => new Promise(done => { resolve = done })).mockImplementationOnce(() => new Promise(done => { followUp = done }))
  const first = detail.load()
  await vi.advanceTimersByTimeAsync(45000)
  const completion = detail.load(); void detail.load()
  expect(api.getFabric).toHaveBeenCalledTimes(2)
  expect((api.getFabric.mock.calls[1][1] as AbortSignal).aborted).toBe(false)
  expect(detail.loading.value).toBe(false)
  resolve({ data: { id: 1, version: 2 }})
  await flushPromises()
  expect(detail.record.value?.version).toBe(2)
  expect(api.getFabric).toHaveBeenCalledTimes(3)
  followUp({ data: { id: 1, version: 3 }})
  await first; await completion
  expect(detail.record.value?.version).toBe(3)
  wrapper.unmount()
})
it('pauses hidden work, aborts in-flight reads and ignores their late responses, then resumes immediately', async() => {
  const { detail, wrapper } = owner(); await flushPromises()
  let resolve!: (value: unknown) => void
  api.getFabric.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  void detail.load()
  const signal = api.getFabric.mock.calls[1][1] as AbortSignal
  Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'))
  expect(signal.aborted).toBe(true)
  resolve({ data: { id: 1, version: 99 }}); await flushPromises()
  await vi.advanceTimersByTimeAsync(30000)
  expect(api.getFabric).toHaveBeenCalledTimes(2)
  expect(detail.record.value?.version).toBe(1)
  Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange'))
  await flushPromises(); expect(api.getFabric).toHaveBeenCalledTimes(3)
  wrapper.unmount()
})
it('does not duplicate first KeepAlive activation and resumes after deactivation', async() => {
  const shown = ref(true); let detail!: ReturnType<typeof useFabricDetail>
  const child = defineComponent({ setup() { detail = useFabricDetail(() => 1); return () => h('div') } })
  const wrapper = mount(defineComponent({ setup: () => () => h(KeepAlive, () => shown.value ? h(child) : null) }))
  await flushPromises(); expect(api.getFabric).toHaveBeenCalledTimes(1)
  shown.value = false; await nextTick(); await vi.advanceTimersByTimeAsync(30000)
  expect(api.getFabric).toHaveBeenCalledTimes(1)
  shown.value = true; await nextTick(); await flushPromises()
  expect(api.getFabric).toHaveBeenCalledTimes(2)
  expect(detail.record.value?.id).toBe(1)
  wrapper.unmount()
})
it('invalidates old Fabric and account responses and pending refreshes', async() => {
  const { id, detail, wrapper } = owner(); await flushPromises()
  let resolve!: (value: unknown) => void
  api.getFabric.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  void detail.load(); void detail.load()
  const signal = api.getFabric.mock.calls[1][1] as AbortSignal
  id.value = 2; await nextTick(); await flushPromises()
  expect(signal.aborted).toBe(true)
  expect(api.getFabric.mock.calls[2][0]).toBe(2)
  resolve({ data: { id: 1, version: 99 }}); await flushPromises()
  expect(detail.record.value?.id).toBe(2)
  expect(detail.record.value?.version).toBe(1)
  useUserStore().token = 'another'
  await nextTick(); await vi.advanceTimersByTimeAsync(30000)
  expect(detail.record.value).toBeUndefined()
  expect(api.getFabric).toHaveBeenCalledTimes(3)
  wrapper.unmount()
})

it('keeps task cadence during a slow detail completion and its queued periodic follow-up', async() => {
  let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() {
    const detail = useFabricDetail(() => 1)
    tasks = useFabricTasks(() => 1, detail.load)
    return () => h('div')
  } }))
  await flushPromises()
  let resolve!: (value: unknown) => void
  api.getFabric.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  tasks.track('collection', { id: 31, fabricId: 1, version: 1, status: 'running' } as never)
  tasks.track('change', { id: 21, fabricId: 1, version: 1, status: 'running' } as never)
  api.getCollection.mockResolvedValue({ data: { id: 31, fabricId: 1, version: 2, status: 'succeeded' }})
  api.getChange.mockResolvedValue({ data: { id: 21, fabricId: 1, version: 2, status: 'running' }})
  let settled = false
  const refreshing = tasks.refresh().then(() => { settled = true })
  await flushPromises()
  await vi.advanceTimersByTimeAsync(3000)
  expect(api.getChange).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(12000)
  expect(api.listChange).toHaveBeenCalledTimes(2)
  expect(api.getFabric).toHaveBeenCalledTimes(2)
  expect(settled).toBe(false)
  resolve({ data: { id: 1, version: 2 }})
  await refreshing
  expect(api.getFabric).toHaveBeenCalledTimes(3)
  expect(settled).toBe(true)
  wrapper.unmount()
})
