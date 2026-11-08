import { readFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { test, expect } from '@playwright/test'

// Opt in against the local backend. Never runs external throughput tests.
test.use({ trace: 'off', video: 'off', viewport: { width: 1440, height: 1100 }})
test('real backend tools, browser ping, and temporary iPerf3 expiry', async({ page, context, request }) => {
  test.skip(!process.env.DIAGNOSTICS_LIVE_TOKEN_FILE, 'Set DIAGNOSTICS_LIVE_TOKEN_FILE to a private local JWT file')
  test.setTimeout(180_000)
  const token = readFileSync(process.env.DIAGNOSTICS_LIVE_TOKEN_FILE!, 'utf8').trim()
  const base = 'http://localhost:8000/api/v1/network-diagnostics'
  const headers = { Authorization: `Bearer ${token}` }
  const jobs: string[] = []
  const evidence: Record<string, unknown>[] = []
  async function call(path: string, method = 'GET', data?: unknown) {
    const response = await request.fetch(`${base}${path}`, { method, headers, data })
    const result = await response.json()
    expect(result.code, `${method} ${path}: ${result.msg}`).toBe(200)
    return result.data
  }
  async function start(data: Record<string, unknown>) {
    const job = await call('/jobs', 'POST', data)
    jobs.push(job.id)
    return job
  }
  async function finished(id: string) {
    let job = await call(`/jobs/${id}`)
    await expect.poll(async() => { job = await call(`/jobs/${id}`); return job.status }, { timeout: 65_000, intervals: [250, 500, 1000] }).not.toBe('running')
    evidence.push({ tool: job.tool, mode: job.mode, family: job.family, status: job.status, output: job.output })
    return job
  }
  try {
    const server = await call('/server')
    expect(server.tools).toHaveLength(5)
    expect(server.tools.every((tool: { available: boolean }) => tool.available)).toBe(true)
    const session = await start({ tool: 'iperf3', mode: 'server', family: '4' })
    await expect.poll(async() => (await call(`/jobs/${session.id}`)).output, { timeout: 10_000 }).toContain('Server listening')
    for (const tool of ['ping', 'mtr', 'nexttrace', 'traceroute']) {
      const job = await start({ tool, target: '127.0.0.1', family: '4' })
      const result = await finished(job.id)
      expect(result.status, `${tool}: ${result.output}`).toBe('succeeded')
      expect(result.output).toContain('127.0.0.1')
    }
    const ipv6 = await start({ tool: 'ping', target: '::1', family: '6' })
    expect((await finished(ipv6.id)).status).toBe('succeeded')
    for (const reverse of [false, true]) {
      const client = await start({ tool: 'iperf3', mode: 'client', target: '127.0.0.1', family: '4', port: session.port, duration: 1, reverse })
      const result = await finished(client.id)
      expect(result.status, result.output).toBe('succeeded')
      expect(result.output).toContain('receiver')
    }
    if (process.env.DIAGNOSTICS_HOST_IPERF3) {
      for (const reverse of [false, true]) {
        const { stdout } = await promisify(execFile)(process.env.DIAGNOSTICS_HOST_IPERF3, ['-c', '127.0.0.1', '-p', String(session.port), '-t', '1', ...(reverse ? ['-R'] : [])], { timeout: 10_000 })
        expect(stdout).toContain('receiver')
        evidence.push({ tool: 'iperf3', mode: 'host-client', reverse, output: stdout })
      }
    }
    await context.addCookies([{ name: 'Admin-Token', value: token, domain: 'localhost', path: '/', sameSite: 'Lax' }])
    await page.goto('/#/network/diagnostics')
    await expect(page.getByRole('region', { name: '检查结果', exact: true })).toBeVisible()
    await expect(page.getByText('正在加载系统资源', { exact: true })).not.toBeVisible()
    await page.getByLabel('目标地址', { exact: true }).fill('127.0.0.1')
    await page.getByRole('button', { name: '开始检查', exact: true }).click()
    await expect(page.locator('pre')).toContainText('127.0.0.1')
    await expect(page.getByText('已完成', { exact: true })).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: '.impeccable/review/network-diagnostics/live-backend.png', animations: 'disabled' })
    const cancelled = await start({ tool: 'mtr', target: '127.0.0.1' })
    expect((await call(`/jobs/${cancelled.id}`, 'DELETE')).status).toBe('cancelled')
    await expect.poll(async() => (await call(`/jobs/${session.id}`)).status, { timeout: 125_000, intervals: [1000] }).toBe('expired')
    const replacement = await start({ tool: 'iperf3', mode: 'server', family: '4' })
    expect(replacement.port).toBe(session.port)
    await expect.poll(async() => (await call(`/jobs/${replacement.id}`)).output).toContain('Server listening')
    expect((await call(`/jobs/${replacement.id}`, 'DELETE')).status).toBe('cancelled')
    console.log(JSON.stringify({ server, jobs: evidence, expiry: 'expired', portReused: replacement.port }))
  } finally {
    for (const id of jobs) await request.delete(`${base}/jobs/${id}`, { headers }).catch(() => {})
    await context.clearCookies()
  }
})
