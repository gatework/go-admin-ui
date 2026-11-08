import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from '@/utils/request'
import { addCircuit, getCircuitTraffic, searchCircuitHosts, searchCircuitItems, updateCircuit } from '@/api/network/circuit'
import { circuitPayload, toCircuitDraft } from '@/views/network/circuit/form'
import { circuitFixture } from '../../fixtures/network-circuit'

vi.mock('@/utils/request', () => ({ default: vi.fn() }))

describe('circuit monitoring request deadline', () => {
  beforeEach(() => { vi.mocked(request).mockReset() })
  const payload = circuitPayload(toCircuitDraft(circuitFixture()))
  const signal = new AbortController().signal

  it.each([
    ['create with binding validation', () => addCircuit(payload), { url: '/api/v1/network-circuit', method: 'post', data: payload }],
    ['update with binding validation', () => updateCircuit(7, payload), { url: '/api/v1/network-circuit/7', method: 'put', data: payload }],
    ['host lookup', () => searchCircuitHosts('TEST', signal), { url: '/api/v1/network-circuit/zabbix/hosts', method: 'get', params: { keyword: 'TEST' }, signal }],
    ['item lookup', () => searchCircuitItems('22', 'traffic', signal), { url: '/api/v1/network-circuit/zabbix/items', method: 'get', params: { hostId: '22', keyword: 'traffic' }, signal }],
    ['traffic history', () => getCircuitTraffic(7, '24h', signal), { url: '/api/v1/network-circuit/7/traffic', method: 'get', params: { period: '24h' }, signal }]
  ] as const)('allows the backend 20 second deadline plus a bounded response margin for %s', async(_name, invoke, config) => {
    await invoke()
    expect(request).toHaveBeenCalledWith({ ...config, timeout: 25000 })
  })
})
