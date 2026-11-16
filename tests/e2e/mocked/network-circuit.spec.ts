import { expect, test } from '@playwright/test'
import { authenticate } from './fixtures'
import { circuitMock } from './support/circuit'

test.describe('circuit inventory and monitoring', () => {
  test.beforeEach(async({ context }) => authenticate(context))

  test('filters, exports applied filters, opens details and restores keyboard focus', async({ page }) => {
    const state = await circuitMock(page)
    await page.goto('/#/network/circuit')
    const trigger = page.getByRole('button', { name: 'Verification circuit', exact: true })
    await expect(trigger).toBeVisible()
    await expect(page.getByRole('textbox', { name: '线路状态', exact: true })).toBeVisible()
    await expect(page.locator('.pro-table__toolbar').getByRole('button', { name: '新增', exact: true })).toBeVisible()
    await trigger.click()
    const detail = page.getByRole('dialog', { name: '专线详情', exact: true })
    await expect(detail.getByText('Building A', { exact: true })).toBeVisible()
    await detail.getByRole('button', { name: '关闭', exact: true }).click()
    await expect(trigger).toBeFocused()
    await page.getByPlaceholder('编号、名称、合同、运营商、地区或组织').fill('Verification')
    await page.locator('.pro-table__search').getByRole('button', { name: '搜索', exact: true }).click()
    await expect.poll(() => state.queries.at(-1)?.get('keyword')).toBe('Verification')
    await page.getByPlaceholder('编号、名称、合同、运营商、地区或组织').fill('unsent')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出', exact: true }).click()
    expect((await download).suggestedFilename()).toMatch(/\.csv$/)
    expect(state.exports[0].get('keyword')).toBe('Verification')
    expect(state.exports[0].has('pageIndex')).toBe(false)
  })

  test('keeps 409 draft and protects dirty close until an explicit discard', async({ page }) => {
    const state = await circuitMock(page)
    await page.goto('/#/network/circuit')
    await page.getByRole('row', { name: /Verification circuit/ }).getByRole('button', { name: '修改', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '编辑专线', exact: true })
    await editor.getByLabel('线路名称', { exact: true }).fill('Unsaved draft')
    state.conflict = true
    await editor.getByRole('button', { name: '保存', exact: true }).click()
    await expect(editor.getByText('专线已被其他操作更新', { exact: true })).toBeVisible()
    await expect(editor.getByLabel('线路名称', { exact: true })).toHaveValue('Unsaved draft')
    await expect(editor.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
    expect(state.writes[0]).toMatchObject({ name: 'Unsaved draft', version: 3 })
    expect(state.writes[0]).not.toHaveProperty('id')
    await editor.getByRole('button', { name: '取消', exact: true }).click()
    const confirmation = page.getByRole('dialog', { name: '放弃未保存的修改？', exact: true })
    await confirmation.getByRole('button', { name: '继续编辑', exact: true }).click()
    await expect(editor.getByLabel('线路名称', { exact: true })).toHaveValue('Unsaved draft')
    state.conflict = false
    state.record.name = 'Concurrent change'
    state.record.version = 4
    await editor.getByRole('button', { name: '丢弃草稿并重新加载', exact: true }).click()
    await confirmation.getByRole('button', { name: '放弃修改', exact: true }).click()
    await expect(editor.getByLabel('线路名称', { exact: true })).toHaveValue('Concurrent change')
    await editor.getByLabel('线路名称', { exact: true }).fill('Reviewed change')
    await editor.getByRole('button', { name: '保存', exact: true }).click()
    await expect(editor).not.toBeVisible()
    expect(state.writes[1]).toMatchObject({ name: 'Reviewed change', version: 4 })
  })

  for (const operation of ['create', 'rename'] as const) {
    test(`keeps a duplicate-number ${operation} draft editable and saves a corrected retry`, async({ page }) => {
      const state = await circuitMock(page)
      state.duplicateNo = 'TEST-TAKEN'
      await page.goto('/#/network/circuit')
      if (operation === 'create') await page.getByRole('button', { name: '新增', exact: true }).click()
      else await page.getByRole('row', { name: /Verification circuit/ }).getByRole('button', { name: '修改', exact: true }).click()
      const editor = page.getByRole('dialog', { name: operation === 'create' ? '新增专线' : '编辑专线', exact: true })
      await editor.getByLabel('线路编号', { exact: true }).fill('TEST-TAKEN')
      await editor.getByLabel('线路名称', { exact: true }).fill('Preserved circuit draft')
      if (operation === 'create') await editor.getByLabel('运营商', { exact: true }).fill('Example Telecom')
      await editor.getByRole('button', { name: '保存', exact: true }).click()
      await expect(editor.getByText('保存未完成，草稿已保留。请检查后重试。', { exact: true })).toBeVisible()
      await expect(editor.getByText('专线已被其他操作更新', { exact: true })).toHaveCount(0)
      await expect(editor.getByLabel('线路编号', { exact: true })).toBeEditable()
      await expect(editor.getByLabel('线路名称', { exact: true })).toHaveValue('Preserved circuit draft')
      await expect(editor.getByRole('button', { name: '保存', exact: true })).toBeEnabled()
      await editor.getByLabel('线路编号', { exact: true }).fill('TEST-CORRECTED')
      await editor.getByRole('button', { name: '保存', exact: true }).click()
      await expect(editor).not.toBeVisible()
      const version = operation === 'create' ? 0 : 3
      expect(state.writes).toHaveLength(2)
      expect(state.writes[0]).toMatchObject({ circuitNo: 'TEST-TAKEN', name: 'Preserved circuit draft', version })
      expect(state.writes[1]).toMatchObject({ circuitNo: 'TEST-CORRECTED', name: 'Preserved circuit draft', version })
    })
  }

  test('accepts delayed monitoring validation and lookups beyond the shared 10 second default', async({ page }) => {
    test.setTimeout(30000)
    const state = await circuitMock(page)
    state.monitoringDelay = 11000
    await page.goto('/#/network/circuit')
    await expect(page.getByRole('button', { name: 'Verification circuit', exact: true })).toBeVisible()
    const codes = await page.evaluate(async record => {
      const apiPath = '/src/api/network/circuit.ts'
      const formPath = '/src/views/network/circuit/form.ts'
      const api = await import(apiPath)
      const form = await import(formPath)
      const payload = form.circuitPayload(form.toCircuitDraft(record))
      const responses = await Promise.all([
        api.addCircuit(payload), api.updateCircuit(record.id, payload),
        api.searchCircuitHosts('TEST'), api.searchCircuitItems('22', '')
      ])
      return responses.map(response => response.code)
    }, state.record)
    expect(codes).toEqual([200, 200, 200, 200])
    await expect(page.locator('.arco-message-error')).toHaveCount(0)
  })

  test('loads all traffic periods, preserves stale and partial evidence, and retries errors', async({ page }) => {
    const state = await circuitMock(page)
    await page.goto('/#/network/circuit')
    await page.getByRole('button', { name: '流量', exact: true }).click()
    const traffic = page.getByRole('dialog', { name: '专线流量', exact: true })
    await expect(traffic.getByText('采样已过期', { exact: true })).toBeVisible()
    await expect(traffic.getByText('已取样本峰值', { exact: true })).toBeVisible()
    await expect(traffic.getByText('0 bps', { exact: true })).toBeVisible()
    await expect(traffic.locator('canvas')).toHaveCount(1)
    for (const label of ['6 小时', '24 小时', '7 天']) await traffic.getByText(label, { exact: true }).click()
    await expect(traffic.getByText('7 天曲线为小时均值；峰值来自每小时最大值。', { exact: true })).toBeVisible()
    expect(state.periods).toEqual(['1h', '6h', '24h', '7d'])
    state.trafficError = true
    await traffic.getByRole('button', { name: '刷新', exact: true }).click()
    await expect(traffic.getByText('流量读取失败', { exact: true })).toBeVisible()
    state.trafficError = false
    await traffic.getByRole('button', { name: '重试', exact: true }).click()
    await expect(traffic.locator('canvas')).toHaveCount(1)
  })

  test('creates an unmonitored circuit and deletes the planned record with its version', async({ page }) => {
    const state = await circuitMock(page)
    state.configured = false
    await page.goto('/#/network/circuit')
    await page.getByRole('button', { name: '新增', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '新增专线', exact: true })
    await editor.getByRole('button', { name: '保存', exact: true }).click()
    await expect(editor.getByText('请填写必填项').first()).toBeVisible()
    expect(state.writes).toHaveLength(0)
    await editor.getByLabel('线路编号', { exact: true }).fill(' test-new/9 ')
    await editor.getByLabel('线路名称', { exact: true }).fill('New test circuit')
    await editor.getByLabel('运营商', { exact: true }).fill('Example Telecom')
    await editor.getByLabel('费用', { exact: true }).fill('0')
    await editor.getByRole('button', { name: '保存', exact: true }).click()
    await expect(editor).not.toBeVisible()
    expect(state.writes[0]).toMatchObject({ circuitNo: 'TEST-NEW/9', status: 'planned', fee: '0.00', bandwidthMbps: null, version: 0, aEndpoint: { monitoring: { hostId: '', inItemId: '', outItemId: '' }}})
    await page.getByRole('button', { name: '更多操作', exact: true }).click()
    await page.getByRole('menuitem', { name: '删除', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: '删除', exact: true }).click()
    await expect(page.getByText('尚无专线台账', { exact: true })).toBeVisible()
    expect(state.deletions).toEqual([{ version: 1 }])
  })

  test('searches hosts and items by endpoint, clears both directions when the host changes', async({ page }) => {
    const state = await circuitMock(page)
    await page.goto('/#/network/circuit')
    await page.getByRole('row', { name: /Verification circuit/ }).getByRole('button', { name: '修改', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '编辑专线', exact: true })
    const host = editor.getByLabel('A 端 Zabbix 主机', { exact: true })
    await host.locator('..').click()
    await host.fill('TEST-EDGE-Z')
    await page.locator('.arco-select-option:visible').filter({ hasText: 'TEST-EDGE-Z' }).click()
    await expect(editor.getByLabel('A 端 入站监控项', { exact: true })).toHaveValue('')
    await expect(editor.getByLabel('A 端 出站监控项', { exact: true })).toHaveValue('')
    await editor.getByLabel('A 端 入站监控项', { exact: true }).click()
    await page.locator('.arco-select-option:visible').filter({ hasText: 'Z inbound' }).click()
    await editor.getByLabel('A 端 出站监控项', { exact: true }).click()
    await expect(page.locator('.arco-select-option:visible').filter({ hasText: 'Z inbound' })).toHaveClass(/disabled/)
    await page.locator('.arco-select-option:visible').filter({ hasText: 'Z outbound' }).click()
    await editor.getByRole('button', { name: '保存', exact: true }).click()
    await expect(editor).not.toBeVisible()
    expect(state.hosts).toContain('TEST-EDGE-Z')
    expect(state.items).toContain('22')
    expect(state.writes[0]).toMatchObject({ aEndpoint: { monitoring: { hostId: '22', inItemId: '201', outItemId: '202' }}, zEndpoint: { monitoring: { hostId: '' }}})
  })

  test('cancels closed details and rapid period changes without displaying late data', async({ page }) => {
    const state = await circuitMock(page)
    state.detailDelay = 500
    state.periodDelay = 600
    await page.goto('/#/network/circuit')
    await page.getByRole('button', { name: 'Verification circuit', exact: true }).click()
    await page.getByRole('dialog', { name: '专线详情', exact: true }).getByRole('button', { name: '关闭', exact: true }).click()
    await page.getByRole('button', { name: '流量', exact: true }).click()
    const traffic = page.getByRole('dialog', { name: '专线流量', exact: true })
    await traffic.getByText('7 天', { exact: true }).click()
    await expect(traffic.getByText('7 天曲线为小时均值；峰值来自每小时最大值。', { exact: true })).toBeVisible()
    await page.waitForTimeout(650)
    await expect(traffic.getByText('7 天曲线为小时均值；峰值来自每小时最大值。', { exact: true })).toBeVisible()
    await expect(page.getByRole('dialog', { name: '专线详情', exact: true })).not.toBeVisible()
    await expect(page.locator('.arco-message-error')).toHaveCount(0)
    await traffic.getByRole('button', { name: '关闭', exact: true }).click()
    await expect(page.locator('.circuit-chart')).toHaveCount(0)
  })

  test('shows unconfigured and unbound traffic without inventing zero rates', async({ page }) => {
    const state = await circuitMock(page)
    state.configured = false
    await page.goto('/#/network/circuit')
    await page.getByRole('button', { name: '流量', exact: true }).click()
    const traffic = page.getByRole('dialog', { name: '专线流量', exact: true })
    await expect(traffic.getByText('尚未配置 Zabbix', { exact: true })).toBeVisible()
    await expect(traffic.getByText('0 bps', { exact: true })).toHaveCount(0)
    state.configured = true
    state.trafficEmpty = true
    await traffic.getByRole('button', { name: '刷新', exact: true }).click()
    await expect(traffic.getByText('本端未绑定监控项', { exact: true })).toHaveCount(2)
    await expect(traffic.getByText('0 bps', { exact: true })).toHaveCount(0)
    await expect(traffic.locator('canvas')).toHaveCount(0)
  })

  test('keeps configuration unknown after options failure and offers retry without disabling inventory edits', async({ page }) => {
    const state = await circuitMock(page)
    state.optionsError = true
    await page.goto('/#/network/circuit')
    await page.getByRole('button', { name: '新增', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '新增专线', exact: true })
    await expect(editor.getByText('查询失败，请重试。已有绑定保持不变。', { exact: true })).toBeVisible()
    await editor.getByRole('button', { name: '流量监控绑定', exact: true }).first().click()
    await expect(editor.getByText('尚未配置 Zabbix', { exact: true })).toHaveCount(0)
    await expect(editor.getByLabel('线路名称', { exact: true })).toBeEditable()
    state.optionsError = false
    await editor.getByRole('button', { name: '重试', exact: true }).click()
    await expect(editor.getByText('查询失败，请重试。已有绑定保持不变。', { exact: true })).toHaveCount(0)
    await expect(editor.getByLabel('A 端 Zabbix 主机', { exact: true })).toBeEnabled()
  })

  test('adapts long circuit names, details and traffic to a dark 390px screen', async({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript(() => localStorage.setItem('motor-admin-ui-preferences', JSON.stringify({ theme: 'dark', fontSize: 16 })))
    const state = await circuitMock(page)
    state.record.name = 'Verification circuit with a long descriptive name for branch interconnection'
    await page.goto('/#/network/circuit')
    await page.getByRole('button', { name: state.record.name, exact: true }).click()
    const detail = page.getByRole('dialog', { name: '专线详情', exact: true })
    await expect(detail.getByText('Building A', { exact: true })).toBeVisible()
    await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark')
    await detail.getByRole('button', { name: '流量', exact: true }).click()
    const traffic = page.getByRole('dialog', { name: '专线流量', exact: true })
    await expect(traffic.locator('canvas')).toHaveCount(1)
    await expect(traffic.locator('.arco-drawer')).not.toHaveClass(/enter-active/)
    const overflow = await traffic.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }))
    if (overflow.scroll > overflow.client + 1) {
      const elements = await traffic.evaluate(element => Array.from(element.querySelectorAll('*')).filter(node => node.getBoundingClientRect().right > innerWidth).slice(0, 20).map(node => ({ tag: node.tagName, class: node.className, right: node.getBoundingClientRect().right, width: node.getBoundingClientRect().width, text: node.textContent?.slice(0, 100) })))
      await test.info().attach('overflow.json', { body: JSON.stringify(elements, null, 2), contentType: 'application/json' })
    }
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1)
    await traffic.getByRole('button', { name: '关闭', exact: true }).click()
    await page.getByRole('button', { name: '页面操作', exact: true }).click()
    await page.getByRole('button', { name: '新增', exact: true }).click()
    const editor = page.getByRole('dialog', { name: '新增专线', exact: true })
    await expect(editor.getByRole('button', { name: '保存', exact: true })).toBeInViewport()
    const input = await editor.getByLabel('线路名称', { exact: true }).boundingBox()
    expect(input!.height).toBeGreaterThanOrEqual(30)
  })
})
