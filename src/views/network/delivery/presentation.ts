import type { DeliveryStatus, TargetStatus } from '@/types/network-delivery'

export const statusColors: Record<DeliveryStatus | TargetStatus, string> = {
  scheduled: 'blue', queued: 'blue', pending: 'gray', running: 'arcoblue', succeeded: 'green', partially_failed: 'orange', failed: 'red', uncertain: 'orange', cancelled: 'gray'
}
export const isActive = (status: DeliveryStatus) => ['scheduled', 'queued', 'running'].includes(status)
export const errorKeys = new Set(['device_changed', 'connection_failed', 'execution_unconfirmed', 'cancelled', 'invalid_script', 'persistence_failed', 'receipt_persistence_failed', 'worker_lost', 'close_unconfirmed', 'output_limit'])
export const reasonKeys = new Set(['connection_missing', 'profile_unknown', 'transport_unavailable', 'delivery_disabled', 'disabled', 'credentials_missing', 'ssh_missing', 'configuration_invalid', 'profile_missing', 'unsupported_profile', 'device_unavailable', 'known_hosts_missing'])
