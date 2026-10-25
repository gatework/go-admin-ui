import { describe, expect, it } from 'vitest'
import { preferenceTime } from '@/utils/preference-time'
describe('preference time zone', () => {
  it('changes the day and clock of explicit instants', () => {
    expect(preferenceTime('2026-10-25T20:15:00Z', 'Asia/Hong_Kong')).toBe('2026-10-26 04:15:00')
    expect(preferenceTime('2026-10-25T20:15:00Z', 'UTC', '{y}-{m}-{d}')).toBe('2026-10-25')
  })
  it('leaves zone-less API dates to their existing formatter', () => {
    expect(preferenceTime('2026-10-25 12:00:00', 'UTC')).toBeUndefined()
    expect(preferenceTime('badZ', 'UTC')).toBeUndefined()
  })
})
