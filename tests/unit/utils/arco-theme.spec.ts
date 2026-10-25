import { applyColorScheme } from '@/utils/color-scheme'

it('switches Arco popups and page surfaces together', () => {
  applyColorScheme('dark')
  expect(document.body.getAttribute('arco-theme')).toBe('dark')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  applyColorScheme('light')
  expect(document.body.hasAttribute('arco-theme')).toBe(false)
  expect(document.documentElement.classList.contains('dark')).toBe(false)
})
