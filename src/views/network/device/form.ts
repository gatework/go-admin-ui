import type { DeviceDraft, DeviceMetadata } from '@/types/network'

/** Explicitly separate human metadata from the read-only source snapshot. */
export function toDeviceDraft(record: DeviceMetadata & { id: number, version: number }): DeviceDraft {
  return {
    id: record.id,
    version: record.version,
    groupId: record.groupId,
    groupSource: record.groupSource,
    classificationSource: record.classificationSource,
    status: record.status,
    deviceType: record.deviceType,
    deviceRole: record.deviceRole,
    owner: record.owner,
    contactEmail: record.contactEmail,
    contactPhone: record.contactPhone,
    tags: [...record.tags],
    notes: record.notes
  }
}

export function emptyDeviceDraft(): DeviceDraft {
  return { id: 0, version: 0, groupId: null, groupSource: 'auto', classificationSource: 'auto', status: 'pending', deviceType: '', deviceRole: '', owner: '', contactEmail: '', contactPhone: '', tags: [], notes: '' }
}
