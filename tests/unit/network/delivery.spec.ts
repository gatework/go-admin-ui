import { describe, expect, it } from 'vitest'
import { reconcileTargets, validateDraft, toPayload, fromOrder, scriptLines, isSubmissionUncertain, retryRequestKey } from '@/views/network/delivery/form'
import type { DeliveryOrder, DraftTarget } from '@/types/network-delivery'
import { errorKeys, reasonKeys } from '@/views/network/delivery/presentation'
import zh from '@/lang/zh-CN/network/delivery'
import en from '@/lang/en-US/network/delivery'
import { buildGroups, groupKey, initializeGroupScripts, reconcileGroupedTargets, updateGroupScript, setIndividualScript } from '@/views/network/delivery/groups'
import { inventoryQuery, mergeSelection } from '@/views/network/delivery/inventory'
import type { DeliveryDevice } from '@/types/network-delivery'

const device = (id: number) => ({ id, name: `Switch ${id}`, ip: `192.0.2.${id}`, hostname: '', vendor: 'H3C', model: 'S' })
const targets: DraftTarget[] = [{ deviceId: 1, device: device(1), script: 'system-view\ninterface Vlan-interface 10' }]
const limits = { maxTargets: 100, maxScriptBytes: 65536 }

describe('configuration delivery drafts', () => {
  it('explains every supported execution and connection reason in both languages', () => {
    for (const locale of [zh, en]) {
      for (const key of errorKeys) expect(locale.errors).toHaveProperty(key)
      for (const key of reasonKeys) expect(locale.reasons).toHaveProperty(key)
    }
  })

  it('recovers the same retry after remount and isolates a different source order', () => {
    expect(retryRequestKey({ id: 12, version: 4 })).toBe(retryRequestKey(JSON.parse('{"id":12,"version":4}')))
    expect(retryRequestKey({ id: 13, version: 4 })).not.toBe(retryRequestKey({ id: 12, version: 4 }))
  })

  it('keeps the same creation request after transport failure or ambiguous server failure', () => {
    for (const code of [undefined, 'ERR_NETWORK', 'ECONNABORTED', 500, 503]) expect(isSubmissionUncertain(code)).toBe(true)
    for (const code of [400, 403, 409, 422]) expect(isSubmissionUncertain(code)).toBe(false)
  })

  it('preserves per-device scripts across selection changes without mutating the old draft', () => {
    const next = reconcileTargets(targets, [device(2), device(1)], 'display clock')
    expect(next.map(row => [row.deviceId, row.script])).toEqual([[2, 'display clock'], [1, targets[0].script]])
    next[1].script = 'changed'
    expect(targets[0].script).toContain('system-view')
    expect(reconcileTargets(next, [device(2)], '')).toHaveLength(1)
  })

  it('rejects an empty, comment-only or malformed script and measures UTF-8 bytes', () => {
    for (const script of ['', ' # annotation\n  ', 'display\0clock']) {
      expect(validateDraft({ title: 'Change', targets: [{ ...targets[0], script }] }, limits)).toBeTruthy()
    }
    expect(validateDraft({ title: 'Change', targets: [{ ...targets[0], script: '中'.repeat(22000) }] }, limits)).toBe('scriptTooLarge')
    expect(validateDraft({ title: 'Change', targets }, limits)).toBeUndefined()
    expect(scriptLines('# annotation\r\n display clock\r\n')).toBe(1)
  })

  it('rejects duplicate targets and the whole-order byte limit', () => {
    expect(validateDraft({ title: 'Change', targets: [targets[0], targets[0]] }, limits)).toBe('duplicateDevice')
    const large = Array.from({ length: 70 }, (_, index) => ({ deviceId: index + 1, device: device(index + 1), script: 'a'.repeat(64000) }))
    expect(validateDraft({ title: 'Change', targets: large }, limits)).toBe('scriptsTooLarge')
  })

  it('sends only ids and normalized scripts, retaining the request key separately', () => {
    expect(toPayload({ title: ' Change ', targets: [{ ...targets[0], script: ' display clock\r\n  display version ' }] })).toEqual({
      title: 'Change', targets: [{ deviceId: 1, script: 'display clock\n  display version' }]
    })
  })

  it('copies a historical script into an editable draft without sharing target objects', () => {
    const order = { id: 12, version: 3, title: 'Saved', targets: targets.map(target => ({ ...target })) } as unknown as DeliveryOrder
    const draft = fromOrder(order)
    expect(draft).toMatchObject({ id: 12, version: 3, title: 'Saved' })
    draft.targets[0].script = 'edited'
    expect(order.targets?.[0].script).toContain('system-view')
  })
})

describe('role-based configuration batches', () => {
  const target = (id: number, role: string, profile: string, script = ''): DraftTarget => ({ deviceId: id, device: { ...device(id), deviceRole: role, deviceType: 'switch', profile }, script })

  it('separates roles and incompatible platforms, using type only when role is missing', () => {
    const rows = [target(1, 'core_switch', 'h3c'), target(2, 'access_switch', 'h3c'), target(3, 'core_switch', 'cisco_nxos'), target(4, 'core_switch', 'h3c'), target(5, '', 'h3c')]
    expect(buildGroups(rows).map(group => group.targets.map(item => item.deviceId))).toEqual([[1, 4], [2], [3], [5]])
    expect(groupKey(device(6))).not.toBe(groupKey(device(7)))
  })

  it('preserves historical differences, propagates group changes only to inherited scripts and can restore inheritance', () => {
    const rows = [target(1, 'access_switch', 'h3c', 'display clock'), target(2, 'access_switch', 'h3c', 'display version'), target(3, 'access_switch', 'h3c', 'display clock')]
    const scripts = initializeGroupScripts(rows)
    const key = groupKey(rows[0].device)
    expect(scripts[key]).toBe('display clock')
    expect(rows.map(row => Boolean(row.individual))).toEqual([false, true, false])
    updateGroupScript(rows, scripts, key, 'system-view\nsysname ACCESS')
    expect(rows.map(row => row.script)).toEqual(['system-view\nsysname ACCESS', 'display version', 'system-view\nsysname ACCESS'])
    setIndividualScript(rows[1], false, scripts)
    expect(rows[1].script).toBe('system-view\nsysname ACCESS')
  })

  it('keeps edited targets across filter/removal/reselection and gives new role members their group script', () => {
    const original = target(1, 'core_switch', 'h3c', 'custom command')
    original.individual = true
    const scripts = { [groupKey(original.device)]: 'group command' }
    const cache = new Map<number, DraftTarget>([[1, original]])
    const second = target(2, 'core_switch', 'h3c')
    const third = target(3, 'access_switch', 'h3c')
    const rows = reconcileGroupedTargets([], [original.device, second.device, third.device], scripts, cache)
    expect(rows.map(row => row.script)).toEqual(['custom command', 'group command', ''])
    expect(rows[0].individual).toBe(true)
    expect(rows[0]).not.toBe(original)
  })

  it('preserves a script after a role or platform change but blocks sending until it is reviewed', () => {
    const original = target(1, 'access_switch', 'h3c', 'system-view')
    const updated = { ...original.device, profile: 'cisco_nxos' }
    const rows = reconcileGroupedTargets([original], [updated], { [groupKey(original.device)]: 'system-view' }, new Map())
    expect(rows[0].script).toBe('system-view')
    expect(rows[0].individual).toBe(true)
    expect(rows[0].needsReview).toBe(true)
    expect(validateDraft({ title: 'Update', targets: rows }, limits)).toBe('changedDevice')
    setIndividualScript(rows[0], false, { [groupKey(updated)]: 'configure terminal' })
    expect(rows[0].needsReview).toBe(false)
    expect(rows[0].script).toBe('configure terminal')
  })

  it('sends the observed role and platform so changed inventory cannot silently receive a mismatched script', () => {
    const row = target(1, 'access_switch', 'h3c', 'display clock')
    expect(toPayload({ title: 'Update', targets: [row] }).targets[0]).toMatchObject({ expectedProfile: 'h3c', expectedDeviceRole: 'access_switch' })
    const legacy = { ...row, device: device(1) }
    expect(toPayload({ title: 'Update', targets: [legacy] }).targets[0]).not.toHaveProperty('expectedDeviceRole')
  })
})

describe('delivery inventory selection', () => {
  it('maps role/vendor/model filters and distinguishes missing classifications from all devices', () => {
    expect(inventoryQuery({ keyword: 'access', role: 'access_switch', vendor: 'H3C', model: 'S5560' })).toEqual({ keyword: 'access', deviceRole: 'access_switch', vendor: 'H3C', model: 'S5560' })
    expect(inventoryQuery({ keyword: '', role: '__empty__', vendor: '__empty__' })).toMatchObject({ deviceRoleEmpty: true, vendorEmpty: true })
    expect(inventoryQuery({ keyword: '' })).not.toHaveProperty('deviceRoleEmpty')
  })

  it('merges across pages, ignores unavailable devices and rejects an oversized batch atomically', () => {
    const row = (id: number, ready = true) => ({ ...device(id), deviceRole: 'core_switch', deviceType: 'switch', connection: { ready, profile: 'h3c' }}) as DeliveryDevice
    const current = [device(1)]
    expect(mergeSelection(current, [row(1), row(2), row(3, false)], 2)?.map(item => item.id)).toEqual([1, 2])
    expect(mergeSelection(current, [row(2), row(3)], 2)).toBeUndefined()
    expect(current).toEqual([device(1)])
  })
})
