import { describe, expect, it, vi } from 'vitest'
import { display, EMPTY } from '@/utils/format'
import { datedFilename, downloadBlob } from '@/utils/download'

describe('display', () => {
  it('shows a dash for nothing', () => {
    for (const value of [undefined, null, '']) expect(display(value)).toBe(EMPTY)
  })

  it('keeps zero and false: they are values', () => {
    expect(display(0)).toBe('0')
    expect(display(false)).toBe('false')
    expect(display('sw-01')).toBe('sw-01')
  })
})

describe('download', () => {
  it('names a file by day', () => {
    expect(datedFilename('device-inventory', 'csv', new Date('2026-11-16T08:00:00Z'))).toBe('device-inventory-2026-11-16.csv')
  })

  it('clicks a link to an object URL and releases it afterwards', () => {
    vi.useFakeTimers()
    const create = vi.fn(() => 'blob:x')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadBlob('a,b', 'rows.csv', 'text/csv')

    expect(create).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    // Not at once: Safari cancels a download whose URL is already gone.
    expect(revoke).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith('blob:x')
    vi.useRealTimers()
    click.mockRestore()
  })
})
