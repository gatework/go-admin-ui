import type { IssueGroup, IssueStatus, Segment } from '@/types/network-fabric'

export const tabs = ['overview', 'nodes', 'segments', 'endpoints', 'changes'] as const
export type FabricTab = typeof tabs[number]
const changeKinds = ['vlan_vni_add', 'svi_gateway_add', 'svi_acl'] as const
export function parseChangeLocation(query: Record<string, unknown>) {
  const kind = changeKinds.includes(query.kind as typeof changeKinds[number]) ? query.kind as typeof changeKinds[number] : undefined
  const direction: 'in' | 'out' | undefined = query.direction === 'in' || query.direction === 'out' ? query.direction : undefined
  const scoped = query.targets !== undefined
  const ids = typeof query.targets === 'string' && /^[1-9]\d*(,[1-9]\d*)*$/.test(query.targets) ? query.targets.split(',').map(Number) : []
  const validScope = !scoped || Boolean(kind && (kind !== 'svi_acl' || direction) && ids.length && ids.length <= 100 && ids.every(Number.isSafeInteger))
  return { kind, direction, targets: scoped ? validScope ? [...new Set(ids)] : [] : undefined }
}
export function parseLocation(query: Record<string, unknown>) {
  const id = typeof query.fabric === 'string' && /^\d+$/.test(query.fabric) ? Number(query.fabric) : NaN
  return { id: Number.isSafeInteger(id) && id > 0 ? id : undefined, tab: tabs.includes(query.tab as FabricTab) ? query.tab as FabricTab : 'overview' as FabricTab, endpoint: typeof query.endpoint === 'string' ? query.endpoint : '' }
}
export function stateColor(state: string) {
  if (['healthy', 'consistent', 'complete', 'succeeded', 'satisfied', 'matched', 'assigned', 'present', 'eligible'].includes(state)) return 'green'
  if (['failed', 'conflict', 'different', 'fault', 'drifted'].includes(state)) return 'red'
  if (['unknown', 'stale', 'partial', 'uncertain', 'unmatched', 'missing', 'incomplete'].includes(state)) return 'orange'
  return 'gray'
}
export const pretty = (value: unknown) => JSON.stringify(value, null, 2) || '—'

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
export function gateways(configuration?: Record<string, unknown>): string[] {
  const addresses = asRecord(configuration?.svi).addresses
  return Array.isArray(addresses) ? addresses.filter((value): value is string => typeof value === 'string') : []
}
// CIDR is a network identifier; do not label the SVI host address as a subnet.
export function networkCIDR(address: string): string {
  const [host, prefix] = address.split('/')
  const bits = Number(prefix)
  if (host.includes(':')) {
    if (prefix === undefined || !Number.isInteger(bits) || bits < 0 || bits > 128 || host.split('::').length > 2) return ''
    const parts = host.split('::')
    const left = parts[0] ? parts[0].split(':') : []
    const right = parts[1] ? parts[1].split(':') : []
    const missing = 8 - left.length - right.length
    if (parts.length === 1 && missing !== 0 || parts.length === 2 && missing < 1) return ''
    const groups = [...left, ...Array(parts.length === 2 ? missing : 0).fill('0'), ...right]
    if (groups.some(value => !/^[0-9a-f]{1,4}$/i.test(value))) return ''
    const network = groups.map((value, index) => {
      const remaining = Math.max(0, Math.min(16, bits - index * 16))
      return (parseInt(value, 16) & (remaining === 0 ? 0 : 0xffff << (16 - remaining))).toString(16)
    })
    let bestStart = -1; let bestLength = 1
    for (let index = 0; index < 8; index++) {
      if (network[index] !== '0') continue
      let end = index
      while (end < 8 && network[end] === '0') end++
      if (end - index > bestLength) { bestStart = index; bestLength = end - index }
      index = end - 1
    }
    const result = bestStart < 0 ? network.join(':') : network.slice(0, bestStart).join(':') + '::' + network.slice(bestStart + bestLength).join(':')
    return result + '/' + bits
  }
  const octets = host.split('.').map(Number)
  if (prefix === undefined || !Number.isInteger(bits) || bits < 0 || bits > 32 || octets.length !== 4 || octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return ''
  const packed = octets.reduce((value, octet) => (value << 8) | octet, 0)
  const mask = bits === 0 ? 0 : (-1 << (32 - bits))
  const net = (packed & mask) >>> 0
  return [net >>> 24, (net >>> 16) & 255, (net >>> 8) & 255, net & 255].join('.') + '/' + bits
}

export const issueStatuses: IssueStatus[] = ['affected', 'healthy', 'unknown', 'not_applicable']
export function parseIssueLocation(query: Record<string, unknown>) {
  const device = typeof query.device === 'string' && /^[1-9]\d*$/.test(query.device) ? Number(query.device) : undefined
  return {
    issue: typeof query.issue === 'string' ? query.issue : '',
    device: device && Number.isSafeInteger(device) ? device : undefined,
    status: issueStatuses.includes(query.issueStatus as IssueStatus) ? query.issueStatus as IssueStatus : '',
    scope: typeof query.issueScope === 'string' ? query.issueScope : ''
  }
}
export function issueScope(group: IssueGroup): string {
  const parts = [group.vrf || '', group.vni || 0, group.direction || '']
  if (group.scope === 'fabric') parts.push('fabric')
  return JSON.stringify(parts)
}
export function deviceIssues(groups: IssueGroup[], deviceId: number) {
  return groups.filter(group => group.devices.some(device => device.deviceId === deviceId && ['affected', 'unknown'].includes(device.status)))
}

export function sourceConfiguration(segments: Segment[], vni: number, deviceId: number) {
  const cell = segments.filter(segment => segment.vni === vni).flatMap(segment => segment.cells).find(cell => cell.deviceId === deviceId && Object.keys(cell.configuration || {}).length > 0)
  if (!cell) return undefined
  return { cell, vrf: typeof asRecord(cell.configuration.svi).vrf === 'string' ? asRecord(cell.configuration.svi).vrf as string : '' }
}
