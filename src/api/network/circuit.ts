import request from '@/utils/request'
import type { ApiResponse, PageQuery, PageResult } from '@/types/api'
import type { Circuit, CircuitInput, CircuitLookup, CircuitOptions, CircuitPeriod, CircuitQuery, CircuitTraffic, ZabbixHost, ZabbixItem } from '@/types/network-circuit'

const base = '/api/v1/network-circuit'
// Zabbix reads and binding validation have a 20-second backend deadline.
const monitoringTimeout = 25000
export function listCircuit(query: CircuitQuery & PageQuery, signal?: AbortSignal) {
  return request<ApiResponse<PageResult<Circuit>>>({ url: base, method: 'get', params: query, signal })
}
export function getCircuit(id: number, signal?: AbortSignal) {
  return request<ApiResponse<Circuit>>({ url: `${base}/${id}`, method: 'get', signal })
}
export function addCircuit(data: CircuitInput) {
  return request<ApiResponse<Circuit>>({ url: base, method: 'post', data, timeout: monitoringTimeout })
}
export function updateCircuit(id: number, data: CircuitInput) {
  return request<ApiResponse<Circuit>>({ url: `${base}/${id}`, method: 'put', data, timeout: monitoringTimeout })
}
export function delCircuit(id: number, version: number) {
  return request<ApiResponse<null>>({ url: `${base}/${id}`, method: 'delete', data: { version }})
}
export function getCircuitOptions(signal?: AbortSignal) {
  return request<ApiResponse<CircuitOptions>>({ url: `${base}/options`, method: 'get', signal })
}
export function searchCircuitHosts(keyword: string, signal?: AbortSignal) {
  return request<ApiResponse<CircuitLookup<ZabbixHost>>>({ url: `${base}/zabbix/hosts`, method: 'get', params: { keyword }, signal, timeout: monitoringTimeout })
}
export function searchCircuitItems(hostId: string, keyword: string, signal?: AbortSignal) {
  return request<ApiResponse<CircuitLookup<ZabbixItem>>>({ url: `${base}/zabbix/items`, method: 'get', params: { hostId, keyword }, signal, timeout: monitoringTimeout })
}
export function getCircuitTraffic(id: number, period: CircuitPeriod, signal?: AbortSignal) {
  return request<ApiResponse<CircuitTraffic>>({ url: `${base}/${id}/traffic`, method: 'get', params: { period }, signal, timeout: monitoringTimeout })
}
export function circuitFilters(query: CircuitQuery): CircuitQuery {
  return Object.fromEntries(['keyword', 'status', 'category', 'provider', 'region', 'organization', 'monitored'].flatMap(key => {
    const value = query[key as keyof CircuitQuery]
    return value ? [[key, value]] : []
  }))
}
export function exportCircuit(query: CircuitQuery, signal?: AbortSignal) {
  return request<ApiResponse<string>>({
    url: `${base}/export`, method: 'get', params: circuitFilters(query), signal, responseType: 'text',
    transformResponse: [(data: string, headers, status) => {
      if (status === 200 && String(headers['content-type']).includes('text/csv')) return { code: 200, msg: '', data }
      try { return JSON.parse(data) } catch { return { code: status === 200 ? 500 : status || 500, msg: '', data: null } }
    }]
  })
}
