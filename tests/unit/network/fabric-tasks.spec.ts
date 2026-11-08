/* eslint-disable vue/one-component-per-file -- independent mounted owners exercise task lifecycle isolation */
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useFabricTasks } from '@/views/network/fabric/use-tasks'
import { sourceConfiguration } from '@/views/network/fabric/presentation'
import { useUserStore } from '@/stores/user'
import { fabricFixture } from '../../fixtures/network-fabric'
const api = vi.hoisted(() => ({ listCollection: vi.fn(), listChange: vi.fn(), getCollection: vi.fn(), getChange: vi.fn() }))
vi.mock('@/api/network/fabric', () => api)
beforeEach(() => {
  vi.useFakeTimers(); setActivePinia(createPinia())
  Object.values(api).forEach(mock => mock.mockReset())
  api.listCollection.mockResolvedValue({ data: { list: [], count: 0 }})
  api.listChange.mockResolvedValue({ data: { list: [], count: 0 }})
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})
afterEach(() => vi.useRealTimers())
it('uses the selected device SVI scope even when a different VRF has the same VNI', () => {
  const fabric = fabricFixture()
  fabric.segments = [{ vni: 10100, vrf: 'OTHER', state: 'unknown', cells: [{ deviceId: 2, configuration: { svi: { vrf: 'OTHER' }}, state: 'unknown', aclIn: '', aclOut: '' }] }, { vni: 10100, vrf: 'AGGREGATE', state: 'unknown', cells: [{ deviceId: 1, configuration: { svi: { vrf: 'SOURCE' }}, state: 'unknown', aclIn: '', aclOut: '' }] }]
  expect(sourceConfiguration(fabric.segments, 10100, 1)?.vrf).toBe('SOURCE')
})
it('tracks independently of drawers, refreshes once on terminal and pauses hidden requests', async() => {
  const terminal = vi.fn(); let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, terminal); return () => h('div') } }))
  await flushPromises()
  tasks.track('collection', { id: 31, fabricId: 1, status: 'queued' } as never)
  api.getCollection.mockResolvedValue({ data: { id: 31, fabricId: 1, status: 'succeeded' }})
  Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'))
  await vi.advanceTimersByTimeAsync(6000); expect(api.getCollection).not.toHaveBeenCalled()
  Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); await flushPromises()
  expect(terminal).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(6000); expect(terminal).toHaveBeenCalledTimes(1)
  wrapper.unmount()
})
it('aborts and ignores late responses when account or Fabric ownership changes', async() => {
  let resolve!: (result: unknown) => void
  api.getCollection.mockImplementation(() => new Promise(done => { resolve = done }))
  const id = ref(1); const terminal = vi.fn(); let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => id.value, terminal); return () => h('div') } }))
  await flushPromises(); tasks.track('collection', { id: 31, fabricId: 1, status: 'running' } as never)
  await vi.advanceTimersByTimeAsync(3000)
  const signal = api.getCollection.mock.calls[0][1] as AbortSignal
  useUserStore().token = 'other'; await nextTick()
  expect(signal.aborted).toBe(true)
  resolve({ data: { id: 31, fabricId: 1, status: 'succeeded' }}); await flushPromises()
  expect(terminal).not.toHaveBeenCalled(); expect(tasks.collections.value).toEqual({})
  id.value = 2; await nextTick(); wrapper.unmount()
})
it('discovers only active jobs, retains evidence on failed polling and retries', async() => {
  api.listCollection.mockResolvedValue({ data: { list: [{ id: 31, fabricId: 1, status: 'running' }], count: 1 }})
  api.getCollection.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { id: 31, fabricId: 1, status: 'succeeded' }})
  const terminal = vi.fn(); let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, terminal); return () => h('div') } }))
  await flushPromises()
  expect(api.listCollection.mock.calls[0][1]).toMatchObject({ status: 'active' })
  expect(tasks.collections.value[31].status).toBe('running'); expect(tasks.failed.value).toBe(true)
  await vi.advanceTimersByTimeAsync(3000)
  expect(tasks.collections.value[31].status).toBe('succeeded'); expect(tasks.failed.value).toBe(false)
  expect(terminal).toHaveBeenCalledTimes(1); wrapper.unmount()
})
it('does not query restricted partial scope and aborts when that scope changes', async() => {
  const enabled = ref(false); let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, vi.fn(), () => enabled.value); return () => h('div') } }))
  await flushPromises(); expect(api.listCollection).not.toHaveBeenCalled()
  enabled.value = true; await nextTick(); await flushPromises()
  expect(api.listCollection).toHaveBeenCalledTimes(1)
  tasks.track('collection', { id: 31, fabricId: 1, status: 'queued' } as never)
  enabled.value = false; await nextTick(); await vi.advanceTimersByTimeAsync(6000)
  expect(api.getCollection).not.toHaveBeenCalled(); expect(tasks.collections.value).toEqual({})
  wrapper.unmount()
})

it.each(['partial', 'failed', 'interrupted'])('refreshes a %s collection once and rejects a late older active snapshot', async status => {
  const completed = vi.fn(); let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, completed); return () => h('div') } }))
  await flushPromises()
  tasks.track('collection', { id: 31, fabricId: 1, version: 2, status: 'running' } as never)
  await tasks.track('collection', { id: 31, fabricId: 1, version: 3, status } as never)
  tasks.track('collection', { id: 31, fabricId: 1, version: 2, status: 'running' } as never)
  expect(tasks.collections.value[31].status).toBe(status)
  expect(completed).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(6000)
  expect(api.getCollection).not.toHaveBeenCalled()
  wrapper.unmount()
})
it('rejects stale preview responses and retains uncertain change outcomes', async() => {
  const completed = vi.fn(); let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, completed); return () => h('div') } }))
  await flushPromises()
  tasks.track('change', { id: 21, fabricId: 1, version: 2, status: 'queued' } as never)
  tasks.track('change', { id: 21, fabricId: 1, version: 1, status: 'preview' } as never)
  expect(tasks.changes.value[21].status).toBe('queued')
  expect(completed).not.toHaveBeenCalled()
  await tasks.track('change', { id: 21, fabricId: 1, version: 4, status: 'uncertain' } as never)
  expect(completed).toHaveBeenCalledTimes(1)
  expect(tasks.changes.value[21].status).toBe('uncertain')
  wrapper.unmount()
})

it('continues tracking other jobs when one task refresh fails', async() => {
  const completed = vi.fn(); let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, completed); return () => h('div') } }))
  await flushPromises()
  tasks.track('collection', { id: 31, fabricId: 1, version: 2, status: 'running' } as never)
  tasks.track('change', { id: 21, fabricId: 1, version: 2, status: 'running' } as never)
  api.getCollection.mockRejectedValue(new Error('unavailable'))
  api.getChange.mockResolvedValue({ data: { id: 21, fabricId: 1, version: 3, status: 'uncertain' }})
  await vi.advanceTimersByTimeAsync(3000)
  expect(tasks.failed.value).toBe(true)
  expect(tasks.collections.value[31].status).toBe('running')
  expect(tasks.changes.value[21].status).toBe('uncertain')
  expect(completed).toHaveBeenCalledTimes(1)
  wrapper.unmount()
})

it('discovers external jobs every 15 seconds after an initially empty result and polls known jobs every 3 seconds', async() => {
  let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, vi.fn()); return () => h('div') } }))
  await flushPromises()
  api.listCollection.mockResolvedValue({ data: { list: [{ id: 41, fabricId: 1, version: 1, status: 'running' }], count: 1 }})
  api.getCollection.mockResolvedValue({ data: { id: 41, fabricId: 1, version: 1, status: 'running' }})
  await vi.advanceTimersByTimeAsync(14999)
  expect(api.listCollection).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1)
  expect(tasks.collections.value[41]?.status).toBe('running')
  expect(api.listCollection).toHaveBeenCalledTimes(2)
  const calls = api.getCollection.mock.calls.length
  await vi.advanceTimersByTimeAsync(3000)
  expect(api.getCollection).toHaveBeenCalledTimes(calls + 1)
  expect(api.listCollection).toHaveBeenCalledTimes(2)
  wrapper.unmount()
})
it('batches simultaneous terminal observations and awaits the completion refresh', async() => {
  let finish!: () => void
  const completed = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
  let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, completed); return () => h('div') } }))
  await flushPromises()
  tasks.track('collection', { id: 31, fabricId: 1, version: 1, status: 'running' } as never)
  tasks.track('change', { id: 21, fabricId: 1, version: 1, status: 'running' } as never)
  api.getCollection.mockResolvedValue({ data: { id: 31, fabricId: 1, version: 2, status: 'succeeded' }})
  api.getChange.mockResolvedValue({ data: { id: 21, fabricId: 1, version: 2, status: 'uncertain' }})
  let settled = false
  const refreshing = tasks.refresh().then(() => { settled = true })
  await flushPromises()
  expect(completed).toHaveBeenCalledTimes(1)
  expect(settled).toBe(false)
  finish(); await refreshing
  expect(settled).toBe(true)
  wrapper.unmount()
})
it('isolates failed discovery from known task tracking and other task kinds', async() => {
  let tasks!: ReturnType<typeof useFabricTasks>
  const completed = vi.fn()
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, completed); return () => h('div') } }))
  await flushPromises()
  tasks.track('change', { id: 21, fabricId: 1, version: 1, status: 'running' } as never)
  api.listCollection.mockRejectedValue(new Error('offline'))
  api.getChange.mockResolvedValue({ data: { id: 21, fabricId: 1, version: 2, status: 'uncertain' }})
  await vi.advanceTimersByTimeAsync(15000)
  expect(api.listChange).toHaveBeenCalledTimes(2)
  expect(tasks.changes.value[21].status).toBe('uncertain')
  expect(tasks.failed.value).toBe(true)
  wrapper.unmount()
})

it('does not duplicate discovery on first KeepAlive activation and discovers immediately on reactivation', async() => {
  const shown = ref(true)
  const child = defineComponent({ setup() { useFabricTasks(() => 1, vi.fn()); return () => h('div') } })
  const wrapper = mount(defineComponent({ setup: () => () => h(KeepAlive, () => shown.value ? h(child) : null) }))
  await flushPromises(); expect(api.listCollection).toHaveBeenCalledTimes(1)
  shown.value = false; await nextTick(); await vi.advanceTimersByTimeAsync(30000)
  expect(api.listCollection).toHaveBeenCalledTimes(1)
  shown.value = true; await nextTick(); await flushPromises()
  expect(api.listCollection).toHaveBeenCalledTimes(2)
  wrapper.unmount()
})
it('discards late failed completion callbacks after ownership invalidation', async() => {
  let reject!: (reason: Error) => void
  const completed = () => new Promise<void>((_, fail) => { reject = fail })
  const enabled = ref(true); let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, completed, () => enabled.value); return () => h('div') } }))
  await flushPromises()
  tasks.track('collection', { id: 31, fabricId: 1, version: 1, status: 'running' } as never)
  const notifying = tasks.track('collection', { id: 31, fabricId: 1, version: 2, status: 'succeeded' } as never)
  await flushPromises()
  enabled.value = false
  reject(new Error('old owner')); await notifying
  expect(tasks.failed.value).toBe(false)
  expect(tasks.collections.value).toEqual({})
  wrapper.unmount()
})
it('keeps periodic discovery alive after an idle manual refresh with no task reads', async() => {
  let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, vi.fn()); return () => h('div') } }))
  await flushPromises()
  await tasks.refresh()
  await vi.advanceTimersByTimeAsync(15000)
  expect(api.listCollection).toHaveBeenCalledTimes(2)
  wrapper.unmount()
})
it('coalesces terminal snapshots from one drawer history response into one awaitable completion', async() => {
  const completed = vi.fn(); let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, completed); return () => h('div') } }))
  await flushPromises()
  tasks.track('collection', { id: 31, fabricId: 1, version: 1, status: 'running' } as never)
  tasks.track('collection', { id: 32, fabricId: 1, version: 1, status: 'running' } as never)
  const first = tasks.track('collection', { id: 31, fabricId: 1, version: 2, status: 'succeeded' } as never)
  const second = tasks.track('collection', { id: 32, fabricId: 1, version: 2, status: 'partial' } as never)
  await Promise.all([first, second])
  expect(completed).toHaveBeenCalledTimes(1)
  wrapper.unmount()
})
it('continues active polling and discovery while a completed task assessment remains awaitable', async() => {
  let finish!: () => void
  const completed = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
  let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, completed); return () => h('div') } }))
  await flushPromises()
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
  expect(api.listCollection).toHaveBeenCalledTimes(2)
  expect(api.listChange).toHaveBeenCalledTimes(2)
  expect(settled).toBe(false)
  expect(completed).toHaveBeenCalledTimes(1)
  finish(); await refreshing
  expect(settled).toBe(true)
  wrapper.unmount()
})
it('does not release a newer task request when an older completion callback settles', async() => {
  let finish!: () => void
  const completed = () => new Promise<void>(resolve => { finish = resolve })
  let tasks!: ReturnType<typeof useFabricTasks>
  const wrapper = mount(defineComponent({ setup() { tasks = useFabricTasks(() => 1, completed); return () => h('div') } }))
  await flushPromises()
  tasks.track('collection', { id: 31, fabricId: 1, version: 1, status: 'running' } as never)
  tasks.track('change', { id: 21, fabricId: 1, version: 1, status: 'running' } as never)
  api.getCollection.mockResolvedValue({ data: { id: 31, fabricId: 1, version: 2, status: 'succeeded' }})
  api.getChange.mockResolvedValueOnce({ data: { id: 21, fabricId: 1, version: 2, status: 'running' }})
  let resolvePoll!: (value: unknown) => void
  api.getChange.mockImplementationOnce(() => new Promise(done => { resolvePoll = done }))
  const old = tasks.refresh(); await flushPromises()
  await vi.advanceTimersByTimeAsync(3000)
  expect(api.getChange).toHaveBeenCalledTimes(2)
  finish(); await old
  const current = tasks.refresh(); await flushPromises()
  expect(api.getChange).toHaveBeenCalledTimes(2)
  // Older task versions still cannot replace the newer active evidence.
  resolvePoll({ data: { id: 21, fabricId: 1, version: 1, status: 'uncertain' }})
  await current
  expect(tasks.changes.value[21].status).toBe('running')
  expect(tasks.changes.value[21].version).toBe(2)
  wrapper.unmount()
})
