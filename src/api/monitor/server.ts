import request from '@/utils/request'

interface Capacity { used?: number; total?: number; percent?: number }
/** This endpoint returns metrics at the envelope root, without a data property. */
export interface ServerMetrics {
  code: number
  os?: { goOs?: string; arch?: string; version?: string; compiler?: string; numGoroutine?: number; ip?: string; projectDir?: string; hostName?: string; time?: string }
  cpu?: { percent?: number; cpuNum?: number; cpuInfo?: { modelName?: string }[] }
  mem?: Capacity
  disk?: Capacity
  swap?: Capacity
  net?: { in?: number; out?: number }
  bootTime?: number
}
export function getServer() {
  return request<ServerMetrics>({ url: '/api/v1/server-monitor', method: 'get' })
}
