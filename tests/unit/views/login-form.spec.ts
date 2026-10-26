import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ArcoVue from '@arco-design/web-vue'
import type { Component } from 'vue'
import LoginForm from '@/views/login/components/login-form.vue'
import LoginView from '@/views/login/index.vue'

const login = vi.hoisted(() => vi.fn())
const settings = vi.hoisted(() => vi.fn())
vi.mock('@/api/login', () => ({ getCodeImg: async() => ({ code: 200, id: 'captcha-id', data: 'data:image/png;base64,AA==' }) }))
vi.mock('@/api/account-access', () => ({ accessSettings: settings }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ login }) }))
vi.mock('@/stores/system', () => ({ useSystemStore: () => ({ info: { sys_app_name: 'motor' }, settingDetail: async() => {} }) }))
vi.mock('@/utils/prefetch', () => ({ prefetchOnIdle: () => {} }))

describe('login form and MFA transition', () => {
  let wrapper: VueWrapper
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addListener: () => {}, removeListener: () => {} }))
    login.mockReset()
    settings.mockReset().mockResolvedValue({ code: 200, data: { enabled: true, emailConfigured: true, mfaConfigured: true }, msg: 'ok' })
  })
  afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals() })
  const render = async(component: Component = LoginForm) => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' }}] })
    await router.push('/login?redirect=/dashboard')
    wrapper = mount(component, { attachTo: document.body, global: { plugins: [ArcoVue, router], stubs: { AccessShell: { template: '<main><slot name="actions" /><slot /></main>' }, 'icon-lock': true, 'icon-user': true, 'icon-safe': true, 'icon-refresh': true }}})
    await flushPromises()
    return router
  }

  it('starts without administrator credentials', async() => {
    await render()
    expect((wrapper.get('input[name="username"]').element as HTMLInputElement).value).toBe('')
    expect((wrapper.get('input[name="password"]').element as HTMLInputElement).value).toBe('')
  })

  it('keeps MFA in the login flow and clears the password before the second factor', async() => {
    const router = await render(LoginView)
    expect(wrapper.find('a[href="/register"]').exists()).toBe(true)
    login.mockResolvedValueOnce({ mfaRequired: true, challengeToken: 'opaque-challenge', expiresIn: 300 })
    await wrapper.get('input[name="username"]').setValue('operator')
    await wrapper.get('input[name="password"]').setValue('Chosen-password-123')
    await wrapper.get('input[name="code"]').setValue('123456')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.mfa-challenge').exists()).toBe(true)
    expect(wrapper.find('a[href="/register"]').exists()).toBe(false)
    expect(router.currentRoute.value.path).toBe('/login')
    const recovery = wrapper.findAll('button').find(button => button.text() === '使用恢复码')!
    await recovery.trigger('click')
    await wrapper.get('input[aria-label="恢复码"]').setValue('unused-recovery-code')
    login.mockResolvedValueOnce({ token: 'verified-session' })
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(login).toHaveBeenLastCalledWith({ challengeToken: 'opaque-challenge', recoveryCode: 'unused-recovery-code' })
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  it('lets visitors retry registration settings without blocking password login', async() => {
    settings.mockRejectedValueOnce(new Error('offline'))
    await render(LoginView)
    expect(wrapper.find('a[href="/register"]').exists()).toBe(false)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    const retry = wrapper.findAll('button').find(button => button.text() === '重新加载')!
    await retry.trigger('click')
    await flushPromises()
    expect(wrapper.get('a[href="/register"]').attributes('aria-label')).toBe('创建账户')
    expect(wrapper.text()).not.toContain('账户策略暂时不可用')
    expect(settings).toHaveBeenCalledTimes(2)
  })
})
