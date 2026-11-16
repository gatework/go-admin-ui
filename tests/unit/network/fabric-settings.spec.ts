/* eslint-disable vue/one-component-per-file -- lightweight view boundaries retain real settings behavior */
import { defineComponent, h, KeepAlive, nextTick, ref, type PropType } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import Collection from '@/views/network/fabric/collection.vue'
import { useUserStore } from '@/stores/user'
import type { Fabric } from '@/types/network-fabric'
const api = vi.hoisted(() => ({ updateSettings: vi.fn(), listCollection: vi.fn(), addCollection: vi.fn(), getCollection: vi.fn() }))
vi.mock('@/api/network/fabric', () => api)
const fabric = (version = 1, runtimeMinutes = 5, id = 1) => ({ id, version, collectionEnabled: false, runtimeMinutes, configMinutes: 30 } as Fabric)
const slot = defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) })
const form = defineComponent({ props: { model: { type: Object as PropType<Pick<Fabric, 'version' | 'collectionEnabled' | 'runtimeMinutes' | 'configMinutes'>>, required: true }}, setup: (_, { slots }) => () => h('form', slots.default?.()) })
const button = defineComponent({ props: { disabled: Boolean, loading: Boolean }, emits: ['click'], setup: (props, { slots, emit }) => () => h('button', { disabled: props.disabled || props.loading, onClick: () => emit('click') }, slots.default?.()) })
const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => { vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} })); setActivePinia(createPinia()); useUserStore().permisaction = ['network:fabric:edit']; Object.values(api).forEach(mock => mock.mockReset()); api.listCollection.mockResolvedValue({ data: { list: [], count: 0 }}); api.updateSettings.mockResolvedValue({ data: fabric(2, 12) }) })
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.unstubAllGlobals() })
function owner(refresh = vi.fn(async() => {}), cached = false) {
  const shown = ref(true)
  const component = cached ? defineComponent({ setup: () => () => h(KeepAlive, () => shown.value ? h(Collection, { visible: true, fabric: fabric() }) : null) }) : Collection
  const wrapper = mount(component, { props: { visible: true, fabric: fabric() }, global: { provide: { refreshFabric: refresh, fabricTasks: undefined }, stubs: { AppDrawer: slot, ProTable: true, AForm: form, AFormItem: slot, AButton: button, AInputNumber: true, ASwitch: true, AAlert: slot, ASelect: true, AOption: true, ATableColumn: true }}})
  wrappers.push(wrapper)
  const settings = () => wrapper.findComponent(form).props('model') as Pick<Fabric, 'version' | 'collectionEnabled' | 'runtimeMinutes' | 'configMinutes'>
  const save = async() => { await wrapper.findAll('button').find(item => item.text() === '保存')!.trigger('click'); await flushPromises() }
  const reload = async() => { await wrapper.findAll('button').find(item => item.text() === '载入最新设置')!.trigger('click'); await flushPromises() }
  return { wrapper, settings, save, reload, shown }
}
it('syncs every pristine setting and version from refreshed props', async() => {
  const { wrapper, settings } = owner(); await wrapper.setProps({ fabric: { ...fabric(3, 15), collectionEnabled: true, configMinutes: 90 }})
  expect(settings()).toEqual({ version: 3, runtimeMinutes: 15, configMinutes: 90, collectionEnabled: true })
})
it('preserves dirty values and original version, ignoring same-version evidence refreshes', async() => {
  const { wrapper, settings, reload } = owner(); settings().runtimeMinutes = 7
  await wrapper.setProps({ fabric: fabric(1, 99) }); expect(wrapper.text()).not.toContain('载入最新设置')
  await wrapper.setProps({ fabric: fabric(2, 14) }); expect(settings().runtimeMinutes).toBe(7); expect(settings().version).toBe(1)
  expect(wrapper.text()).toContain('载入最新设置'); await reload(); expect(settings().runtimeMinutes).toBe(14); expect(settings().version).toBe(2)
})
it.each([0, 1441, 1.5, NaN])('rejects an invalid settings interval %s', async(value) => {
  const { settings, save } = owner(); settings().runtimeMinutes = value; await save(); expect(api.updateSettings).not.toHaveBeenCalled()
})
it('applies the complete authoritative success and ignores stale parent values', async() => {
  api.updateSettings.mockResolvedValueOnce({ data: { ...fabric(2, 12), collectionEnabled: true, configMinutes: 120 }})
  const { wrapper, settings, save } = owner(); settings().runtimeMinutes = 7; await save()
  expect(settings()).toEqual({ version: 2, runtimeMinutes: 12, configMinutes: 120, collectionEnabled: true }); expect(wrapper.emitted('changed')).toHaveLength(1)
  await wrapper.setProps({ fabric: fabric(1, 5) }); expect(settings().version).toBe(2)
  await wrapper.setProps({ fabric: fabric(3, 19) }); expect(settings().runtimeMinutes).toBe(19)
})
it('preserves a failed draft and allows a non-conflict retry', async() => {
  api.updateSettings.mockRejectedValueOnce(new Error('offline'))
  const { settings, save } = owner(); settings().runtimeMinutes = 8; await save(); expect(settings().version).toBe(1); expect(settings().runtimeMinutes).toBe(8)
  await save(); expect(settings().version).toBe(2)
})
it.each([{ code: 409 }, { response: { status: 409 }}])('blocks conflict retries until a genuinely newer explicit reload', async(error) => {
  api.updateSettings.mockRejectedValueOnce(error)
  const refresh = vi.fn(async() => {})
  const { wrapper, settings, save, reload } = owner(refresh); settings().runtimeMinutes = 8; await save(); await save()
  expect(api.updateSettings).toHaveBeenCalledTimes(1); await reload(); expect(refresh).toHaveBeenCalledTimes(1)
  await save(); expect(api.updateSettings).toHaveBeenCalledTimes(1); expect(settings().runtimeMinutes).toBe(8)
  await wrapper.setProps({ fabric: fabric(4, 21) }); expect(settings().version).toBe(1); await reload(); expect(settings().version).toBe(4)
  await save(); expect(api.updateSettings).toHaveBeenCalledTimes(2)
})
it('awaits the parent refresh propagation before loading a newer baseline', async() => {
  api.updateSettings.mockRejectedValueOnce({ code: 409 })
  const refresh = vi.fn(async() => { await wrapper.setProps({ fabric: fabric(3, 18) }) })
  const { wrapper, settings, save, reload } = owner(refresh); settings().runtimeMinutes = 8; await save(); await reload(); expect(settings().version).toBe(3); expect(settings().runtimeMinutes).toBe(18)
})
it('does not regress an external version observed while saving and guards duplicate submissions', async() => {
  let resolve!: (value: unknown) => void
  api.updateSettings.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  const { wrapper, settings, save } = owner(); settings().runtimeMinutes = 7; await save(); await save(); expect(api.updateSettings).toHaveBeenCalledTimes(1)
  await wrapper.setProps({ fabric: fabric(5, 24) }); resolve({ data: fabric(2, 12) }); await flushPromises(); expect(settings().version).toBe(5); expect(settings().runtimeMinutes).toBe(24)
})
it.each(['close', 'fabric', 'account', 'unmount'])('ignores late save completion after %s', async(kind) => {
  let resolve!: (value: unknown) => void
  api.updateSettings.mockImplementationOnce(() => new Promise(done => { resolve = done }))
  const { wrapper, settings, save } = owner(); settings().runtimeMinutes = 7; await save()
  if (kind === 'close') await wrapper.setProps({ visible: false })
  if (kind === 'fabric') await wrapper.setProps({ fabric: fabric(1, 9, 2) })
  if (kind === 'account') { useUserStore().token = 'other'; await nextTick() }
  if (kind === 'unmount') wrapper.unmount()
  resolve({ data: fabric(2, 12) }); await flushPromises(); expect(wrapper.emitted('changed')).toBeUndefined()
})
it('keeps a transport conflict after a rejected refresh and preserves the draft', async() => {
  api.updateSettings.mockRejectedValueOnce({ response: { status: 409 }})
  const { wrapper, settings, save, reload } = owner(vi.fn(async() => { throw new Error('offline') }))
  settings().configMinutes = 60; await save(); await reload(); await save()
  expect(settings().configMinutes).toBe(60); expect(settings().version).toBe(1); expect(api.updateSettings).toHaveBeenCalledTimes(1)
  expect(wrapper.text()).toContain('未能取得更新的设置')
})
it.each(['close', 'fabric', 'account', 'unmount'])('ignores a late conflict reload after %s', async(kind) => {
  let resolve!: () => void
  api.updateSettings.mockRejectedValueOnce({ code: 409 })
  const { wrapper, settings, save, reload } = owner(vi.fn(() => new Promise<void>(done => { resolve = done })))
  settings().runtimeMinutes = 8; await save(); await reload()
  if (kind === 'close') await wrapper.setProps({ visible: false })
  if (kind === 'fabric') await wrapper.setProps({ fabric: fabric(1, 9, 2) })
  if (kind === 'account') useUserStore().token = 'another'
  if (kind === 'unmount') wrapper.unmount()
  resolve(); await flushPromises()
  if (kind === 'fabric') expect(settings()).toEqual({ version: 1, runtimeMinutes: 9, configMinutes: 30, collectionEnabled: false })
  expect(wrapper.emitted('changed')).toBeUndefined()
})
it('cannot start a settings write after account invalidation while old props remain mounted', async() => {
  const { settings, save } = owner(); settings().runtimeMinutes = 8; useUserStore().token = 'another'; await save()
  expect(api.updateSettings).not.toHaveBeenCalled()
})
it('uses the newest parent settings when reopening after a hidden refresh', async() => {
  const { wrapper, settings } = owner(); await wrapper.setProps({ visible: false }); await wrapper.setProps({ fabric: fabric(4, 28) }); await wrapper.setProps({ visible: true })
  expect(settings().version).toBe(4); expect(settings().runtimeMinutes).toBe(28)
})
it('reconciles a pristine external update when a pending operation releases its lock', async() => {
  let reject!: (error: unknown) => void
  api.updateSettings.mockImplementationOnce(() => new Promise((_done, failed) => { reject = failed }))
  const { wrapper, settings, save } = owner(); await save(); await wrapper.setProps({ fabric: fabric(4, 25) })
  expect(settings().version).toBe(1); reject(new Error('offline')); await flushPromises()
  expect(settings().version).toBe(4); expect(settings().runtimeMinutes).toBe(25)
})
it('reconciles an external update when the user restores the draft to its original baseline', async() => {
  const { wrapper, settings } = owner(); settings().runtimeMinutes = 8; await wrapper.setProps({ fabric: fabric(4, 25) })
  settings().runtimeMinutes = 5; await nextTick(); expect(settings().version).toBe(4); expect(settings().runtimeMinutes).toBe(25)
})
it.each([false, true])('resumes a cached settings owner without reviving an invalidated account (%s)', async(changedAccount) => {
  const { shown, settings, save } = owner(vi.fn(async() => {}), true)
  settings().runtimeMinutes = 8; shown.value = false; await nextTick()
  if (changedAccount) useUserStore().token = 'other-account'
  shown.value = true; await nextTick(); await save()
  expect(api.updateSettings).toHaveBeenCalledTimes(changedAccount ? 0 : 1)
})
