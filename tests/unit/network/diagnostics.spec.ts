import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDiagnostics } from '@/views/network/diagnostics/use-diagnostics'
import { getDiagnosticJob, startDiagnostic, stopDiagnostic } from '@/api/network/diagnostics'

vi.mock('@/api/network/diagnostics', () => ({ getDiagnosticJob: vi.fn(), startDiagnostic: vi.fn(), stopDiagnostic: vi.fn() }))
const job = { id: 'job-1', tool: 'ping', target: '127.0.0.1', family: 'auto', mode: 'client', command: 'ping 127.0.0.1', status: 'running', output: 'first\n', truncated: false, startedAt: '2026-10-26T04:00:00Z', finishedAt: null, expiresAt: null, port: 0 } as const
const response = (data: unknown) => ({ code: 200, msg: '', data })
let scope: ReturnType<typeof effectScope>
const setup = () => { scope = effectScope(); return scope.run(() => useDiagnostics())! }

describe('diagnostic job sessions', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); sessionStorage.clear() })
  afterEach(() => { scope?.stop(); vi.useRealTimers() })

  it('starts once, updates real output and stops polling after completion', async() => {
    vi.mocked(startDiagnostic).mockResolvedValue(response(job) as never)
    vi.mocked(getDiagnosticJob).mockResolvedValue(response({ ...job, status: 'succeeded', output: 'first\ncomplete\n' }) as never)
    const state = setup()
    await state.start({ tool: 'ping', target: '127.0.0.1', family: 'auto', mode: 'client' })
    await state.start({ tool: 'ping', target: '127.0.0.1', family: 'auto', mode: 'client' })
    expect(startDiagnostic).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(state.run.job?.output).toContain('complete')
    expect(state.run.job?.status).toBe('succeeded')
    await vi.advanceTimersByTimeAsync(5000)
    expect(getDiagnosticJob).toHaveBeenCalledTimes(1)
  })

  it('keeps unknown running jobs locked after a polling failure and permits explicit recovery', async() => {
    vi.mocked(startDiagnostic).mockResolvedValue(response(job) as never)
    vi.mocked(getDiagnosticJob).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(response({ ...job, status: 'succeeded' }) as never)
    const state = setup()
    await state.start({ tool: 'ping', target: '127.0.0.1' })
    await vi.advanceTimersByTimeAsync(1000)
    expect(state.run.pollFailed).toBe(true)
    expect(state.busy(state.run)).toBe(true)
    expect(state.run.job?.output).toBe('first\n')
    await state.refresh()
    expect(state.run.pollFailed).toBe(false)
    expect(state.busy(state.run)).toBe(false)
  })

  it('stops a server session without replacing the diagnostic output', async() => {
    vi.mocked(startDiagnostic).mockResolvedValueOnce(response(job) as never).mockResolvedValueOnce(response({ ...job, id: 'server-1', tool: 'iperf3', mode: 'server', port: 5201 }) as never)
    vi.mocked(stopDiagnostic).mockResolvedValue(response({ ...job, id: 'server-1', tool: 'iperf3', mode: 'server', status: 'cancelled' }) as never)
    const state = setup()
    await state.start({ tool: 'ping', target: '127.0.0.1' })
    await state.start({ tool: 'iperf3', mode: 'server' })
    await state.stop(state.session)
    expect(stopDiagnostic).toHaveBeenCalledWith('server-1')
    expect(state.session.job?.status).toBe('cancelled')
    expect(state.run.job?.id).toBe('job-1')
  })

  it('suspends updates while inactive and resumes without starting another command', async() => {
    vi.mocked(startDiagnostic).mockResolvedValue(response(job) as never)
    vi.mocked(getDiagnosticJob).mockResolvedValue(response(job) as never)
    const state = setup()
    await state.start({ tool: 'ping', target: '127.0.0.1' })
    state.pause()
    await vi.advanceTimersByTimeAsync(3000)
    expect(getDiagnosticJob).not.toHaveBeenCalled()
    await state.resume()
    expect(getDiagnosticJob).toHaveBeenCalledWith('job-1')
    expect(startDiagnostic).toHaveBeenCalledTimes(1)
  })

  it('recognizes a lost backend job and unlocks a new diagnostic', async() => {
    vi.mocked(startDiagnostic).mockResolvedValue(response(job) as never)
    vi.mocked(getDiagnosticJob).mockRejectedValue(Object.assign(new Error('lost'), { code: 404 }))
    const state = setup()
    await state.start({ tool: 'ping', target: '127.0.0.1' })
    await vi.advanceTimersByTimeAsync(1000)
    expect(state.run.missing).toBe(true)
    expect(state.busy(state.run)).toBe(false)
    expect(state.run.job?.output).toBe('first\n')
  })

  it('retains a saved running job when the first restore request fails', async() => {
    sessionStorage.setItem('motor-network-diagnostics', JSON.stringify(['job-1', null]))
    vi.mocked(getDiagnosticJob).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(response(job) as never)
    const state = setup()
    await state.resume()
    expect(state.run.pollFailed).toBe(true)
    expect(state.busy(state.run)).toBe(true)
    expect(JSON.parse(sessionStorage.getItem('motor-network-diagnostics')!)[0]).toBe('job-1')
    await state.refresh()
    expect(state.run.job?.id).toBe('job-1')
    expect(startDiagnostic).not.toHaveBeenCalled()
  })
})
