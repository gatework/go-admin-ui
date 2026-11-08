import type { Device, DeviceGroupTree } from './network'

export const deliveryStatuses = ['scheduled', 'queued', 'running', 'succeeded', 'partially_failed', 'failed', 'uncertain', 'cancelled'] as const
export type DeliveryStatus = typeof deliveryStatuses[number]
export type TargetStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'uncertain' | 'cancelled'
export type DeviceSnapshot = Pick<Device, 'id' | 'name' | 'hostname' | 'ip' | 'vendor' | 'model'> & Partial<Pick<Device, 'deviceType' | 'deviceRole'>> & { profile?: string }

export interface ConnectionSettings {
  profile: string
  protocol: 'ssh' | 'telnet'
  port: number
  version: number
  ready: boolean
  reason?: string
  profileSource?: 'automatic' | 'manual' | 'unknown'
  inferredProfile?: string
}
export interface DeliveryDevice extends Device { connection: ConnectionSettings }
export interface DeliveryOptions {
  enabled: boolean
  configured: boolean
  reason?: string
  concurrency: number
  graceSeconds: number
  maxTargets: number
  maxScriptBytes: number
  profiles: string[]
  inventoryGroups?: Array<{ deviceType: string, deviceRole: string, vendor: string, model?: string, count: number }>
  deviceGroups?: DeviceGroupTree
}
export interface DeliveryTarget {
  id: number
  deviceId: number
  device: DeviceSnapshot
  script: string
  scriptSha256: string
  scriptLineCount: number
  status: TargetStatus
  completedSteps: number
  startedAt?: string
  finishedAt?: string
  errorCode?: string
  output?: string
  retryable: boolean
}
export interface DeliveryOrder {
  id: number
  requestNo: string
  title: string
  status: DeliveryStatus
  version: number
  deviceCount: number
  succeededCount: number
  failedCount: number
  uncertainCount: number
  cancelledCount: number
  createdBy: number
  createdByName: string
  retryOfId?: number
  scheduledAt?: string
  startedAt?: string
  finishedAt?: string
  createdAt: string
  updatedAt: string
  editable: boolean
  executable: boolean
  cancellable: boolean
  retryable: boolean
  targets?: DeliveryTarget[]
}
export interface DraftTarget { deviceId: number, device: DeviceSnapshot, script: string, individual?: boolean, needsReview?: boolean }
export interface DeliveryDraft { id?: number, version: number, title: string, requestKey: string, targets: DraftTarget[] }
export interface DeliveryPayload { title: string, targets: Array<{ deviceId: number, script: string, expectedProfile?: string, expectedDeviceRole?: string, expectedDeviceType?: string }> }
export interface DeliveryQuery { keyword?: string, status?: DeliveryStatus }
export interface DeliveryDeviceQuery { keyword?: string, vendor?: string, model?: string, groupId?: number, deviceType?: string, deviceRole?: string, deviceTypeEmpty?: boolean, deviceRoleEmpty?: boolean, vendorEmpty?: boolean }
