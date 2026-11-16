import { describe, expect, it } from 'vitest'
import { formatDiagnosticCommand, formatDiagnosticOutput, plainDiagnosticOutput } from '@/views/network/diagnostics/format-output'

const plain = (parts: { text: string }[]) => parts.map(part => part.text).join('')

describe('diagnostic terminal formatting', () => {
  it('preserves columns, blank lines, IPv6 and unknown output verbatim', () => {
    const text = ' 1  2001:db8::1    *  RFC3849\n                    0.19 ms\n\n<unknown data="1">线路</unknown>\n'
    expect(plain(formatDiagnosticOutput(text, 'nexttrace'))).toBe(text)
    expect(formatDiagnosticOutput(text, 'nexttrace')).toContainEqual({ text: ' 1', tone: 'hop' })
    expect(formatDiagnosticOutput(text, 'nexttrace')).toContainEqual({ text: '0.19 ms', tone: 'metric' })
  })

  it('colors existing field types without inferring latency severity or route failure', () => {
    const parts = formatDiagnosticOutput(' 1  192.0.2.1  AS64496  RFC5737\n  999.99 ms / 0.1 ms / * ms\n 2  *\n', 'nexttrace')
    expect(parts).toContainEqual({ text: 'AS64496', tone: 'asn' })
    expect(parts).toContainEqual({ text: 'RFC5737', tone: 'annotation' })
    expect(parts).toContainEqual({ text: '999.99 ms', tone: 'metric' })
    expect(parts).toContainEqual({ text: '0.1 ms', tone: 'metric' })
    expect(parts.filter(part => part.text === '*').every(part => part.tone === 'muted')).toBe(true)
  })

  it('distinguishes route hop numbers from ping packet sizes and iperf stream IDs', () => {
    expect(formatDiagnosticOutput(' 1.|-- 192.0.2.1  0.0%  10  0.3\n', 'mtr')[0]).toEqual({ text: ' 1.|--', tone: 'hop' })
    expect(formatDiagnosticOutput('64 bytes from 192.0.2.1: time=0.3 ms\n', 'ping')[0].tone).not.toBe('hop')
    const output = '[  5]   0.00-1.00 sec  112 MBytes  940 Mbits/sec\n'
    const parts = formatDiagnosticOutput(output, 'iperf3')
    expect(plain(parts)).toBe(output)
    expect(parts).toContainEqual({ text: '940 Mbits/sec', tone: 'metric' })
  })

  it('keeps the complete execution command, including flags and exact whitespace', () => {
    const command = 'nexttrace  --no-color --max-hops 20 2001:db8::1'
    const parts = formatDiagnosticCommand(command, '2001:db8::1')
    expect(plain(parts)).toBe(command)
    expect(parts[0]).toEqual({ text: 'nexttrace', tone: 'command' })
    expect(parts).toContainEqual({ text: '--no-color', tone: 'muted' })
    expect(parts).toContainEqual({ text: '2001:db8::1', tone: 'hop' })
  })

  it('normalizes console escapes once for display, copy and download', () => {
    expect(plainDiagnosticOutput('\x1b[32m1  192.0.2.1\x1b[0m\r\n0.3 ms\r')).toBe('1  192.0.2.1\n0.3 ms\n')
  })

  it('bounds highlighting nodes without losing large output', () => {
    const output = ' 1  192.0.2.1  AS64496  0.25 ms\n'.repeat(9000)
    const parts = formatDiagnosticOutput(output, 'nexttrace')
    expect(parts.length).toBeLessThanOrEqual(4097)
    expect(plain(parts)).toBe(output)
  })
})
