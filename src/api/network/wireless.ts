import request from '@/utils/request'
import type { ApiResponse, PageQuery, PageResult } from '@/types/api'
import type { Device, DeviceGroupTree } from '@/types/network'
import type { Controller, Analysis, Resource, APDetail, Kind, WirelessQuery, Management, Suggestion, Collection, ImportPreview, Switch } from '@/types/network-wireless'
const base = '/api/v1/network-wireless'
const controller = (id: number) => `${base}/controllers/${id}`
export const listController = (params: WirelessQuery & PageQuery, signal?: AbortSignal) => request<ApiResponse<PageResult<Device>>>({ url: `${base}/controllers`, params, signal })
export const getGroups = (signal?: AbortSignal) => request<ApiResponse<DeviceGroupTree>>({ url: `${base}/groups`, signal })
export const getController = (id: number, signal?: AbortSignal) => request<ApiResponse<Controller>>({ url: controller(id), signal })
export const getAnalysis = (id: number, signal?: AbortSignal) => request<ApiResponse<Analysis>>({ url: `${controller(id)}/analysis`, signal })
export const listResource = (id: number | undefined, kind: Kind, params: WirelessQuery & PageQuery, signal?: AbortSignal) => request<ApiResponse<PageResult<Resource>>>({ url: id ? `${controller(id)}/${kind}` : `${base}/clients`, params, signal })
export const getAP = (id: number, ap: number, signal?: AbortSignal) => request<ApiResponse<APDetail>>({ url: `${controller(id)}/access-points/${ap}`, signal })
export const updateManagement = (id: number, ap: number, data: Management, signal?: AbortSignal) => request<ApiResponse<Resource>>({ url: `${controller(id)}/access-points/${ap}/management`, method: 'put', data, signal })
export const updateNeighbor = (id: number, ap: number, data: { version: number, observationVersion: number, evidenceId: string, deviceId: number | null, interface: string }, signal?: AbortSignal) => request<ApiResponse<APDetail>>({ url: `${controller(id)}/access-points/${ap}/neighbor`, method: 'put', data, signal })
export const listSwitch = (params: WirelessQuery & PageQuery, signal?: AbortSignal) => request<ApiResponse<PageResult<Switch>>>({ url: `${base}/switches`, params, signal })
export const listCollection = (id: number, params: WirelessQuery & PageQuery, signal?: AbortSignal) => request<ApiResponse<PageResult<Collection>>>({ url: `${controller(id)}/collections`, params, signal })
export const getCollection = (id: number, job: number, signal?: AbortSignal) => request<ApiResponse<Collection>>({ url: `${controller(id)}/collections/${job}`, signal })
export const addCollection = (id: number, data: Suggestion & { requestKey: string }, signal?: AbortSignal) => request<ApiResponse<Collection>>({ url: `${controller(id)}/collections`, method: 'post', data, signal })
export const previewImport = (content: string, signal?: AbortSignal) => request<ApiResponse<ImportPreview>>({ url: `${base}/imports/preview`, method: 'post', data: { content }, signal })
export const commitImport = (content: string, digest: string, signal?: AbortSignal) => request<ApiResponse<null>>({ url: `${base}/imports/commit`, method: 'post', data: { content, digest }, signal })
export const exportResource = (id: number, kind: Kind | 'management', params: WirelessQuery, signal?: AbortSignal) => request<ApiResponse<string>>({ url: `${controller(id)}/exports/${kind}`, params, signal, responseType: 'text', transformResponse: [(data: string, headers, status) => { if (status === 200 && String(headers['content-type']).includes('text/csv')) return { code: 200, msg: '', data }; try { return JSON.parse(data) } catch { return { code: status || 500, msg: '', data: null } } }] })
export const getClient = (id: number, client: number, signal?: AbortSignal) => request<ApiResponse<Resource>>({ url: `${controller(id)}/clients/${client}`, signal })
