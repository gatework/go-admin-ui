import { afterEach, expect, it, vi } from 'vitest'
import { persistLoginAppearance, readLoginAppearance } from '@/utils/login-appearance'
import storage from '@/utils/storage'
afterEach(() => vi.restoreAllMocks())
it('survives a denied storage getter during login boot and preference writes', () => {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError') })
  expect(readLoginAppearance()).toEqual({ formPosition: 'right' })
  expect(() => persistLoginAppearance({ formPosition: 'left' })).not.toThrow()
  expect(storage.get('app_info')).toBeNull()
  expect(() => storage.set('app_info', {})).not.toThrow()
})
