export const deviceStatuses = ['pending', 'active', 'maintenance', 'disabled', 'retired'] as const
export type DeviceStatus = typeof deviceStatuses[number]
export const deviceTypes = ['switch', 'router', 'firewall', 'load_balancer', 'wireless_controller', 'wireless_ap', 'network_management_server', 'other'] as const
export const deviceRoles = ['core_switch', 'aggregate_switch', 'poe_switch', 'access_switch', 'leaf_switch', 'border_switch', 'spine_switch', 'firewall', 'load_balancer', 'wireless_controller', 'wireless_ap', 'network_management_server', 'other'] as const

export interface DeviceMetadata {
  groupId: number | null
  groupSource: 'auto' | 'manual'
  classificationSource: 'auto' | 'manual'
  status: DeviceStatus
  deviceType: string
  deviceRole: string
  owner: string
  contactEmail: string
  contactPhone: string
  tags: string[]
  notes: string
}

export interface Device extends DeviceMetadata {
  id: number
  group: string
  ip: string
  name: string
  hostname: string
  serial: string
  vendor: string
  model: string
  os: string
  osVersion: string
  location: string
  contact: string
  description: string
  macAddress: string
  sourceTags: string[]
  sourceCreatedAt: string
  lastDiscoveredAt: string
  lastSyncedAt: string
  createdAt: string
  updatedAt: string
  version: number
}

export interface DeviceDraft extends DeviceMetadata {
  id: number
  version: number
}

export interface DeviceQuery {
  keyword?: string
  vendor?: string
  model?: string
  status?: DeviceStatus
  deviceType?: string
  deviceRole?: string
  groupId?: number
  tag?: string
}

export interface DeviceOptions {
  vendors: string[]
  models: string[]
}

export interface DeviceGroupDraft {
  code: string
  name: string
  parentId: number | null
  description: string
  enabled: boolean
  position: number
}

export interface DeviceGroupNode extends DeviceGroupDraft {
  id: number
  version: number
  directDeviceCount: number
  deviceCount: number
  children: DeviceGroupNode[]
}

export interface DeviceGroupTree {
  items: DeviceGroupNode[]
  totalDeviceCount: number
  ungroupedDeviceCount: number
}

export interface DeviceGroupAssignment {
  devices: Pick<Device, 'id' | 'version'>[]
  groupId: number | null
  groupSource: 'auto' | 'manual'
}

export interface DeviceSyncStatus {
  configured: boolean
  status: 'idle' | 'running' | 'succeeded' | 'failed'
  lastSuccessAt?: string
  startedAt?: string
  finishedAt?: string
  deviceCount: number
  message?: string
}

export interface DeviceSyncResult {
  imported: number
  updated: number
  total: number
  syncedAt: string
}
