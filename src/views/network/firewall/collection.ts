import type { Binding, CollectionInput, CollectionKind, Coverage, FirewallDevice } from '@/types/firewall'

export function inferredBindings(coverage: Coverage[], existing: Binding[]): Binding[] {
  const zones = existing.map(item => ({ ...item, networks: [...item.networks] }))
  for (const item of coverage) {
    if (!item.zone || zones.some(zone => zone.zone === item.zone && zone.scope === item.scope && zone.routingScope === item.routingScope)) continue
    zones.push({ zone: item.zone, scope: item.scope, routingScope: item.routingScope, domainId: 0, protected: false, networks: [] })
  }
  return zones
}

export function chooseCollectionInstance(device: FirewallDevice, chosen: number | undefined, canCreate: boolean): { instanceId?: number, create?: boolean, reason?: string } {
  const instance = device.instances.find(item => item.id === chosen) || (chosen === undefined && device.instances.length === 1 ? device.instances[0] : undefined)
  if (instance) return { instanceId: instance.id }
  if (device.instances.length) return { reason: 'choose_context' }
  if (!canCreate) return { reason: 'instance_required' }
  if (!device.connection.vendor) return { reason: 'profile_unknown' }
  if (device.connection.contextRequired || device.connection.vendor === 'fortinet') return { reason: 'context_required' }
  return { create: true }
}

export function collectionSubmission(kind: CollectionKind, ids: number[], previous?: CollectionInput): CollectionInput {
  const instanceIds = [...new Set(ids)].sort((a, b) => a - b)
  if (previous?.kind === kind && JSON.stringify(previous.instanceIds) === JSON.stringify(instanceIds)) return previous
  return { requestKey: crypto.randomUUID(), kind, instanceIds }
}
