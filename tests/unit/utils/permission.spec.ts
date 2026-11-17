import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '@/stores/user'
import { hasPermission, hasRole } from '@/utils/permission'
import { usePermission } from '@/composables/usePermission'

beforeEach(() => {
  setActivePinia(createPinia())
  const user = useUserStore()
  user.permisaction = ['network:device:query', 'network:device:edit']
  user.roles = ['operator']
})

describe('hasPermission', () => {
  it('accepts any one of the codes asked for', () => {
    expect(hasPermission(['network:device:edit'])).toBe(true)
    expect(hasPermission(['network:device:sync', 'network:device:query'])).toBe(true)
  })

  it('refuses a code the account does not hold', () => {
    expect(hasPermission(['network:device:sync'])).toBe(false)
    expect(hasPermission([])).toBe(false)
  })

  it('treats the wildcard as every permission', () => {
    useUserStore().permisaction = ['*:*:*']
    expect(hasPermission(['anything:at:all'])).toBe(true)
  })
})

describe('hasRole', () => {
  it('matches on role name', () => {
    expect(hasRole(['admin', 'operator'])).toBe(true)
    expect(hasRole(['admin'])).toBe(false)
  })
})

describe('usePermission', () => {
  it('prefixes the action with the resource', () => {
    const { can } = usePermission('network:device')
    expect(can('edit')).toBe(true)
    expect(can('sync')).toBe(false)
    expect(can('sync', 'query')).toBe(true)
  })

  // Pages wrap `can` in a computed; it has to see the account that is signed in now.
  it('follows a change of account', () => {
    const { can } = usePermission('network:device')
    useUserStore().permisaction = []
    expect(can('edit')).toBe(false)
  })
})
