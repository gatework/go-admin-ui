import { describe, expect, it } from 'vitest'
import { emptyCircuitDraft, circuitPayload, toCircuitDraft, validateCircuit } from '@/views/network/circuit/form'
import { formatRate, trafficChartOptions } from '@/views/network/circuit/traffic-chart'
import { circuitFixture, trafficFixture } from '../../fixtures/network-circuit'

describe('circuit drafts', () => {
  it('copies nested endpoints, preserves the fetched version and only sends writable fields', () => {
    const source = circuitFixture()
    const draft = toCircuitDraft(source)
    draft.aEndpoint.address = 'Changed by editor'
    draft.circuitNo = '  test/line-1 '
    draft.fee = '12.5'
    const payload = circuitPayload(draft)
    expect(source.aEndpoint.address).toBe('Building A')
    expect(payload).toMatchObject({ version: 3, circuitNo: 'TEST/LINE-1', fee: '12.50' })
    expect(payload).not.toHaveProperty('id')
    expect(payload).not.toHaveProperty('createdAt')
    expect(payload.aEndpoint.monitoring.hostId).toBe('11')
  })

  it('rejects impossible dates, backwards terms, invalid fee, bandwidth and endpoint ownership', () => {
    const draft = toCircuitDraft(circuitFixture())
    Object.assign(draft, { installedOn: '2026-02-30', expiresOn: '2026-01-01', fee: '10000000000.00', bandwidthMbps: 0 })
    draft.zEndpoint.deviceId = draft.aEndpoint.deviceId
    draft.zEndpoint.ip = '999.1.2.3'
    expect(validateCircuit(draft)).toMatchObject({ installedOn: 'date', expiresOn: 'dateOrder', fee: 'fee', bandwidthMbps: 'bandwidth', 'zEndpoint.deviceId': 'sameDevice', 'zEndpoint.ip': 'ip' })
  })

  it('validates enum, identifier, NUL, bindings and terminated transitions', () => {
    const draft = toCircuitDraft(circuitFixture())
    draft.circuitNo = '/invalid'
    draft.name = 'bad\0name'
    draft.category = 'obsolete' as typeof draft.category
    draft.aEndpoint.monitoring.outItemId = draft.aEndpoint.monitoring.inItemId
    expect(validateCircuit(draft, 'terminated')).toMatchObject({ circuitNo: 'circuitNo', name: 'text', category: 'enum', status: 'terminated', 'aEndpoint.monitoring.outItemId': 'sameItem' })
  })

  it('allows an unmonitored circuit with unknown bandwidth and a zero fee', () => {
    const draft = emptyCircuitDraft()
    Object.assign(draft, { circuitNo: ' test-1 ', name: 'Test', provider: 'Example', fee: '0', installedOn: '2024-02-29' })
    draft.aEndpoint.ip = '2001:db8::1'
    expect(validateCircuit(draft)).toEqual({})
    expect(circuitPayload(draft)).toMatchObject({ bandwidthMbps: null, fee: '0.00', status: 'planned', version: 0 })
  })
})

describe('traffic presentation', () => {
  it('keeps missing rates distinct from zero without changing Bps data twice', () => {
    expect(formatRate(null)).toBe('—')
    expect(formatRate(0)).toBe('0 bps')
    expect(formatRate(1250000)).toBe('1.25 Mbps')
    expect(formatRate(Number.NaN)).toBe('—')
  })

  it('preserves gaps, uses supplied full-sample peaks and visually distinguishes directions', () => {
    const response = trafficFixture()
    const options = trafficChartOptions(response.series, { in: 'Ingress', out: 'Egress' }, { text: '#222', grid: '#ddd', in: '#146', out: '#691' }, 'Asia/Hong_Kong')
    const series = options.series as { connectNulls: boolean, data: unknown[], lineStyle: { type: string }}[]
    expect(series[0].connectNulls).toBe(false)
    expect(series[0].data).toEqual([[1793000000000, 1000], [1793000060000, null], [1793000120000, 0]])
    expect(series[0].lineStyle.type).toBe('solid')
    expect(series[1].lineStyle.type).toBe('dashed')
    expect(response.series[0].peakBps).toBe(9000)
  })
})
