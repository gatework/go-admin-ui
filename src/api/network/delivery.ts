import request from '@/utils/request'
import type { ApiResponse, PageQuery, PageResult } from '@/types/api'
import type { ConnectionSettings, DeliveryDevice, DeliveryDeviceQuery, DeliveryOptions, DeliveryOrder, DeliveryPayload, DeliveryQuery, DeliveryTarget } from '@/types/network-delivery'

const base = '/api/v1/network-delivery'
export const getDeliveryOptions = (signal?: AbortSignal) => request<ApiResponse<DeliveryOptions>>({ url: `${base}/options`, method: 'get', signal })
export const listDeliveryDevice = (params: DeliveryDeviceQuery & PageQuery, signal?: AbortSignal) => request<ApiResponse<PageResult<DeliveryDevice>>>({ url: `${base}/devices`, method: 'get', params, signal })
export const getConnection = (id: number, signal?: AbortSignal) => request<ApiResponse<ConnectionSettings>>({ url: `${base}/devices/${id}/connection`, method: 'get', signal })
export const updateConnection = (id: number, data: Pick<ConnectionSettings, 'version' | 'profile' | 'protocol' | 'port'>) => request<ApiResponse<ConnectionSettings>>({ url: `${base}/devices/${id}/connection`, method: 'put', data })
export const listDelivery = (params: DeliveryQuery & PageQuery, signal?: AbortSignal) => request<ApiResponse<PageResult<DeliveryOrder>>>({ url: `${base}/orders`, method: 'get', params, signal })
export const getDelivery = (id: number, signal?: AbortSignal) => request<ApiResponse<DeliveryOrder>>({ url: `${base}/orders/${id}`, method: 'get', signal })
export const addDelivery = (data: DeliveryPayload & { requestKey: string }) => request<ApiResponse<DeliveryOrder>>({ url: `${base}/orders`, method: 'post', data })
export const updateDelivery = (id: number, data: DeliveryPayload & { version: number }) => request<ApiResponse<DeliveryOrder>>({ url: `${base}/orders/${id}`, method: 'put', data })
export const executeDelivery = (id: number, version: number) => request<ApiResponse<DeliveryOrder>>({ url: `${base}/orders/${id}/execute`, method: 'post', data: { version }})
export const cancelDelivery = (id: number, version: number) => request<ApiResponse<DeliveryOrder>>({ url: `${base}/orders/${id}/cancel`, method: 'post', data: { version }})
export const retryDelivery = (id: number, version: number, requestKey: string) => request<ApiResponse<DeliveryOrder>>({ url: `${base}/orders/${id}/retry`, method: 'post', data: { version, requestKey }})
export const getDeliveryTarget = (id: number, targetId: number, signal?: AbortSignal) => request<ApiResponse<DeliveryTarget>>({ url: `${base}/orders/${id}/targets/${targetId}`, method: 'get', signal })
