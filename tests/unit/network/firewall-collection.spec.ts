import { describe, expect, it } from 'vitest'
import { chooseCollectionInstance, collectionSubmission, inferredBindings } from '@/views/network/firewall/collection'
import type { Coverage, FirewallDevice, Instance } from '@/types/firewall'

const row = (instances: Instance[] = [], vendor = 'hillstone') => ({ id: 1, connection: { vendor }, instances }) as FirewallDevice
describe('firewall collection intent', () => {
  it('fills native zones without marking any protected or replacing saved choices', () => {
    const saved = { zone: 'inside', scope: '', routingScope: 'blue', domainId: 2, protected: true, networks: ['10.1.0.0/16'] }
    const native = [{ zone: 'inside', scope: '', routingScope: 'blue' }, { zone: 'outside', scope: '', routingScope: '' }, { zone: 'outside', scope: '', routingScope: '' }] as Coverage[]
    expect(inferredBindings(native, [saved])).toEqual([saved, { zone: 'outside', scope: '', routingScope: '', domainId: 0, protected: false, networks: [] }])
  })
  it('uses inventory defaults and requires an explicit ambiguous or Fortinet context', () => {
    expect(chooseCollectionInstance(row(), undefined, true).create).toBe(true)
    expect(chooseCollectionInstance(row([], 'fortinet'), undefined, true).reason).toBe('context_required')
    expect(chooseCollectionInstance(row(), undefined, false).reason).toBe('instance_required')
    const instances = [{ id: 3 }, { id: 4 }] as Instance[]
    expect(chooseCollectionInstance(row(instances), undefined, true).reason).toBe('choose_context')
    expect(chooseCollectionInstance(row(instances), 4, true).instanceId).toBe(4)
    expect(chooseCollectionInstance(row(instances), 99, true).reason).toBe('choose_context')
  })
  it('reuses the request key after an uncertain response, but not for changed work', () => {
    const first = collectionSubmission('capture', [3, 2])
    expect(collectionSubmission('capture', [2, 3], first)).toEqual(first)
    expect(collectionSubmission('connection_test', [2, 3], first).requestKey).not.toBe(first.requestKey)
  })
})
