/* eslint-disable vue/one-component-per-file -- mounted owners model request lifecycles */
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChangeCandidates } from '@/views/network/fabric/use-candidates'
import { getChangeCandidates } from '@/api/network/fabric'
import type { ChangeCandidateInput, ChangeCandidates } from '@/types/network-fabric'
import type { ApiResponse } from '@/types/api'

vi.mock('@/api/network/fabric', () => ({ getChangeCandidates: vi.fn() }))
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }
const result = (sourceDeviceId: number): ApiResponse<ChangeCandidates> => ({ code: 200, msg: '', data: { sourceDeviceId, kind: 'vlan_vni_add', vni: 10100, ready: [{ deviceId: 7, name: 'missing', ip: '192.0.2.7', reason: 'ready' }], unchanged: [{ deviceId: 8, name: 'matches', ip: '192.0.2.8', reason: 'already_satisfied' }], blocked: [] }})

describe('Fabric missing-device candidate ownership', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })
  it('clears stale candidates immediately and prevents an older source response from replacing the current source', async() => {
    const previous = deferred<ApiResponse<ChangeCandidates>>()
    const current = deferred<ApiResponse<ChangeCandidates>>()
    vi.mocked(getChangeCandidates).mockImplementation((_id, input) => input.sourceDeviceId === 1 ? previous.promise : current.promise)
    const input = ref<ChangeCandidateInput | undefined>({ sourceDeviceId: 1, kind: 'vlan_vni_add', vni: 10100, targetDeviceIds: [7, 8] })
    let state!: ReturnType<typeof useChangeCandidates>
    const wrapper = mount(defineComponent({ setup() { state = useChangeCandidates(1, () => input.value); return () => h('div') } }))
    input.value = { ...input.value!, sourceDeviceId: 2 }
    expect(state.candidates.value).toBeUndefined()
    current.resolve(result(2)); await current.promise; await nextTick()
    expect(state.candidates.value?.sourceDeviceId).toBe(2)
    previous.resolve(result(1)); await previous.promise; await nextTick()
    expect(state.candidates.value?.sourceDeviceId).toBe(2)
    expect(vi.mocked(getChangeCandidates).mock.calls[0][1].targetDeviceIds).toEqual([7, 8])
    input.value = undefined
    expect(state.candidates.value).toBeUndefined()
    expect(state.loading.value).toBe(false)
    wrapper.unmount()
  })
  it('does not reuse an earlier eligibility result after a failed refresh, and can retry', async() => {
    vi.mocked(getChangeCandidates).mockResolvedValueOnce(result(1)).mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce(result(1))
    let state!: ReturnType<typeof useChangeCandidates>
    const wrapper = mount(defineComponent({ setup() { state = useChangeCandidates(1, () => ({ sourceDeviceId: 1, kind: 'vlan_vni_add', vni: 10100 })); return () => h('div') } }))
    await nextTick(); await nextTick()
    expect(state.candidates.value?.ready.map(candidate => candidate.deviceId)).toEqual([7])
    await state.refresh()
    expect(state.candidates.value).toBeUndefined()
    expect(state.failed.value).toBe(true)
    await state.refresh()
    expect(state.failed.value).toBe(false)
    expect(state.candidates.value?.unchanged.map(candidate => candidate.deviceId)).toEqual([8])
    wrapper.unmount()
  })
})
