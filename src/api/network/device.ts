import request from '@/utils/request'
import type { ApiResponse, PageQuery, PageResult } from '@/types/api'
import type { Device, DeviceDraft, DeviceGroupAssignment, DeviceGroupDraft, DeviceGroupNode, DeviceGroupTree, DeviceOptions, DeviceQuery, DeviceSyncResult, DeviceSyncStatus } from '@/types/network'

const base = '/api/v1/network-device'

export function listDevice(query: DeviceQuery & PageQuery, signal?: AbortSignal) {
  return request<ApiResponse<PageResult<Device>>>({ url: base, method: 'get', params: query, signal })
}

export function getDevice(id: number) {
  return request<ApiResponse<Device>>({ url: `${base}/${id}`, method: 'get' })
}

export function updateDevice(draft: DeviceDraft) {
  const { version, groupId, groupSource, classificationSource, status, deviceType, deviceRole, owner, contactEmail, contactPhone, tags, notes } = draft
  return request<ApiResponse<Device>>({
    url: `${base}/${draft.id}`, method: 'put',
    data: { version, groupId, groupSource, classificationSource, status, deviceType, deviceRole, owner, contactEmail, contactPhone, tags, notes }
  })
}

export function getDeviceOptions() {
  return request<ApiResponse<DeviceOptions>>({ url: `${base}/options`, method: 'get' })
}

export function getDeviceSyncStatus() {
  return request<ApiResponse<DeviceSyncStatus>>({ url: `${base}/sync-status`, method: 'get' })
}

export function syncDevice() {
  return request<ApiResponse<DeviceSyncResult>>({ url: `${base}/sync`, method: 'post', timeout: 60000 })
}

const groupBase = '/api/v1/network-device-group'

export function listDeviceGroup() {
  return request<ApiResponse<DeviceGroupTree>>({ url: groupBase, method: 'get' })
}

export function addDeviceGroup(data: DeviceGroupDraft) {
  return request<ApiResponse<DeviceGroupNode>>({ url: groupBase, method: 'post', data })
}

export function updateDeviceGroup(id: number, data: DeviceGroupDraft & { version: number }) {
  return request<ApiResponse<DeviceGroupNode>>({ url: `${groupBase}/${id}`, method: 'put', data })
}

export function delDeviceGroup(id: number, version: number) {
  return request<ApiResponse<null>>({ url: `${groupBase}/${id}`, method: 'delete', data: { version }})
}

export function assignDeviceGroup(data: DeviceGroupAssignment) {
  return request<ApiResponse<{ updated: number }>>({ url: `${base}/assign-group`, method: 'put', data })
}

export function exportDevice(query: DeviceQuery & Partial<PageQuery>) {
  const params: DeviceQuery = {}
  for (const key of ['keyword', 'vendor', 'model', 'status', 'deviceType', 'deviceRole', 'groupId', 'tag'] as const) {
    if (query[key] !== undefined && query[key] !== '') Object.assign(params, { [key]: query[key] })
  }
  return request<ApiResponse<string>>({
    url: `${base}/export`, method: 'get', params, responseType: 'text',
    // The shared interceptor consumes envelopes. Keep server error envelopes
    // intact and adapt only the documented CSV response at this endpoint.
    transformResponse: [(data: string, headers, status) => {
      if (status === 200 && String(headers['content-type']).includes('text/csv')) {
        return { code: 200, msg: '', data }
      }
      try { return JSON.parse(data) } catch { return { code: status === 200 ? 500 : status || 500, msg: '', data: null } }
    }]
  })
}
