export const diagnosticTools = ['ping', 'mtr', 'nexttrace', 'iperf3', 'traceroute'] as const
export type DiagnosticTool = typeof diagnosticTools[number]
export type DiagnosticFamily = 'auto' | '4' | '6'
export type DiagnosticStatus = 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timed_out' | 'expired'
export interface DiagnosticRequest {
  tool: DiagnosticTool
  target?: string
  family?: DiagnosticFamily
  mode?: 'client' | 'server'
  port?: number
  duration?: number
  reverse?: boolean
}
export interface DiagnosticJob {
  id: string
  tool: DiagnosticTool
  target: string
  family: DiagnosticFamily
  mode: 'client' | 'server'
  command: string
  status: DiagnosticStatus
  output: string
  truncated: boolean
  startedAt: string
  finishedAt: string | null
  expiresAt: string | null
  port: number
  error?: string
}
export interface DiagnosticServer {
  id: string
  name: string
  hostname: string
  connectHost: string
  addresses: string[]
  tools: { id: DiagnosticTool; available: boolean }[]
  sessionSeconds: number
}
