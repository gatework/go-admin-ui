import { describe, expect, it } from 'vitest'
import { APP_META, resolveAppName } from '@/config/app-meta'

describe('application branding', () => {
  it('uses motor for missing names and previous default brands', () => {
    for (const name of [undefined, '', '  ', 'go-admin', 'Go Admin', 'go-admin管理系统', 'go-admin后台管理系统', 'go-admin 后台管理系统', 'Motor', 'Motor Admin', 'MOTOR']) {
      expect(resolveAppName(name)).toBe('motor')
    }
    expect(APP_META.name).toBe('motor')
  })

  it('preserves a deployment-specific application name', () => {
    expect(resolveAppName('内部网络平台')).toBe('内部网络平台')
    expect(resolveAppName('motor lab')).toBe('motor lab')
  })
})
