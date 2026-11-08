/* eslint-disable vue/one-component-per-file -- independent mounted owners exercise session isolation */
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useOperation } from '@/views/network/fabric/use-operation'
import { parseLocation, parseChangeLocation, parseIssueLocation, deviceIssues, stateColor, networkCIDR } from '@/views/network/fabric/presentation'
import { problemFixture } from '../../fixtures/network-fabric'
import { useUserStore } from '@/stores/user'

const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }

describe('Fabric workspace ownership', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('accepts only a safe Fabric ID and a known tab from a shared URL', () => {
    expect(parseLocation({ fabric: '6', tab: 'segments', endpoint: '192.0.2.0/24' })).toEqual({ id: 6, tab: 'segments', endpoint: '192.0.2.0/24' })
    for (const fabric of ['-1', '0', '1.2', 'Infinity', ['1'], '9007199254740992']) {
      expect(parseLocation({ fabric, tab: 'arbitrary' }).id).toBeUndefined()
    }
    expect(parseLocation({ tab: ['changes'], endpoint: ['private'] })).toEqual({ id: undefined, tab: 'overview', endpoint: '' })
  })
  it('restores only valid problem and device query state', () => {
    expect(parseIssueLocation({ issue: 'opaque-key', device: '4', issueStatus: 'unknown', issueScope: 'service' })).toEqual({ issue: 'opaque-key', device: 4, status: 'unknown', scope: 'service' })
    for (const device of ['0', '-1', '1.2', '9007199254740992', ['4']]) expect(parseIssueLocation({ device }).device).toBeUndefined()
    expect(parseIssueLocation({ issue: ['secret'], issueStatus: 'passing', issueScope: ['old'] })).toEqual({ issue: '', device: undefined, status: '', scope: '' })
  })
  it('lists only a device own affected or unknown groups while retaining positive comparison evidence', () => {
    const groups = problemFixture().issueGroups
    expect(deviceIssues(groups, 1).map(group => group.key)).toEqual(['isolated-20200-presence'])
    expect(deviceIssues(groups, 2).map(group => group.key)).toEqual(['production-10100-presence', 'production-10100-acl-out'])
    expect(deviceIssues(groups, 3)).toEqual([])
    expect(deviceIssues(groups, 4)).toHaveLength(3)
    expect(groups[0].devices.find(device => device.deviceId === 1)?.status).toBe('healthy')
  })
  it('keeps missing, stale and partial evidence distinct from health', () => {
    expect(stateColor('healthy')).toBe('green')
    for (const state of ['unknown', 'stale', 'partial', 'uncertain']) expect(stateColor(state)).toBe('orange')
    expect(stateColor('fault')).toBe('red')
  })
  it('preserves the exact affected target scope and cannot broaden a malformed quick action', () => {
    expect(parseChangeLocation({ kind: 'svi_acl', direction: 'out', targets: '2,4' })).toEqual({ kind: 'svi_acl', direction: 'out', targets: [2, 4] })
    expect(parseChangeLocation({ kind: 'vlan_vni_add', targets: '2,2' }).targets).toEqual([2])
    for (const targets of ['', '2,no', ['2'], '0', '-1']) expect(parseChangeLocation({ kind: 'svi_acl', direction: 'in', targets }).targets).toEqual([])
    expect(parseChangeLocation({ kind: 'svi_acl', targets: '2' }).targets).toEqual([])
    expect(parseChangeLocation({ kind: 'arbitrary', targets: '2' }).targets).toEqual([])
    expect(parseChangeLocation({}).targets).toBeUndefined()
  })
  it('shows network CIDR separately from the host gateway for IPv4 and IPv6', () => {
    expect(networkCIDR('10.1.0.254/24')).toBe('10.1.0.0/24')
    expect(networkCIDR('192.0.2.1/0')).toBe('0.0.0.0/0')
    expect(networkCIDR('2001:db8:1::1/64')).toBe('2001:db8:1::/64')
    expect(networkCIDR('::1/128')).toBe('::1/128')
    expect(networkCIDR('2001:db8::1/0')).toBe('::/0')
    expect(networkCIDR('malformed/24')).toBe('')
  })
  it('locks duplicate actions and discards a response after drawer closure', async() => {
    const response = deferred<number>()
    const request = vi.fn(() => response.promise)
    const apply = vi.fn()
    const wrapper = mount(defineComponent({ setup() {
      const operation = useOperation()
      return () => h('div', [h('button', { onClick: () => operation.run(request, apply) }, 'save'), h('button', { onClick: operation.invalidate }, 'close')])
    } }))
    await wrapper.findAll('button')[0].trigger('click')
    await wrapper.findAll('button')[0].trigger('click')
    expect(request).toHaveBeenCalledTimes(1)
    await wrapper.findAll('button')[1].trigger('click')
    response.resolve(1)
    await response.promise; await nextTick()
    expect(apply).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('does not apply an old account response and allows retry after failure', async() => {
    const response = deferred<number>()
    const apply = vi.fn()
    let operation!: ReturnType<typeof useOperation>
    const wrapper = mount(defineComponent({ setup() { operation = useOperation(); return () => h('div') } }))
    const running = operation.run(() => response.promise, apply)
    useUserStore().token = 'new-account'
    await nextTick()
    response.resolve(1); await running
    expect(apply).not.toHaveBeenCalled()
    await operation.run(() => Promise.reject(new Error('offline')), apply)
    expect(operation.pending.value).toBe(false)
    await operation.run(() => Promise.resolve(2), apply)
    expect(apply).toHaveBeenCalledWith(2)
    wrapper.unmount()
  })
})
