import { describe, expect, it, vi } from 'vitest'
import { createIntentKey, newZoneBinding, createReadOwner, correctedInput, positiveId, visibleFields } from '@/views/network/firewall/presentation'

describe('firewall workbench ownership and corrections', () => {
  it('defaults zone bindings to routing-scope domain inheritance', () => {
    expect(newZoneBinding()).toEqual({ zone: '', scope: '', routingScope: '', domainId: 0, protected: true, networks: [] })
  })
  it('keeps row provenance and removes pasted text when correcting normalized rows', () => {
    expect(correctedInput([{ key: 'line-7', source: '10.0.0.1', destination: 'db', service: '', notes: 'original note', line: 7, sources: [], destinations: [], services: [], corrections: [], issues: [], status: 'invalid' }])).toEqual({ defaultProtocol: 'tcp', rows: [{ key: 'line-7', source: '10.0.0.1', destination: 'db', service: '', notes: 'original note' }] })
  })
  it('discards a slow read after a newer read and aborts when disposed', async() => {
    const owner = createReadOwner(); let resolve!: (value: string) => void; const changed = vi.fn()
    const slow = owner.run(() => new Promise<string>(done => { resolve = done }), changed)
    await owner.run(async() => 'current', changed); resolve('old'); await slow
    expect(changed.mock.calls).toEqual([['current']]); owner.stop(); await owner.run(async() => 'hidden', changed); expect(changed).toHaveBeenCalledTimes(1)
  })
  it('reuses an idempotency key after uncertainty and rotates after acceptance or a changed basis', () => {
    const key = createIntentKey(); const original = key.for('request:4:v2'); expect(key.for('request:4:v2')).toBe(original); expect(key.for('request:4:v3')).not.toBe(original); const current = key.for('request:4:v3'); key.accepted(); expect(key.for('request:4:v3')).not.toBe(current)
  })
  it('accepts only positive safe IDs and hides rendered command fields', () => {
    expect(positiveId('12')).toBe(12); expect(positiveId('1e2')).toBeUndefined(); expect(positiveId('-2')).toBeUndefined()
    expect(visibleFields({ name: 'rule', command: 'unsafe', renderedCommands: ['unsafe'], source: ['a', 'b'] })).toEqual([{ name: 'name', value: 'rule' }, { name: 'source', value: 'a, b' }])
  })
})
