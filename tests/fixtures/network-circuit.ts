import type { Circuit, CircuitTraffic } from '../../src/types/network-circuit'

export function circuitFixture(): Circuit {
  return {
    id: 7, version: 3, circuitNo: 'TEST-CIRCUIT-7', name: 'Verification circuit', provider: 'Example Telecom', category: 'mpls', purpose: 'site_interconnect', status: 'planned', bandwidthMbps: 1000,
    region: 'Shenzhen', organization: 'Network team', contractNo: 'TEST-CONTRACT', installedOn: '2026-01-01', expiresOn: '2027-01-01', payer: 'us', fee: '1200.00', currency: 'CNY', billingCycle: 'monthly', routeNotes: '', notes: 'Isolated test fixture',
    aEndpoint: { deviceId: 8, name: 'Site A', address: 'Building A', interface: 'Gi0/1', ip: '192.0.2.1', contactName: 'Lee', contactPhone: '', monitoring: { hostId: '11', hostName: 'TEST-EDGE-A', inItemId: '101', inItemName: 'Inbound traffic', outItemId: '102', outItemName: 'Outbound traffic' }},
    zEndpoint: { deviceId: null, name: 'Site Z', address: 'Building Z', interface: '', ip: '2001:db8::1', contactName: '', contactPhone: '', monitoring: { hostId: '', hostName: '', inItemId: '', inItemName: '', outItemId: '', outItemName: '' }},
    createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-26T02:00:00Z'
  }
}

export function trafficFixture(): CircuitTraffic {
  return { configured: true, period: '1h', timeFrom: 1793000000000, timeTill: 1793003600000, series: [
    { side: 'a', direction: 'in', hostId: '11', itemId: '101', name: 'Inbound traffic', hostName: 'TEST-EDGE-A', interface: 'Gi0/1', state: 'stale', mode: 'history', currentBps: null, peakBps: 9000, lastSampleAt: 1793000120000, partial: true, points: [[1793000000000, 1000], [1793000060000, null], [1793000120000, 0]] },
    { side: 'a', direction: 'out', hostId: '11', itemId: '102', name: 'Outbound traffic', hostName: 'TEST-EDGE-A', interface: 'Gi0/1', state: 'ok', mode: 'history', currentBps: 0, peakBps: 5000, lastSampleAt: 1793003600000, partial: false, points: [[1793000000000, 5000], [1793003600000, 0]] }
  ] }
}
