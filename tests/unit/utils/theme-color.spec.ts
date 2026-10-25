import { describe, it, expect, beforeEach } from 'vitest'
import { applyThemeColor } from '@/utils/theme-color'
const read = (name: string) => document.body.style.getPropertyValue(name)

describe('Arco theme palette', () => {
  beforeEach(() => {
    document.body.style.cssText = ''
    document.documentElement.className = ''
  })
  it('sets all ten primary and link shades on the body', () => {
    applyThemeColor('#165DFF')
    expect(read('--primary-6')).toBe('22,93,255')
    for (let step = 1; step <= 10; step++) {
      expect(read(`--primary-${step}`)).toMatch(/^\d+,\d+,\d+$/)
      expect(read(`--link-${step}`)).toBe(read(`--primary-${step}`))
    }
  })
  it('recomputes the palette when dark mode changes without remounting the picker', async() => {
    applyThemeColor('#165DFF')
    const light = read('--primary-1')
    document.documentElement.classList.add('dark')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(read('--primary-1')).not.toBe(light)
  })
  it('ignores invalid input and accepts short hex colors', () => {
    applyThemeColor('#08f')
    expect(read('--primary-6')).toBe('0,136,255')
    applyThemeColor('not a color')
    expect(read('--primary-6')).toBe('0,136,255')
  })
})
