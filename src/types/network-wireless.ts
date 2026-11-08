import type { Device } from './network'
export type Outcome = 'affected' | 'healthy' | 'unknown' | 'notApplicable'
export type Kind = 'access-points' | 'radios' | 'bsses' | 'clients'
export type Tab = 'overview' | Kind | 'jobs'
export interface WirelessQuery { keyword?: string, ip?: string, mac?: string, ap?: string, exactAp?: boolean, ssid?: string, vlan?: string, band?: string, status?: string, groupId?: number, sort?: string, direction?: 'asc' | 'desc' }
export interface Coverage { name: string, status: string, state: string, reason: string, version: number, observedAt: string | null, lastCompleteAt: string | null }
export interface Fields { name: string, apId: string, apName: string, radioId: string, bssid: string, ssid: string, vlan: string, band: string, mac: string, ip: string, ipv6: string, model: string, serial: string, status: string, adminStatus: string, protocol: string, channel: string, clientCount: number | null, signal: number | null, snr: number | null }
export interface Management { version: number, localAlias: string, installationLocation: string, owner: string, notes: string }
export interface Resource extends Management { id: number, controllerId: number, controllerName: string, kind: string, observationVersion: number, observedAt: string, missing: boolean, parentStatus: string, fields: Fields, coverage: Coverage, health: Outcome, neighborDeviceId: number | null, neighborInterface: string, neighborEvidenceId: string, neighborVersion: number, neighborObservedAt: string | null, neighborStatus: string, neighborEvidenceVersion: number, updatedAt: string }
export interface Controller { device: Device, platform: string, supportedDimensions: string[], defaultDimensions: string[], coverage: Coverage[], counts: Record<string, number>, candidates: Record<string, Fields[]> }
export interface Suggestion { dimensions: string[], apNames: string[] }
export interface IssueOutcome { resourceId: number, kind: string, apName: string, status: Outcome, reason: string }
export interface IssueGroup { key: string, check: string, ssid: string, band: string, affected: number, healthy: number, unknown: number, notApplicable: number, outcomes: IssueOutcome[], suggestion: Suggestion }
export interface Analysis { controllerId: number, groups: IssueGroup[], ssids: { ssid: string, count: number }[], coverage: Coverage[] }
export interface Switch { id: number, name: string, ip: string }
export interface Neighbor { evidenceId: string, apName: string, systemName: string, managementIp: string, localInterface: string, portId: string, chassisId: string, candidates: Switch[] }
export interface APDetail { resource: Resource, neighbors: Neighbor[], neighborCoverage: Coverage, radios: Resource[], bsses: Resource[], clients: Resource[], counts: Record<string, number> }
export interface Collection { id: number, controllerId: number, requestKey: string, createdBy: number, dimensions: string[], apNames: string[], status: string, errorCode?: string, version: number, createdAt: string, startedAt: string | null, finishedAt: string | null, results: { name: string, status: string, count: number, issues: string[] }[] | null }
export interface ImportPreview { digest: string, rows: number, errors: { row: number, message: string }[] }
