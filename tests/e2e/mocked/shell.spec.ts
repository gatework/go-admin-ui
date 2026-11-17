import { test, expect, type Page } from '@playwright/test'
import { authenticate, choosePreference, installApiMocks, installLoginMocks, openPreferences } from './fixtures'

/**
 * The application shell: rail, header, tabs, command palette, preferences.
 *
 * Each test states something a reader relies on rather than how it is built --
 * where the navigation is, that a setting sticks, that the keyboard reaches it.
 */

const open = async(page: Page, path = '/#/demo/product') => {
  await page.goto(path)
  await page.locator('#loader-wrapper').waitFor({ state: 'detached', timeout: 10_000 }).catch(() => { /* already gone */ })
  await expect(page.locator('.app-main')).toBeVisible()
}

/** WCAG contrast ratio between an element's text and the first opaque background behind it. */
const contrast = (page: Page, selector: string) => page.locator(selector).first().evaluate(el => {
  const channels = (value: string) => (value.match(/[\d.]+/g) ?? []).map(Number)
  const luminance = ([r, g, b]: number[]) => {
    const [x, y, z] = [r, g, b].map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
    return 0.2126 * x + 0.7152 * y + 0.0722 * z
  }
  let node: Element | null = el
  let background = [255, 255, 255]
  while (node) {
    const value = channels(getComputedStyle(node).backgroundColor)
    if (value.length >= 3 && (value[3] ?? 1) > 0.9) { background = value; break }
    node = node.parentElement
  }
  const [light, dark] = [luminance(channels(getComputedStyle(el).color)), luminance(background)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
})

test.beforeEach(async({ page, context }) => {
  await authenticate(context)
  await installApiMocks(page)
  await page.setViewportSize({ width: 1440, height: 900 })
})

test.describe('rail', () => {
  test('carries the brand and the menu, and its header lines up with the top bar', async({ page }) => {
    await open(page)
    const brand = page.locator('.app-sidebar__brand')
    await expect(brand).toContainText('motor')
    const [rail, bar] = await Promise.all([brand.boundingBox(), page.locator('.navbar').boundingBox()])
    // Two elements in two columns; the seam under them reads as one line only if they end together.
    expect(Math.abs((rail!.y + rail!.height) - (bar!.y + bar!.height))).toBeLessThanOrEqual(1)
  })

  test('collapses to icons, keeps the mark on screen, and remembers it', async({ page }) => {
    await open(page)
    const rail = page.locator('.sidebar-container')
    const toggle = page.locator('#hamburger-container')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect.poll(async() => (await rail.boundingBox())!.width).toBe(56)
    await expect(page.locator('.app-sidebar__brand .brand__mark')).toBeInViewport()
    await expect(page.locator('.app-sidebar__brand .brand__name')).toHaveCount(0)

    await page.reload()
    await expect(page.locator('#hamburger-container')).toHaveAttribute('aria-expanded', 'false')
  })

  test('is legible on both surfaces, and the preference switches between them', async({ page }) => {
    await open(page)
    await expect.poll(() => contrast(page, '.sidebar-container .arco-menu-item')).toBeGreaterThanOrEqual(4.5)
    await expect.poll(() => contrast(page, '.sidebar-container .arco-menu-selected')).toBeGreaterThanOrEqual(4.5)

    const drawer = await openPreferences(page)
    await drawer.getByRole('switch', { name: '深色侧边栏' }).click()
    await page.keyboard.press('Escape')
    await expect(page.locator('.sidebar-container')).toHaveClass(/rail-dark/)
    await expect.poll(() => contrast(page, '.sidebar-container .arco-menu-item')).toBeGreaterThanOrEqual(4.5)
    await expect.poll(() => contrast(page, '.sidebar-container .arco-menu-selected')).toBeGreaterThanOrEqual(4.5)
    await expect.poll(() => contrast(page, '.app-sidebar__brand .brand__name')).toBeGreaterThanOrEqual(4.5)
  })

  test('resizes from the keyboard', async({ page }) => {
    await open(page)
    const resizer = page.getByRole('separator', { name: '侧边栏宽度' })
    await resizer.focus()
    await page.keyboard.press('ArrowRight')
    await expect(resizer).toHaveAttribute('aria-valuenow', '232')
  })

  test('becomes a drawer on a phone and closes on navigation', async({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await open(page)
    const rail = page.locator('.sidebar-container')
    await expect(rail).toHaveAttribute('inert', '')
    await page.locator('#hamburger-container').click()
    await expect(rail).not.toHaveAttribute('inert', '')
    await rail.getByText('Jobs', { exact: true }).click()
    await expect(page).toHaveURL(/#\/schedule/)
    await expect(rail).toHaveAttribute('inert', '')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})

test.describe('header', () => {
  test('shows where the page sits in the menu', async({ page }) => {
    await open(page)
    await expect(page.locator('#breadcrumb-container')).toHaveText(/首页.*Demo.*Product/)
  })

  test('the account menu reaches profile, preferences, lock and sign-out', async({ page }) => {
    await open(page)
    await page.locator('.avatar-wrapper').click()
    for (const name of ['用户中心', '偏好设置', '立即锁屏', '退出登录']) await expect(page.getByRole('menuitem', { name })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.avatar-wrapper')).toBeFocused()
  })

  test('toggles the colour scheme', async({ page }) => {
    await open(page)
    await page.locator('#theme-toggle').click()
    await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark')
    await page.locator('#theme-toggle').click()
    await expect(page.locator('body')).not.toHaveAttribute('arco-theme', 'dark')
  })
})

test.describe('command palette', () => {
  test('opens from the shortcut, filters, and opens the chosen page with the keyboard alone', async({ page }) => {
    await open(page)
    await page.keyboard.press('ControlOrMeta+K')
    const palette = page.locator('.command-palette')
    await expect(palette.locator('input')).toBeFocused()
    await page.keyboard.type('Role')
    await expect(palette.locator('.command-palette__item').first()).toContainText('Role')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/admin\/sys-role/)
    await expect(palette).toBeHidden()
  })

  test('lists every reachable page before anything is typed, and arrow keys move through it', async({ page }) => {
    await open(page)
    await page.locator('#header-search').click()
    const items = page.locator('.command-palette__item')
    expect(await items.count()).toBeGreaterThan(5)
    await expect(items.nth(0)).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(items.nth(1)).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await expect(items.last()).toHaveAttribute('aria-selected', 'true')
  })

  test('says so when nothing matches', async({ page }) => {
    await open(page)
    await page.locator('#header-search').click()
    await page.keyboard.type('zzzz-no-such-page')
    await expect(page.locator('.command-palette')).toContainText('没有找到可访问的导航页面')
  })
})

test.describe('tabs', () => {
  test('open per page, close from the tab, and fall back to the previous one', async({ page }) => {
    await open(page, '/#/admin/sys-user')
    await open(page, '/#/admin/sys-role')
    const bar = page.locator('#tags-view-container')
    await expect(bar).toContainText('User')
    const role = bar.locator('.arco-tabs-tab', { hasText: 'Role' })
    await role.hover()
    await role.locator('.arco-tabs-tab-close-btn').click()
    await expect(bar).not.toContainText('Role')
    await expect(page).toHaveURL(/#\/admin\/sys-user/)
  })

  test('the pinned home tab cannot be closed', async({ page }) => {
    await open(page)
    const home = page.locator('#tags-view-container .arco-tabs-tab', { hasText: '首页' })
    await home.hover()
    await expect(home.locator('.arco-tabs-tab-close-btn')).toHaveCount(0)
  })

  test('the context menu closes the others', async({ page }) => {
    await open(page, '/#/admin/sys-user')
    await open(page, '/#/admin/sys-role')
    const bar = page.locator('#tags-view-container')
    await bar.locator('.arco-tabs-tab', { hasText: 'Role' }).click({ button: 'right' })
    await page.getByRole('menuitem', { name: '关闭其他标签页' }).click()
    await expect(bar).not.toContainText('User')
    await expect(bar).toContainText('Role')
    await expect(bar).toContainText('首页')
  })

  test('survive a reload, and hiding the bar does not forget them', async({ page }) => {
    await open(page, '/#/admin/sys-user')
    await open(page, '/#/admin/sys-role')
    await page.reload()
    const bar = page.locator('#tags-view-container')
    await expect(bar).toContainText('User')
    await expect(bar).toContainText('Role')

    const drawer = await openPreferences(page)
    const toggle = drawer.getByRole('switch', { name: '多页签导航' })
    await toggle.click()
    await expect(bar).toBeHidden()
    await toggle.click()
    await expect(bar).toContainText('User')
  })
})

test.describe('preferences', () => {
  test('apply at once, survive a reload, and reset together', async({ page }) => {
    await open(page)
    const drawer = await openPreferences(page)
    await choosePreference(page, '暗色')
    await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark')
    await choosePreference(page, '紧凑')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
    await drawer.getByRole('radio', { name: '紫罗兰' }).click()

    await page.reload()
    await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('motor-admin-ui-preferences')!).themePreset)).toBe('violet')

    const reopened = await openPreferences(page)
    await reopened.getByRole('button', { name: '恢复默认设置' }).click()
    await page.getByRole('button', { name: '确认恢复', exact: true }).click()
    await expect(page.locator('body')).not.toHaveAttribute('arco-theme', 'dark')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
  })

  test('the chosen accent reaches Arco controls', async({ page }) => {
    await open(page)
    const drawer = await openPreferences(page)
    await drawer.getByRole('radio', { name: '紫罗兰' }).click()
    await page.keyboard.press('Escape')
    const button = page.getByRole('button', { name: '搜索', exact: true })
    await expect.poll(() => button.evaluate(el => {
      const probe = document.createElement('span'); probe.style.color = 'rgb(var(--primary-6))'; el.append(probe)
      const same = getComputedStyle(el).backgroundColor === getComputedStyle(probe).color; probe.remove(); return same
    })).toBe(true)
  })

  test('moving the navigation to the header removes the rail', async({ page }) => {
    await open(page)
    await openPreferences(page)
    await choosePreference(page, '水平')
    await page.keyboard.press('Escape')
    await expect(page.locator('.sidebar-container')).toHaveCount(0)
    await expect(page.locator('.navbar .arco-menu-horizontal')).toContainText('Demo')
  })

  test('fit a phone without scrolling sideways', async({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await open(page, '/#/dashboard')
    await openPreferences(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  })
})

test.describe('screen lock', () => {
  const configure = async(page: Page) => {
    const drawer = await openPreferences(page)
    await drawer.getByRole('button', { name: '设置锁屏密码', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '设置锁屏密码' })
    await dialog.locator('input[type="password"]').nth(0).fill('local123')
    await dialog.locator('input[type="password"]').nth(1).fill('local123')
    await dialog.getByRole('button', { name: '保存设置' }).click()
    return page.locator('.lock-screen')
  }

  test('covers the workbench, rejects a wrong password and opens for the right one', async({ page }) => {
    await open(page, '/#/dashboard')
    const lock = await configure(page)
    await expect(lock).toBeVisible()
    await expect(page.locator('.app-root')).toHaveAttribute('inert')
    await lock.locator('input').fill('incorrect')
    await lock.getByRole('button', { name: '解锁工作台', exact: true }).click()
    await expect(lock.getByRole('alert')).toBeVisible()
    await lock.locator('input').fill('local123')
    await lock.getByRole('button', { name: '解锁工作台', exact: true }).click()
    await expect(lock).toBeHidden()
  })

  test('asking to lock before a password exists opens the preferences at the lock section', async({ page }) => {
    await open(page)
    await page.locator('.avatar-wrapper').click()
    await page.getByRole('menuitem', { name: '立即锁屏' }).click()
    await expect(page.getByRole('dialog', { name: '偏好设置' }).getByRole('button', { name: '设置锁屏密码' })).toBeInViewport()
  })

  test('a forgotten password can sign out above the lock, keeping appearance', async({ page }) => {
    await installLoginMocks(page)
    await open(page, '/#/dashboard')
    const drawer = await openPreferences(page)
    await drawer.getByRole('radio', { name: '紫罗兰' }).click()
    await page.keyboard.press('Escape')
    const lock = await configure(page)
    const forgot = lock.getByRole('button', { name: '忘记锁屏密码？退出当前账号', exact: true })
    await forgot.click()
    const confirmation = page.getByRole('dialog', { name: '退出当前账号？', exact: true })
    await confirmation.getByRole('button', { name: '取消', exact: true }).click()
    await expect(lock).toBeVisible()
    await forgot.click()
    await confirmation.getByRole('button', { name: '退出登录', exact: true }).click()
    await expect(page).toHaveURL(/#\/login/)
    await expect(lock).toBeHidden()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('motor-admin-ui-preferences')!).themePreset)).toBe('violet')
  })
})
