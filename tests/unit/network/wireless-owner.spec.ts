import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOwner } from '@/views/network/wireless/owner'
import type { Collection } from '@/types/network-wireless'
const job = (status = 'running', version = 1) => ({ id: 1, status, version } as Collection)
describe('wireless refresh ownership', () => {
  afterEach(() => vi.useRealTimers())
  it('serializes detail reads without blocking task completion', async() => {
    vi.useFakeTimers()
    let release!: () => void
    const read = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve })).mockResolvedValue(undefined)
    const track = vi.fn().mockResolvedValue(job('succeeded', 2))
    const owner = createOwner({ read, discover: async() => [job()], track })
    owner.start(); await vi.advanceTimersByTimeAsync(3000)
    expect(track).toHaveBeenCalledTimes(1); expect(read).toHaveBeenCalledTimes(1)
    release(); await vi.advanceTimersByTimeAsync(0)
    expect(read).toHaveBeenCalledTimes(2)
    owner.stop(); await vi.advanceTimersByTimeAsync(30000); expect(read).toHaveBeenCalledTimes(2)
  })
  it('discards late jobs after stop and keeps visible cadence bounded', async() => {
    vi.useFakeTimers()
    let release!: (rows: Collection[]) => void
    const changed = vi.fn(); const read = vi.fn().mockResolvedValue(undefined)
    const owner = createOwner({ read, discover: () => new Promise(resolve => { release = resolve }), track: vi.fn(), changed })
    owner.start(); owner.start(); owner.stop(); release([job()]); await vi.advanceTimersByTimeAsync(30000)
    expect(changed).not.toHaveBeenCalled(); expect(read).toHaveBeenCalledTimes(1)
  })
})
