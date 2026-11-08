import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { authenticate, installApiMocks, userInfo } from './fixtures'

const captureDirectory = process.env.DIAGNOSTICS_CAPTURE_DIR || '.impeccable/review/network-diagnostics'

async function diagnosticsMock(page: Page, canRun = true) {
  await installApiMocks(page)
  const state = { requests: [] as Record<string, unknown>[], stops: [] as string[], status: 'running', command: '', failPoll: false, missingJob: false, missingTool: false, addresses: ['172.20.0.4'], output: 'PING 192.0.2.1 (192.0.2.1): 56 data bytes\n64 bytes from 192.0.2.1: icmp_seq=1 ttl=64 time=0.152 ms\n' }
  await page.route('**/api/v1/getinfo*', route => route.fulfill({ json: { ...userInfo, data: { ...userInfo.data, permissions: canRun ? ['network:diagnostics:run'] : [] }}}))
  await page.route('**/api/v1/menurole*', route => route.fulfill({ json: { code: 200, data: [{ path: '/network', component: 'Layout', visible: '0', menuName: 'NetworkManagement', menuType: 'M', title: '网络管理', icon: 'branch', children: [{ path: 'diagnostics', component: '/network/diagnostics/index', visible: '0', menuName: 'NetworkDiagnostics', menuType: 'C', title: '网络检查', icon: 'code', noCache: false, children: null }] }] }}))
  let current: Record<string, unknown> | undefined
  await page.route('**/api/v1/network-diagnostics/**', route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path.endsWith('/server')) return route.fulfill({ json: { code: 200, data: { id: 'backend', name: 'motor backend', hostname: 'motor-backend', connectHost: 'localhost', addresses: state.addresses, sessionSeconds: 120, tools: ['ping', 'mtr', 'nexttrace', 'iperf3', 'traceroute'].map(id => ({ id, available: !state.missingTool || id !== 'nexttrace' })) }}})
    if (request.method() === 'POST') {
      const data = request.postDataJSON()
      state.requests.push(data)
      current = { id: `task-${state.requests.length}`, ...data, command: state.command || (data.mode === 'server' ? 'iperf3 -s -p 5201' : `${data.tool} -c 5 ${data.target}`), status: 'running', output: data.mode === 'server' ? 'Server listening on 5201\n' : state.output, truncated: false, startedAt: new Date().toISOString(), finishedAt: null, expiresAt: data.mode === 'server' ? new Date(Date.now() + 120000).toISOString() : null, port: 5201 }
      return route.fulfill({ json: { code: 200, data: current }})
    }
    if (request.method() === 'DELETE') {
      state.stops.push(path)
      current = { ...current, status: 'cancelled', finishedAt: new Date().toISOString() }
      return route.fulfill({ json: { code: 200, data: current }})
    }
    if (state.failPoll) return route.fulfill({ status: 503, json: { code: 503, msg: 'Connection interrupted' }})
    if (state.missingJob) return route.fulfill({ json: { code: 404, msg: 'Task not found' }})
    return route.fulfill({ json: { code: 200, data: { ...current, status: current?.status === 'cancelled' ? 'cancelled' : state.status, output: current?.mode === 'server' ? current.output : state.output }}})
  })
  return state
}

async function tool(page: Page, value: string) {
  await page.getByRole('combobox', { name: '检查工具', exact: true }).locator('..').click()
  await page.getByRole('option', { name: value, exact: true }).click()
}

test.describe('network diagnostics', () => {
  test.use({ viewport: { width: 1440, height: 1100 }})
  test.beforeEach(async({ context }) => authenticate(context))
  test('runs from the backend, preserves output on failure, resumes and stops', async({ page }) => {
    const state = await diagnosticsMock(page)
    await page.goto('/#/network/diagnostics')
    await expect(page.getByRole('region', { name: '检查结果', exact: true })).toBeVisible()
    await expect(page.getByText('正在加载系统资源', { exact: true })).not.toBeVisible()
    if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/desktop-empty.png`, fullPage: false })
    await page.getByLabel('目标地址', { exact: true }).fill('192.0.2.1')
    await page.getByRole('button', { name: '开始检查', exact: true }).click()
    await expect(page.locator('pre')).toContainText('time=0.152')
    await expect(page.getByRole('button', { name: '复制结果', exact: true })).toBeEnabled()
    expect(state.requests[0]).toEqual({ tool: 'ping', target: '192.0.2.1', family: 'auto', mode: 'client' })
    await expect(page.getByRole('button', { name: '开始检查', exact: true })).toHaveCount(0)
    state.failPoll = true
    await expect(page.getByText('结果更新已中断', { exact: true })).toBeVisible()
    await expect(page.locator('pre')).toContainText('time=0.152')
    if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/desktop-interrupted.png` })
    state.failPoll = false
    await page.getByRole('button', { name: '恢复更新', exact: true }).click()
    await expect(page.getByText('结果更新已中断', { exact: true })).not.toBeVisible()
    await page.getByRole('button', { name: '停止', exact: true }).click()
    await expect(page.getByText('已停止', { exact: true })).toBeVisible()
    expect(state.stops).toHaveLength(1)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: '下载结果', exact: true }).click()
    expect((await download).suggestedFilename()).toBe('ping-task-1.txt')
    await expect(page.locator('.arco-message')).toHaveCount(0)
    await page.evaluate(() => window.scrollTo(0, 0))
    if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/desktop.png`, fullPage: false })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })

  test('supports iperf client options and temporary server commands', async({ page }) => {
    const state = await diagnosticsMock(page)
    await page.goto('/#/network/diagnostics')
    await tool(page, 'iperf3')
    await page.getByLabel('目标地址', { exact: true }).fill('iperf.example.test')
    await page.getByRole('button', { name: '开始检查', exact: true }).click()
    await expect.poll(() => state.requests.length).toBe(1)
    expect(state.requests[0]).toMatchObject({ tool: 'iperf3', mode: 'client', port: 5201, duration: 10, reverse: false })
    await page.getByRole('button', { name: '停止', exact: true }).click()
    await page.getByText('客户端连接后端', { exact: true }).click()
    const terminal = await page.locator('.diagnostic-output__terminal').elementHandle()
    await expect(page.getByLabel('目标地址', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '开启测速会话', exact: true }).click()
    await expect(page.getByText('等待客户端连接', { exact: true })).toBeVisible()
    await expect(page.locator('code').filter({ hasText: 'iperf3 -c localhost -p 5201 -t 10 -R' })).toBeVisible()
    expect(state.requests[1]).toEqual({ tool: 'iperf3', family: 'auto', mode: 'server' })
    const sessionBox = (await page.locator('.diagnostics-page__session').boundingBox())!
    const outputBox = (await page.locator('.diagnostic-output').boundingBox())!
    expect(Math.abs(sessionBox.width - outputBox.width)).toBeLessThan(2)
    expect(outputBox.y).toBeGreaterThanOrEqual(sessionBox.y + sessionBox.height)
    if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/desktop-session.png`, fullPage: false })
    if (process.env.DIAGNOSTICS_CAPTURE) {
      await page.getByRole('button', { name: '关闭会话', exact: true }).scrollIntoViewIfNeeded()
      await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/desktop-session-controls.png` })
    }
    await page.getByRole('button', { name: '关闭会话', exact: true }).click()
    await expect(page.locator('.diagnostics-page__sidebar')).toHaveCount(0)
    expect(await terminal!.evaluate(element => element.isConnected)).toBe(true)
  })

  test('explains missing tools and respects execution permission', async({ page }) => {
    const state = await diagnosticsMock(page, false)
    state.missingTool = true
    await page.goto('/#/network/diagnostics')
    await expect(page.getByText('当前账户没有执行网络检查的权限。')).toBeVisible()
    await expect(page.getByRole('button', { name: '开始检查', exact: true })).toHaveCount(0)
    await tool(page, 'nexttrace')
    await expect(page.getByText('后端尚未安装 nexttrace。安装后重新获取服务器信息即可使用。')).toBeVisible()
    expect(state.requests).toHaveLength(0)
  })

  test('mobile light supports keyboard selection and long IPv6 output', async({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const state = await diagnosticsMock(page)
    state.output = 'traceroute to 2001:db8:1234:5678:abcd:efab:cdef:1234\n 1  2001:db8:1234:5678:abcd:efab:cdef:1234  0.152 ms  0.172 ms  0.196 ms\n'
    await page.goto('/#/network/diagnostics')
    await expect(page.getByRole('region', { name: '检查结果', exact: true })).toBeVisible()
    await expect(page.getByText('正在加载系统资源', { exact: true })).not.toBeVisible()
    const select = page.getByRole('combobox', { name: '检查工具', exact: true })
    await select.focus()
    await select.press('Enter')
    await expect(page.getByRole('option', { name: 'traceroute', exact: true })).toBeVisible()
    for (let index = 0; index < 4; index++) await select.press('ArrowDown')
    await select.press('Enter')
    await expect(select.locator('..')).toContainText('traceroute')
    await page.getByLabel('目标地址', { exact: true }).fill('2001:db8:1234:5678:abcd:efab:cdef:1234')
    await page.getByRole('button', { name: '开始检查', exact: true }).click()
    await expect(page.locator('pre')).toContainText('2001:db8')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled()
    await expect(page.getByRole('button', { name: '复制结果', exact: true })).toBeEnabled()
    if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/mobile.png` })
    await page.getByRole('button', { name: '停止', exact: true }).click()
  })

  test('desktop dark keeps native appearance and long output readable', async({ page }) => {
    await page.addInitScript(() => localStorage.setItem('color-scheme', 'dark'))
    const state = await diagnosticsMock(page)
    state.output = 'traceroute to 2001:db8:1234:5678:abcd:efab:cdef:1234\n 1  2001:db8:1234:5678:abcd:efab:cdef:1234  0.152 ms  0.172 ms  0.196 ms\n'
    await page.goto('/#/network/diagnostics')
    await expect(page.getByRole('region', { name: '检查结果', exact: true })).toBeVisible()
    await expect(page.getByText('正在加载系统资源', { exact: true })).not.toBeVisible()
    await tool(page, 'traceroute')
    await page.getByLabel('目标地址', { exact: true }).fill('2001:db8:1234:5678:abcd:efab:cdef:1234')
    await page.getByRole('button', { name: '开始检查', exact: true }).click()
    await expect(page.locator('pre')).toContainText('2001:db8')
    await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled()
    await expect(page.getByRole('button', { name: '复制结果', exact: true })).toBeEnabled()
    await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark')
    if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/desktop-dark.png` })
    await page.getByRole('button', { name: '停止', exact: true }).click()
  })

  test('mobile English dark mode keeps controls and output reachable', async({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript(() => { localStorage.setItem('locale', 'en-US'); localStorage.setItem('color-scheme', 'dark') })
    await diagnosticsMock(page)
    await page.goto('/#/network/diagnostics')
    await expect(page.getByRole('region', { name: 'Results', exact: true })).toBeVisible()
    await expect(page.getByText('正在加载系统资源', { exact: true })).not.toBeVisible()
    await page.getByLabel('Target address', { exact: true }).fill('192.0.2.1')
    await page.getByRole('button', { name: 'Run check', exact: true }).click()
    await expect(page.locator('pre')).toContainText('time=0.152')
    await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/mobile-dark.png`, fullPage: false })
    await page.getByRole('button', { name: 'Stop', exact: true }).click()
    await page.evaluate(() => localStorage.setItem('motor-admin-ui-preferences', JSON.stringify({ fontSize: 18, theme: 'dark' })))
    await page.reload()
    await expect(page.getByText('正在加载系统资源', { exact: true })).not.toBeVisible()
    await expect(page.getByLabel('Target address', { exact: true })).toHaveCSS('font-size', '18px')
    await expect(page.locator('.diagnostic-output__text')).toHaveCSS('font-size', '17px')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
  test('layout remains ordered across desktop, tablet and small phone widths', async({ page }) => {
    await diagnosticsMock(page)
    for (const width of [1920, 1440, 1280, 1024, 900, 390, 320]) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 })
      await page.goto('/#/network/diagnostics')
      await expect(page.getByRole('region', { name: '检查结果', exact: true })).toBeVisible()
      await expect(page.getByText('正在加载系统资源', { exact: true })).not.toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px overflow`).toBe(true)
      const controls = [page.getByRole('combobox', { name: '执行节点', exact: true }).locator('..'), page.getByRole('combobox', { name: '检查工具', exact: true }).locator('..'), page.getByLabel('目标地址', { exact: true }), page.getByRole('combobox', { name: '地址协议', exact: true }).locator('..'), page.getByRole('button', { name: '开始检查', exact: true })]
      const boxes = await Promise.all(controls.map(control => control.boundingBox()))
      for (let index = 1; index < boxes.length; index++) {
        const previous = boxes[index - 1]!
        const current = boxes[index]!
        expect(current.y >= previous.y - 2, `${width}px vertical field order`).toBe(true)
        if (Math.abs(current.y - previous.y) < 3) expect(current.x > previous.x, `${width}px horizontal field order`).toBe(true)
      }
      if (width >= 1280) {
        expect(boxes.every(box => Math.abs(box!.y - boxes[0]!.y) < 3)).toBe(true)
        expect((await page.locator('.diagnostics-page__controls').boundingBox())!.height).toBeLessThan(90)
      }
      await expect(page.locator('.diagnostics-page__sidebar')).toHaveCount(0)
      const alignment = await page.evaluate(() => {
        const toolbar = document.querySelector('.diagnostics-page__controls')!.getBoundingClientRect()
        const terminal = document.querySelector('.diagnostic-output')!.getBoundingClientRect()
        return Math.max(Math.abs(terminal.x - toolbar.x), Math.abs(terminal.width - toolbar.width))
      })
      expect(alignment).toBeLessThan(2)
      if (process.env.DIAGNOSTICS_CAPTURE && [1280, 900, 320].includes(width)) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/layout-${width}.png` })
    }
  })

  test('mobile temporary session reveals its connection controls', async({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await diagnosticsMock(page)
    await page.goto('/#/network/diagnostics')
    await tool(page, 'iperf3')
    await page.getByText('客户端连接后端', { exact: true }).click()
    await page.getByRole('button', { name: '开启测速会话', exact: true }).click()
    await expect(page.locator('.diagnostics-page__session')).toHaveAttribute('open', '')
    await expect(page.getByText('等待客户端连接', { exact: true })).toBeVisible()
    const close = page.getByRole('button', { name: '关闭会话', exact: true })
    await close.scrollIntoViewIfNeeded()
    await expect(close).toBeInViewport()
    if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/mobile-session.png` })
    await close.click()
    await expect(page.locator('.diagnostics-page__session')).toHaveCount(0)
  })

  for (const theme of ['light', 'dark']) {
    test(`terminal keeps colored NextTrace output faithful in ${theme} mode`, async({ page, context }) => {
      await page.addInitScript(value => localStorage.setItem('color-scheme', value), theme)
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      const state = await diagnosticsMock(page)
      state.command = 'nexttrace --no-color --no-rdns --max-hops 20 --queries 1 --timeout 1000 --data-provider disable-geoip trace.example.test'
      state.output = 'NextTrace v1.7.4\nIP Geo Data Provider: disable-geoip\n172.20.0.4 -> 203.0.113.10 (trace.example.test), 20 hops max, 28 byte packets, ICMP mode\n 1  172.20.0.1      *               RFC1918\n                                   0.19 ms\n 2  100.64.0.1      *               RFC6598\n                                   0.25 ms\n 3  192.0.2.1      *               RFC5737\n                                   8.88 ms\n 4  *\n 5  *\n 6  203.0.113.10   *               RFC5737\n                                   12.47 ms\nTrace Stopped: Destination Reached at Hop 6 (ICMP Echo Reply from 203.0.113.10)\n'
      state.status = 'succeeded'
      await page.goto('/#/network/diagnostics')
      await tool(page, 'nexttrace')
      await page.getByLabel('目标地址', { exact: true }).fill('trace.example.test')
      await page.getByRole('button', { name: '开始检查', exact: true }).click()
      await expect(page.getByText('已完成', { exact: true })).toBeVisible()
      expect(await page.locator('pre').textContent()).toBe(state.output)
      await expect(page.locator('.diagnostic-output__full-command')).not.toBeVisible()
      await page.getByLabel('完整执行命令', { exact: true }).press('Enter')
      await expect(page.locator('.diagnostic-output__full-command')).toHaveText(state.command)
      await page.getByLabel('完整执行命令', { exact: true }).press('Enter')
      await expect(page.locator('.diagnostic-output__full-command')).not.toBeVisible()
      await expect(page.getByText('显示逐跳网络路径；离线模式不查询外部 IP 地理信息。', { exact: true })).not.toBeVisible()
      await expect(page.locator('.diagnostics-page__session')).toHaveCount(0)
      await expect(page.getByRole('button', { name: '开始检查', exact: true })).toBeEnabled()
      const contrasts = await page.locator('.diagnostic-output__terminal').evaluate(element => {
        const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(channel => channel / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
        const background = luminance(getComputedStyle(element).backgroundColor)
        return ['.diagnostic-output__text', '.diagnostic-output__hop', '.diagnostic-output__metric', '.diagnostic-output__annotation', '.diagnostic-output__command', '.diagnostic-output__result', '.arco-checkbox-label', 'h2'].map(selector => {
          const foreground = luminance(getComputedStyle(element.querySelector(selector)!).color)
          return { selector, ratio: (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05) }
        })
      })
      for (const contrast of contrasts) expect(contrast.ratio, contrast.selector).toBeGreaterThanOrEqual(4.5)
      await page.getByLabel('目标地址', { exact: true }).click()
      if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/nexttrace-${theme}.png` })
      if (theme === 'dark') {
        await page.setViewportSize({ width: 390, height: 844 })
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/nexttrace-mobile.png` })
        await page.getByText('跟随输出', { exact: true }).click()
        await expect(page.getByRole('checkbox', { name: '跟随输出', exact: true })).not.toBeChecked()
        await expect(page.locator('.diagnostic-output__result')).toBeInViewport()
        await page.getByText('跟随输出', { exact: true }).click()
        if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/nexttrace-mobile-controls.png` })
      }
      state.output += '<img src=x onerror="window.untrustedOutput=true">\n'
      state.status = 'running'
      // Start another job so this new raw output passes through the real rendering path.
      await page.getByRole('button', { name: '开始检查', exact: true }).click()
      await expect(page.locator('pre')).toContainText('<img src=x')
      await expect(page.locator('pre img')).toHaveCount(0)
      await page.getByRole('button', { name: '复制结果', exact: true }).click()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(state.output)
      const downloadEvent = page.waitForEvent('download')
      await page.getByRole('button', { name: '下载结果', exact: true }).click()
      const download = await downloadEvent
      const saved = await readFile((await download.path())!, 'utf8')
      expect(saved).toContain(state.command)
      expect(saved.endsWith(`\n\n${state.output}`)).toBe(true)
    })
  }

  test('terminal scrolling preserves manual position and keeps status visible', async({ page }) => {
    const state = await diagnosticsMock(page)
    state.output = '64 bytes from 192.0.2.1: icmp_seq=1 ttl=64 time=0.152 ms\n'.repeat(100)
    await page.goto('/#/network/diagnostics')
    await page.getByLabel('目标地址', { exact: true }).fill('192.0.2.1')
    await page.getByRole('button', { name: '开始检查', exact: true }).click()
    const viewport = page.locator('.diagnostic-output__viewport')
    await expect.poll(() => viewport.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(2)
    await page.getByText('跟随输出', { exact: true }).click()
    await expect(page.getByRole('checkbox', { name: '跟随输出', exact: true })).not.toBeChecked()
    await viewport.evaluate(element => { element.scrollTop = 0 })
    state.output += 'last reply 0.2 ms\n'
    await expect(page.locator('pre')).toContainText('last reply')
    expect(await viewport.evaluate(element => element.scrollTop)).toBe(0)
    await expect(page.locator('.diagnostic-output__result')).toBeInViewport()
    await page.getByText('跟随输出', { exact: true }).click()
    await expect(page.getByRole('checkbox', { name: '跟随输出', exact: true })).toBeChecked()
    await expect.poll(() => viewport.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(2)
    await page.getByRole('button', { name: '停止', exact: true }).click()
    await expect(page.getByText('已停止', { exact: true })).toBeVisible()
  })

  test('groups the real execution node with command controls and retains the target across tools', async({ page }) => {
    const state = await diagnosticsMock(page)
    state.status = 'succeeded'
    await page.goto('/#/network/diagnostics')
    const toolbar = page.locator('.diagnostics-page__controls')
    const node = toolbar.getByRole('combobox', { name: '执行节点', exact: true })
    await expect(node.locator('..')).toContainText('motor backend')
    await node.focus()
    await node.press('Enter')
    await expect(page.getByRole('option', { name: 'motor backend', exact: true })).toBeVisible()
    await node.press('Escape')
    await expect(toolbar.getByRole('combobox', { name: '检查工具', exact: true })).toHaveCount(1)
    await expect(toolbar.getByLabel('目标地址', { exact: true })).toBeVisible()
    await expect(page.getByText('发送 5 个探测包，检查延迟和丢包。', { exact: true })).not.toBeVisible()
    await expect(page.locator('.diagnostics-page__session')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '停止', exact: true })).toHaveCount(0)
    await page.getByLabel('目标地址', { exact: true }).fill('192.0.2.1')
    await page.getByRole('button', { name: '开始检查', exact: true }).click()
    await expect(page.getByText('已完成', { exact: true })).toBeVisible()
    await tool(page, 'mtr')
    await expect(page.getByLabel('目标地址', { exact: true })).toHaveValue('192.0.2.1')
    await expect(page.locator('pre')).toHaveText(state.output)
    expect(state.requests).toHaveLength(1)
  })

  test('shows node details on demand with keyboard dismissal and narrow IPv6 wrapping', async({ page }) => {
    const state = await diagnosticsMock(page)
    state.addresses = ['172.20.0.4', '2001:db8:1234:5678:abcd:efab:cdef:1234']
    await page.goto('/#/network/diagnostics')
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: width === 320 ? 844 : 1100 })
      const button = page.getByRole('button', { name: '节点详情', exact: true })
      const details = page.getByRole('region', { name: '节点详情', exact: true })
      await expect(details).not.toBeVisible()
      await button.focus()
      await button.press('Enter')
      await expect(details).toBeVisible()
      await expect(details).toBeFocused()
      await expect(details).toBeInViewport()
      await expect.poll(() => details.evaluate(element => {
        let opacity = 1
        for (let parent: HTMLElement | null = element as HTMLElement; parent; parent = parent.parentElement) opacity *= Number(getComputedStyle(parent).opacity)
        return opacity
      })).toBe(1)
      await expect(details).toContainText('motor-backend')
      await expect(details).toContainText(state.addresses[1])
      const box = (await details.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/node-details-${width}.png` })
      await details.press('Escape')
      await expect(details).not.toBeVisible()
      await expect(button).toBeFocused()
    }
  })

  test('keeps lost-task guidance inside the terminal and allows a new explicit run', async({ page }) => {
    const state = await diagnosticsMock(page)
    await page.goto('/#/network/diagnostics')
    await page.getByLabel('目标地址', { exact: true }).fill('192.0.2.1')
    await page.getByRole('button', { name: '开始检查', exact: true }).click()
    await expect(page.locator('pre')).toContainText('time=0.152')
    state.missingJob = true
    const footer = page.locator('.diagnostic-output__footer')
    await expect(footer.getByText('任务不可用', { exact: true })).toBeVisible()
    await expect(footer).toContainText('当前输出已保留，可重新检查。')
    await expect(footer.getByText('执行中', { exact: true })).not.toBeVisible()
    await expect(page.locator('.diagnostics-page__workspace > .arco-alert')).toHaveCount(0)
    await expect(page.locator('pre')).toContainText('time=0.152')
    await expect(page.getByRole('button', { name: '开始检查', exact: true })).toBeEnabled()
    expect(state.requests).toHaveLength(1)
    if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/missing-desktop.png` })
    await page.setViewportSize({ width: 390, height: 844 })
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeInViewport()
    expect((await page.locator('.diagnostic-output__viewport').boundingBox())!.height).toBeGreaterThan(160)
    if (process.env.DIAGNOSTICS_CAPTURE) await page.screenshot({ animations: 'disabled', path: `${captureDirectory}/missing-mobile.png` })
    state.missingJob = false
    await page.getByRole('button', { name: '开始检查', exact: true }).click()
    await expect.poll(() => state.requests.length).toBe(2)
    await expect(footer.getByText('执行中', { exact: true })).toBeVisible()
    await expect(footer.getByText('任务不可用', { exact: true })).not.toBeVisible()
  })
})
