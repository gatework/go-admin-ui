export interface Fabric {
  id: number; code: string; name: string; version: number; rulesVersion: number
  collectionEnabled: boolean; runtimeMinutes: number; configMinutes: number
  memberCount: number; leafCount: number; state: string; completeScope: boolean; assessmentId: number
  issueCount: number; findingCount: number; unknownCount: number; observedAt: string | null; evidenceCoverage: number
  createdAt: string; updatedAt: string
}
export interface Observation { id: number; dimension: string; status: string; observedAt: string; version: number; data: unknown }
export interface Evidence { latest: Observation | null; lastComplete: Observation | null; state: string; stale: boolean }
export interface Node { deviceId: number; name: string; ip: string; role: string; version: number; membershipVersion: number; state: string; configState: string; dimensions: Record<string, Evidence>; vpcDomain: string; vpcPeer: string; vpcSource: string; model: string; platform: string; supported: boolean; features: string[]; vtep: string }
export interface SegmentCell { deviceId: number; state: string; configuration: Record<string, unknown>; aclIn: string; aclOut: string }
export interface Segment { vni: number; vrf: string; state: string; cells: SegmentCell[] }
export interface VPCGroup { key: string; domain: string; deviceIds: number[]; state: string }
export interface Remediation { kind: ChangeKind; vni: number; direction?: 'in' | 'out'; targetDeviceIds: number[] }
export interface Finding { vrf?: string; direction?: 'in' | 'out'; check?: string; scope?: 'business' | 'fabric'; deviceId?: number; vni?: number; code: string; severity: string; message: string; evidence: unknown; remediation?: Remediation }
export type IssueStatus = 'affected' | 'healthy' | 'unknown' | 'not_applicable'
export interface IssueDevice { deviceId: number; status: IssueStatus; reason: string; value: string; observedAt?: string | null; evidenceIds: number[]; findingIndices: number[] }
export interface IssueCounts { affected: number; healthy: number; unknown: number; notApplicable: number }
export interface IssueGroup { key: string; scope?: 'business' | 'fabric'; check: string; category: string; title: string; severity: string; vni?: number; vrf?: string; direction?: 'in' | 'out'; completeScope: boolean; counts: IssueCounts; devices: IssueDevice[]; findingIndices: number[]; remediations: Remediation[] }
export interface FabricDetail extends Fabric { issueGroups: IssueGroup[]; nodes: Node[]; segments: Segment[]; vpcGroups: VPCGroup[]; findings: Finding[]; evidenceKey: string }
export interface Rule { fabricId: number; pattern: string; enabled: boolean }
export interface RuleSet { version: number; rules: Rule[]; updatedAt: string }
export interface Member { deviceId: number; fabricId: number | null; mode: 'auto' | 'manual'; status: string; version: number; ruleVersion: number; name: string; ip: string; role: string; candidates: number[] }
export interface Endpoint { fabricId: number; fabricCode?: string; deviceId: number; deviceName: string; vrf: string; ip: string; mac: string; vlan: number; vni: number; interface: string; remoteVtep: string; kind: string; state: string; observedAt: string; evidenceId: number; vpcId?: string; vpcGroupKey?: string; candidateCount: number }
export interface FabricQuery { keyword?: string; status?: string }
export interface EndpointQuery { keyword: string; fabricId?: number; vrf?: string }
export type CollectionMode = 'all' | 'runtime' | 'configuration'
export interface Collection { id: number; fabricId: number; requestKey: string; mode: CollectionMode; status: string; version: number; createdAt: string; startedAt?: string; finishedAt?: string; targets: { deviceId: number; status: string; errorCode?: string }[] }
export type ChangeKind = 'vlan_vni_add' | 'svi_gateway_add' | 'svi_acl'
export interface ChangeInput { sourceDeviceId: number; targetDeviceIds: number[]; kind: ChangeKind; vni: number; direction?: 'in' | 'out' }
export type ChangeCandidateInput = Omit<ChangeInput, 'targetDeviceIds'> & { targetDeviceIds?: number[] }
export interface ChangeCandidate { deviceId: number; name: string; ip: string; reason: string }
export interface ChangeCandidates { sourceDeviceId: number; kind: ChangeKind; vni: number; direction?: 'in' | 'out'; ready: ChangeCandidate[]; unchanged: ChangeCandidate[]; blocked: ChangeCandidate[] }
export interface ChangeTarget { deviceId: number; status: string; commands: string[]; completedSteps: number; errorCode?: string; configurationVerified?: boolean; runtimeState?: string; preEvidence?: unknown; postEvidence?: unknown; receipts: { step: number; command: string; status: string; at: string }[] }
export interface Change extends ChangeInput { id: number; fabricId: number; version: number; status: string; deliveryOrderId: number; groupingHash: string; planHash: string; createdAt: string; targets: ChangeTarget[] }
