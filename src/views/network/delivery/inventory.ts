import type { DeliveryDevice, DeliveryDeviceQuery, DeviceSnapshot } from '@/types/network-delivery'

type Translate = (key: string, values?: Record<string, unknown>) => string

export const roleName = (device: Pick<DeviceSnapshot, 'deviceRole' | 'deviceType'>, t: Translate) => device.deviceRole
  ? t(`network.device.roleValues.${device.deviceRole}`)
  : t('networkDelivery.typeFallback', { type: device.deviceType ? t(`network.device.typeValues.${device.deviceType}`) : t('networkDelivery.unclassified') })

export const platformName = (profile: string | undefined, t: Translate) => profile ? t(`networkDelivery.platforms.${profile}`) : t('networkDelivery.unknownPlatform')

export function snapshotDevice(device: DeliveryDevice): DeviceSnapshot {
  const { id, name, hostname, ip, vendor, model, deviceType, deviceRole } = device
  return { id, name, hostname, ip, vendor, model, deviceType, deviceRole, profile: device.connection.profile }
}

export interface InventoryFilters { keyword: string, role?: string, vendor?: string, model?: string }
export function inventoryQuery(filters: InventoryFilters): DeliveryDeviceQuery {
  return {
    keyword: filters.keyword,
    ...(filters.role === '__empty__' ? { deviceRoleEmpty: true } : { deviceRole: filters.role }),
    ...(filters.vendor === '__empty__' ? { vendorEmpty: true } : { vendor: filters.vendor }),
    model: filters.model
  }
}

export function mergeSelection(current: DeviceSnapshot[], candidates: DeliveryDevice[], max: number): DeviceSnapshot[] | undefined {
  const selected = new Map(current.map(device => [device.id, device]))
  for (const device of candidates) if (device.connection.ready) selected.set(device.id, snapshotDevice(device))
  return selected.size <= max ? [...selected.values()] : undefined
}
