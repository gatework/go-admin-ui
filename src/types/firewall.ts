import type { Device } from './network'

export const objectKinds = ['interface', 'route', 'zone', 'address', 'address_group', 'service', 'service_group', 'schedule', 'rule', 'rule_binding', 'static_nat', 'dynamic_nat', 'nat_pool'] as const
export type ObjectKind = typeof objectKinds[number]
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'partial' | 'failed' | 'cancelled'
export interface Domain { id: number, name: string, code: string, version?: number }
export interface Options { domains: Domain[], vendors: string[], limits: { maxRows: number, maxDesignRows: number, maxFileBytes: number, maxCollectionTargets?: number, collectionConcurrency?: number }, defaultProtocol: 'tcp' }
export interface Instance { id: number, deviceId: number, name: string, vendor: string, nativeContext: string, mode: 'routed' | 'transparent', domainId: number, version: number, currentRevision: string, settingsVersion: number }
export type InstanceInput = Pick<Instance, 'deviceId' | 'domainId' | 'vendor' | 'nativeContext' | 'mode'>
export interface Notice { field: string, token: string, code: string, value?: string }
export interface InputRow { key: string, source: string, destination: string, service: string, notes: string }
export interface Input { rows: InputRow[], text?: string, columns?: { source: number, destination: number, service: number, notes?: number }, defaultProtocol: string }
export interface Term { value: string, kind: string }
export interface NormalizedRow extends InputRow { line: number, sources: Term[], destinations: Term[], services: Term[], corrections: Notice[], issues: Notice[], status: string }
export interface Normalized { rows: NormalizedRow[], defaultProtocol: string, issues: Notice[] }
export interface Binding { zone: string, scope: string, routingScope: string, domainId: number, protected: boolean, networks: string[] }
export interface Settings { version: number, zones: Binding[], scopes: { routingScope: string, domainId: number }[] }
export interface Coverage { instanceId: number, domainId: number, revision: string, bindingsVersion: number, zone: string, scope: string, routingScope: string, network: string, protected: boolean, origin: string, objectId?: string, known: boolean }
export interface ImportJob { id: number, instanceId: number, status: JobStatus, revision: string, errorCode: string, createdAt: string }
export interface Snapshot { sourceDigest: string, semanticDigest: string, parserVersion: string, capturedAt: string, software: string, id: number, instanceId: number, revision: string, complete: boolean, createdAt: string, current: boolean, diagnostics: { code: string, message: string, object: string }[], projectionState: string }
export interface FirewallObject { id: number, kind: ObjectKind, nativeId: string, name: string, scope: string, position: number, state: string, summary: string, record: Record<string, unknown>, diagnostics: { code: string, message: string, object: string }[] }
export interface Reference { sourceKind: ObjectKind, sourceId: number, targetKind: ObjectKind, targetId: number, role: string, position: number, resolved: boolean }
export interface References { incoming: Reference[], outgoing: Reference[] }
export interface TrafficPart { icmpType?: string, icmpCode?: string, source: string, destination: string, protocol: string, sourcePort: string, destinationPort: string }
export interface RuleTrace { id: string, name: string, action: string, certain: boolean, traffic: TrafficPart[] }
export interface NATStep { id: string, kind: string, reverse: boolean }
export interface NATTrace { steps?: NATStep[], id: string, kind: string, exact: boolean, possibleAllocation: boolean, original: TrafficPart[], translated: TrafficPart[] }
export interface AnalysisItem { rowKey: string, instanceId: number, instanceName: string, revision: string, scope: string, routingScope: string, fromZone: string, toZone: string, hitSide: string, basis: string, status: string, original: TrafficPart[], policyView: string, packetStatus: string, packetUnknown: TrafficPart[], allowed: TrafficPart[], denied: TrafficPart[], unmatched: TrafficPart[], unknown: TrafficPart[], trace: RuleTrace[], nat: NATTrace[], issues: Notice[] }
export interface AnalysisResult { items: AnalysisItem[], issues: Notice[], complete: boolean }
export interface SavedRequest { id: number, title: string, domainId: number, version: number, input: Input, normalized: Normalized, createdAt: string, updatedAt: string }
export interface RequestInput { title: string, domainId: number, input: Input }
export interface Analysis { id: number, requestId: number, requestVersion: number, status: JobStatus, at: string, result: AnalysisResult, errorCode: string, stale: boolean }
export interface DraftChange { kind: string, ruleId: string, description: string, data?: Record<string, unknown> }
export interface DraftItem { instanceId: number, revision: string, status: string, rowKeys: string[], settingsVersion: number, baseDigest: string, resultDigest: string, changes: DraftChange[], issues: Notice[], targetSatisfied: boolean, outsidePreserved: boolean, natUnchanged: boolean }
export interface DraftResult { items: DraftItem[], complete: boolean, at: string }
export interface Draft { id: number, requestId: number, analysisId: number, title: string, version: number, status: 'queued' | 'running' | 'verified' | 'needs_review' | 'failed' | 'cancelled', result: DraftResult, stale: boolean, notes: string }
export interface ObjectQuery { keyword?: string, address?: string, protocol?: string, port?: string, zone?: string, state?: string }
export interface InstanceQuery { keyword?: string, groupId?: number, domainId?: number }
export interface FirewallConnection { profile: string, protocol: 'ssh' | 'telnet', port: number, version: number, ready: boolean, reason: string, profileSource: string, inferredProfile: string, vendor: string, credentialsConfigured: boolean, contextRequired: boolean }
export type FirewallConnectionInput = Pick<FirewallConnection, 'version' | 'profile' | 'protocol' | 'port'>
export interface FirewallDevice extends Device { connection: FirewallConnection, instances: Instance[] }
export type CollectionKind = 'capture' | 'connection_test'
export interface CollectionInput { requestKey: string, kind: CollectionKind, instanceIds: number[] }
export interface CollectionTarget { id: number, batchId: number, instanceId: number, deviceId: number, name: string, ip: string, vendor: string, nativeContext: string, status: JobStatus, stage: string, revision: string, snapshotId: number, complete: boolean, errorCode: string, sessionClosed: boolean, startedAt?: string, finishedAt?: string }
export interface CollectionBatch { id: number, kind: CollectionKind, status: JobStatus, cancelRequested: boolean, targets: CollectionTarget[], createdAt: string, finishedAt?: string }
