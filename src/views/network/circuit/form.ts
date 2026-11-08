import { circuitBillingCycles, circuitCategories, circuitPayers, circuitPurposes, circuitStatuses } from '@/types/network-circuit'
import type { Circuit, CircuitBinding, CircuitDraft, CircuitEndpoint, CircuitInput, CircuitStatus } from '@/types/network-circuit'

export const emptyBinding = (): CircuitBinding => ({ hostId: '', hostName: '', inItemId: '', inItemName: '', outItemId: '', outItemName: '' })
export const emptyEndpoint = (): CircuitEndpoint => ({ deviceId: null, name: '', address: '', interface: '', ip: '', contactName: '', contactPhone: '', monitoring: emptyBinding() })
export function emptyCircuitDraft(): CircuitDraft {
  return { id: undefined, version: 0, circuitNo: '', name: '', provider: '', category: 'other', purpose: 'other', status: 'planned', bandwidthMbps: null, region: '', organization: '', contractNo: '', installedOn: '', expiresOn: '', payer: 'us', fee: '', currency: 'CNY', billingCycle: '', routeNotes: '', notes: '', aEndpoint: emptyEndpoint(), zEndpoint: emptyEndpoint() }
}
export function toCircuitDraft(record: Circuit): CircuitDraft {
  const result = emptyCircuitDraft()
  for (const key of Object.keys(result) as (keyof CircuitDraft)[]) Object.assign(result, { [key]: record[key] })
  result.aEndpoint = { ...emptyEndpoint(), ...record.aEndpoint, monitoring: { ...emptyBinding(), ...record.aEndpoint?.monitoring }}
  result.zEndpoint = { ...emptyEndpoint(), ...record.zEndpoint, monitoring: { ...emptyBinding(), ...record.zEndpoint?.monitoring }}
  return result
}
export function circuitPayload(draft: CircuitDraft): CircuitInput {
  const allowed = emptyCircuitDraft()
  const payload = Object.fromEntries(Object.keys(allowed).filter(key => key !== 'id').map(key => [key, draft[key as keyof CircuitInput]])) as unknown as CircuitInput
  for (const [key, value] of Object.entries(payload)) if (typeof value === 'string') Object.assign(payload, { [key]: value.trim() })
  payload.circuitNo = payload.circuitNo.toUpperCase()
  payload.currency = payload.currency.toUpperCase()
  payload.bandwidthMbps = draft.bandwidthMbps ?? null
  if (/^\d{1,10}(\.\d{1,2})?$/.test(payload.fee)) {
    const [whole, fraction = ''] = payload.fee.split('.')
    payload.fee = `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`
  }
  for (const side of ['aEndpoint', 'zEndpoint'] as const) {
    const endpoint = draft[side]
    payload[side] = {
      deviceId: endpoint.deviceId ?? null, name: endpoint.name.trim(), address: endpoint.address.trim(), interface: endpoint.interface.trim(), ip: endpoint.ip.trim(), contactName: endpoint.contactName.trim(), contactPhone: endpoint.contactPhone.trim(),
      monitoring: Object.fromEntries(Object.keys(emptyBinding()).map(key => [key, endpoint.monitoring[key as keyof CircuitBinding].trim()])) as unknown as CircuitBinding
    }
  }
  return payload
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
function validIP(value: string) {
  if (value.includes(':')) {
    try { return new URL(`http://[${value}]/`).hostname.startsWith('[') } catch { return false }
  }
  return /^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(value) && value.split('.').every(part => Number(part) <= 255)
}
export function validateCircuit(draft: CircuitDraft, previousStatus?: CircuitStatus): Record<string, string> {
  const data = circuitPayload(draft)
  const errors: Record<string, string> = {}
  const text = (field: string, value: string, limit: number, required = false) => {
    if (required && !value) errors[field] = 'required'
    else if (value.includes('\0') || Array.from(value).length > limit) errors[field] = 'text'
  }
  for (const [key, limit] of Object.entries({ circuitNo: 120, name: 160, provider: 160, region: 120, organization: 160, contractNo: 160, notes: 10000, routeNotes: 10000 })) {
    text(key, String(data[key as keyof CircuitInput]), limit, ['circuitNo', 'name', 'provider'].includes(key))
  }
  if (!/^[A-Z0-9][A-Z0-9._/-]{0,119}$/.test(data.circuitNo)) errors.circuitNo = 'circuitNo'
  const enums = { category: circuitCategories, purpose: circuitPurposes, status: circuitStatuses, payer: circuitPayers, billingCycle: ['', ...circuitBillingCycles] }
  for (const [key, values] of Object.entries(enums)) if (!(values as readonly string[]).includes(String(data[key as keyof CircuitInput]))) errors[key] = 'enum'
  if (previousStatus === 'terminated' && data.status !== previousStatus) errors.status = 'terminated'
  if (data.bandwidthMbps !== null && (!Number.isInteger(data.bandwidthMbps) || data.bandwidthMbps < 1 || data.bandwidthMbps > 1000000)) errors.bandwidthMbps = 'bandwidth'
  if (data.fee && (!/^\d{1,10}\.\d{2}$/.test(data.fee) || Number(data.fee) > 9999999999.99)) errors.fee = 'fee'
  if (!/^[A-Z]{3}$/.test(data.currency)) errors.currency = 'currency'
  for (const field of ['installedOn', 'expiresOn'] as const) if (data[field] && !validDate(data[field])) errors[field] = 'date'
  if (data.installedOn && data.expiresOn && data.expiresOn < data.installedOn) errors.expiresOn = 'dateOrder'
  for (const side of ['aEndpoint', 'zEndpoint'] as const) {
    const endpoint = data[side]
    for (const [field, limit] of Object.entries({ name: 160, address: 512, interface: 160, contactName: 128, contactPhone: 64 })) text(`${side}.${field}`, String(endpoint[field as keyof CircuitEndpoint]), limit)
    if (endpoint.ip && !validIP(endpoint.ip)) errors[`${side}.ip`] = 'ip'
    if (endpoint.deviceId !== null && (!Number.isInteger(endpoint.deviceId) || endpoint.deviceId <= 0)) errors[`${side}.deviceId`] = 'enum'
    const binding = endpoint.monitoring
    for (const field of ['hostId', 'inItemId', 'outItemId'] as const) if (binding[field] && !/^\d+$/.test(binding[field])) errors[`${side}.monitoring.${field}`] = 'binding'
    if (!binding.hostId && (binding.inItemId || binding.outItemId)) errors[`${side}.monitoring.hostId`] = 'binding'
    if (binding.inItemId && binding.inItemId === binding.outItemId) errors[`${side}.monitoring.outItemId`] = 'sameItem'
  }
  if (data.aEndpoint.deviceId !== null && data.aEndpoint.deviceId === data.zEndpoint.deviceId) errors['zEndpoint.deviceId'] = 'sameDevice'
  return errors
}
