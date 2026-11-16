export const circuitCategories = ['mpls', 'internet_dedicated', 'sdwan', 'dark_fiber', 'p2p', 'other'] as const
export const circuitPurposes = ['production_primary', 'backup', 'office_internet', 'site_interconnect', 'cloud_access', 'partner_access', 'management', 'other'] as const
export const circuitStatuses = ['planned', 'active', 'suspended', 'terminated'] as const
export const circuitPayers = ['us', 'vendor', 'shared'] as const
export const circuitBillingCycles = ['monthly', 'quarterly', 'yearly', 'one_time'] as const
export const circuitPeriods = ['1h', '6h', '24h', '7d'] as const
export type CircuitStatus = typeof circuitStatuses[number]
export type CircuitPeriod = typeof circuitPeriods[number]
export type CircuitSide = 'a' | 'z'
export interface CircuitBinding {
  hostId: string
  hostName: string
  inItemId: string
  inItemName: string
  outItemId: string
  outItemName: string
}
export interface CircuitEndpoint {
  deviceId: number | null
  name: string
  address: string
  interface: string
  ip: string
  contactName: string
  contactPhone: string
  monitoring: CircuitBinding
}
export interface CircuitInput {
  version: number
  circuitNo: string
  name: string
  provider: string
  category: typeof circuitCategories[number]
  purpose: typeof circuitPurposes[number]
  status: CircuitStatus
  bandwidthMbps: number | null
  region: string
  organization: string
  contractNo: string
  installedOn: string
  expiresOn: string
  payer: typeof circuitPayers[number]
  fee: string
  currency: string
  billingCycle: typeof circuitBillingCycles[number] | ''
  routeNotes: string
  notes: string
  aEndpoint: CircuitEndpoint
  zEndpoint: CircuitEndpoint
}
export interface CircuitDraft extends CircuitInput { id?: number }
export interface Circuit extends CircuitInput { id: number, createdAt: string, updatedAt: string }
export interface CircuitQuery {
  keyword?: string
  status?: CircuitStatus
  category?: typeof circuitCategories[number]
  provider?: string
  region?: string
  organization?: string
  monitored?: 'true' | 'false'
}
export interface CircuitOptions { providers: string[], regions: string[], organizations: string[], zabbixConfigured: boolean }
export interface ZabbixHost { id: string, name: string, host: string }
export interface ZabbixItem { id: string, hostId: string, name: string, key: string, units: string }
export interface CircuitLookup<T> { items: T[], hasMore: boolean }
export interface TrafficSeries {
  side: CircuitSide
  direction: 'in' | 'out'
  hostId: string
  itemId: string
  name: string
  hostName: string
  interface: string
  state: 'ok' | 'empty' | 'stale' | 'unavailable' | 'error'
  mode: 'history' | 'trend'
  currentBps: number | null
  peakBps: number | null
  lastSampleAt: number | null
  partial: boolean
  points: [number, number | null][]
}
export interface CircuitTraffic { configured: boolean, period: CircuitPeriod, timeFrom: number, timeTill: number, series: TrafficSeries[] }
