import type { FabricDetail, Change, Endpoint, Member } from '../../src/types/network-fabric'

const time = '2026-10-26T03:30:00Z'
export const fabricFixture = (): FabricDetail => ({
  id: 1, code: 'SZX9', name: 'SZX9', version: 1, rulesVersion: 1, collectionEnabled: false, runtimeMinutes: 5, configMinutes: 30, memberCount: 3, leafCount: 2, state: 'unknown', completeScope: true, assessmentId: 7, issueCount: 1, findingCount: 1, unknownCount: 1, observedAt: time, evidenceCoverage: 50, createdAt: time, updatedAt: time, evidenceKey: 'assessment-evidence-v7',
  nodes: [1, 2, 3].map(id => ({ deviceId: id, name: `SZX9-${id === 3 ? 'SPN' : 'LEF'}-${id}`, ip: `192.0.2.${id}`, role: id === 3 ? 'spine_switch' : 'leaf_switch', version: 1, membershipVersion: 1, state: id === 1 ? 'healthy' : 'unknown', configState: 'current', vpcDomain: id === 3 ? '' : '100', vpcPeer: id === 3 ? '' : `192.0.2.${id === 1 ? 2 : 1}`, vpcSource: '192.0.2.1', model: 'N9K', platform: 'NX-OS', supported: true, features: ['bgp', 'nv_overlay'], vtep: `192.0.2.${id + 10}`, dimensions: { bgp: { state: id === 1 ? 'complete' : 'unknown', stale: false, latest: { id, dimension: 'bgp', status: id === 1 ? 'complete' : 'failed', observedAt: time, version: 1, data: { records: [{ neighbor: '192.0.2.3', state: 'established' }] }}, lastComplete: { id: id + 10, dimension: 'bgp', status: 'complete', observedAt: time, version: 1, data: { records: [] }}}}})),
  segments: [{ vni: 10100, vrf: 'PRODUCTION', state: 'different', cells: [{ deviceId: 1, state: 'present', aclIn: 'APP-IN', aclOut: 'unbound', configuration: { vlan: 100, svi: { addresses: ['10.1.0.1/24'], vrf: 'PRODUCTION' }}}, { deviceId: 2, state: 'missing', aclIn: 'unbound', aclOut: 'unbound', configuration: {}}] }],
  issueGroups: [{ key: 'runtime-bgp', check: 'runtime_bgp', category: 'runtime', title: 'BGP evidence incomplete', severity: 'warning', completeScope: true, counts: { affected: 0, healthy: 1, unknown: 2, notApplicable: 0 }, devices: [1, 2, 3].map(deviceId => ({ deviceId, status: deviceId === 1 ? 'healthy' : 'unknown', reason: deviceId === 1 ? 'check_passed' : 'evidence_incomplete', value: '', observedAt: time, evidenceIds: [deviceId], findingIndices: deviceId === 2 ? [0] : [] })), findingIndices: [0], remediations: [] }],
  vpcGroups: [{ key: '1:2', domain: '100', deviceIds: [1, 2], state: 'unknown' }], findings: [{ code: 'runtime_incomplete', severity: 'warning', message: 'BGP evidence incomplete', deviceId: 2, evidence: { dimension: 'bgp', status: 'failed' }}]
})
export const memberFixture = (): Member => ({ deviceId: 2, fabricId: 1, mode: 'auto', status: 'assigned', version: 1, ruleVersion: 1, name: 'SZX9-LEF-2', ip: '192.0.2.2', role: 'leaf_switch', candidates: [1] })
export const endpointFixture = (): Endpoint => ({ fabricId: 1, fabricCode: 'SZX9', candidateCount: 1, deviceId: 1, deviceName: 'SZX9-LEF-1', vrf: 'PRODUCTION', ip: '10.1.0.8', mac: '00:11:22:33:44:55', vlan: 100, vni: 10100, interface: 'Ethernet1/10', remoteVtep: '', kind: 'local_port', state: 'complete', observedAt: time, evidenceId: 9 })
export const changeFixture = (): Change => ({ id: 21, fabricId: 1, version: 1, status: 'preview', deliveryOrderId: 51, groupingHash: 'membership-v1', planHash: 'plan-v1', createdAt: time, sourceDeviceId: 1, targetDeviceIds: [2], kind: 'vlan_vni_add', vni: 10100, targets: [{ deviceId: 2, status: 'eligible', completedSteps: 0, commands: ['vlan 100', 'vn-segment 10100'], preEvidence: { dimensions: { configuration: { status: 'complete' }}}, postEvidence: null, receipts: [] }] })

// Intercepted browser evidence only. No device connection is made.
export function problemFixture(): FabricDetail {
  const fabric = fabricFixture()
  fabric.nodes.push({ ...fabric.nodes[1], deviceId: 4, name: 'SZX9-LEF-4', ip: '192.0.2.4', configState: 'unknown' })
  fabric.state = 'fault'
  fabric.nodes[0].state = 'fault'
  fabric.nodes[1].state = 'fault'
  fabric.memberCount = 4
  fabric.leafCount = 3
  fabric.findings.push({ deviceId: 2, vni: 10100, code: 'segment_missing', severity: 'warning', message: 'PRODUCTION / VNI 10100 尚未配置', evidence: { deviceId: 2 }})
  fabric.issueGroups = [{
    key: 'production-10100-presence', check: 'segment_presence', category: 'service', title: '业务网段缺失', severity: 'warning', vrf: 'PRODUCTION', vni: 10100, completeScope: true,
    counts: { affected: 1, healthy: 1, unknown: 1, notApplicable: 1 },
    devices: [
      { deviceId: 1, status: 'healthy', reason: 'check_passed', value: 'VLAN 100 · 10.1.0.1/24', observedAt: time, evidenceIds: [1], findingIndices: [] },
      { deviceId: 2, status: 'affected', reason: 'service_missing', value: 'VNI 10100', observedAt: time, evidenceIds: [2], findingIndices: [1] },
      { deviceId: 3, status: 'not_applicable', reason: 'role_not_applicable', value: 'Spine', observedAt: time, evidenceIds: [3], findingIndices: [] },
      { deviceId: 4, status: 'unknown', reason: 'evidence_missing', value: '', evidenceIds: [], findingIndices: [] }
    ], findingIndices: [1], remediations: [{ kind: 'vlan_vni_add', vni: 10100, targetDeviceIds: [2] }]
  }, {
    key: 'isolated-20200-presence', check: 'segment_presence', category: 'service', title: '业务网段缺失', severity: 'warning', vrf: 'ISOLATED', vni: 20200, completeScope: true,
    counts: { affected: 1, healthy: 1, unknown: 1, notApplicable: 1 },
    devices: [
      { deviceId: 1, status: 'affected', reason: 'service_missing', value: 'VNI 20200', observedAt: time, evidenceIds: [1], findingIndices: [] },
      { deviceId: 2, status: 'healthy', reason: 'check_passed', value: 'VLAN 200', observedAt: time, evidenceIds: [2], findingIndices: [] },
      { deviceId: 3, status: 'not_applicable', reason: 'role_not_applicable', value: 'Spine', observedAt: time, evidenceIds: [3], findingIndices: [] },
      { deviceId: 4, status: 'unknown', reason: 'evidence_missing', value: '', evidenceIds: [], findingIndices: [] }
    ], findingIndices: [], remediations: [{ kind: 'vlan_vni_add', vni: 20200, targetDeviceIds: [1] }]
  }, { ...fabric.issueGroups[0], key: 'production-10100-acl-out', check: 'acl_binding', category: 'acl', title: '出方向 ACL 未绑定', vrf: 'PRODUCTION', vni: 10100, direction: 'out', counts: { affected: 1, healthy: 1, unknown: 1, notApplicable: 1 }, devices: [
    { deviceId: 1, status: 'healthy', reason: 'check_passed', value: 'APP-OUT', observedAt: time, evidenceIds: [1], findingIndices: [] },
    { deviceId: 2, status: 'affected', reason: 'acl_unbound', value: 'unbound', observedAt: time, evidenceIds: [2], findingIndices: [] },
    { deviceId: 3, status: 'not_applicable', reason: 'role_not_applicable', value: 'Spine', observedAt: time, evidenceIds: [3], findingIndices: [] },
    { deviceId: 4, status: 'unknown', reason: 'evidence_missing', value: '', evidenceIds: [], findingIndices: [] }
  ], remediations: [{ kind: 'svi_acl', vni: 10100, direction: 'out', targetDeviceIds: [2] }] }]
  fabric.issueCount = fabric.issueGroups.length
  fabric.findingCount = fabric.findings.length
  return fabric
}
