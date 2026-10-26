import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import ArcoVue from '@arco-design/web-vue'
import AccountAccess from '@/views/account-access/index.vue'
import { i18n, setLocale } from '@/lang'
import { deferred } from '../support/async'

const api = vi.hoisted(() => ({ accessSettings: vi.fn(), sendRegistrationEmail: vi.fn(), registerAccount: vi.fn(), forgotPassword: vi.fn(), resetPassword: vi.fn() }))
vi.mock('@/api/account-access', () => api)

describe('account access forms', () => {
  let wrapper: VueWrapper
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addListener: () => {}, removeListener: () => {} }))
    Object.values(api).forEach(call => call.mockReset())
    api.accessSettings.mockResolvedValue({ code: 200, data: { enabled: true, emailConfigured: true, mfaConfigured: true }, msg: 'ok' })
    api.sendRegistrationEmail.mockResolvedValue({ code: 200, data: { token: 'bound-token', resendAfter: 60 }, msg: 'ok' })
    i18n.global.locale.value = 'zh-CN'
  })
  afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals(); i18n.global.locale.value = 'zh-CN' })

  const render = async(path: string) => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' }}] })
    await router.push(path)
    wrapper = mount(AccountAccess, { attachTo: document.body, global: {
      plugins: [ArcoVue, router, createPinia()],
      stubs: { AccessShell: { template: '<main><slot name="actions" /><slot /></main>' }, Brand: true, Footer: true, LangSelect: true, HeaderIconButton: true }
    }})
    await flushPromises()
    return router
  }
  const input = (label: string) => wrapper.get(`input[aria-label="${label}"]`)
  const button = (text: string) => wrapper.findAll('button').find(element => element.text() === text)!

  it('releases resend cooldown when a different normalized email is entered', async() => {
    await render('/register')
    await input('邮箱').setValue('person@example.test')
    await button('发送验证码').trigger('click')
    await flushPromises()
    expect(button('重新发送（60 秒）').attributes('disabled')).toBeDefined()
    await input('邮箱验证码').setValue('123456')
    await input('邮箱').setValue('other@example.test')
    expect((input('邮箱验证码').element as HTMLInputElement).value).toBe('')
    expect(button('发送验证码').attributes('disabled')).toBeUndefined()
    expect(button('创建账户').attributes('disabled')).toBeDefined()
  })

  it('ignores an older email result even after returning to the original address', async() => {
    await render('/register')
    const pending = deferred<unknown>()
    api.sendRegistrationEmail.mockReturnValueOnce(pending.promise)
    await input('邮箱').setValue('first@example.test')
    await button('发送验证码').trigger('click')
    await input('邮箱').setValue('second@example.test')
    await input('邮箱').setValue('first@example.test')
    pending.resolve({ code: 200, data: { token: 'old-token', resendAfter: 60 }, msg: 'ok' })
    await flushPromises()
    expect(button('创建账户').attributes('disabled')).toBeDefined()
    expect(button('发送验证码').attributes('disabled')).toBeUndefined()
  })

  it('focuses the recovery success heading and updates that state when language changes', async() => {
    await render('/forgot-password')
    api.forgotPassword.mockResolvedValueOnce({ code: 200, data: null, msg: 'ok' })
    await input('邮箱').setValue(' Person@Example.test ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    const heading = wrapper.get('[role="status"] h2')
    expect(document.activeElement).toBe(heading.element)
    expect(api.forgotPassword).toHaveBeenCalledWith('person@example.test')
    await setLocale('en-US')
    await flushPromises()
    expect(wrapper.text()).toContain('If this email belongs to an active account')
    await button('Use a different email').trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(input('Email').element)
  })

  it('keeps reset input after a server error and sends one request while pending', async() => {
    await render('/reset-password?email=person@example.test&token=reset-token')
    const pending = deferred()
    api.resetPassword.mockReturnValueOnce(pending.promise)
    await input('邮箱验证码').setValue('123456')
    await input('密码').setValue('Chosen-password-123')
    await input('确认密码').setValue('Chosen-password-123')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.resetPassword).toHaveBeenCalledTimes(1)
    expect(api.resetPassword).toHaveBeenCalledWith(expect.objectContaining({ token: 'reset-token', email: 'person@example.test', code: '123456', password: 'Chosen-password-123' }))
    pending.reject(new Error('offline'))
    await flushPromises()
    expect((input('密码').element as HTMLInputElement).value).toBe('Chosen-password-123')
    expect((input('邮箱验证码').element as HTMLInputElement).value).toBe('123456')
    expect(button('重置密码').attributes('disabled')).toBeUndefined()
  })

  it('rejects passwords over 72 UTF-8 bytes and focuses the invalid control', async() => {
    await render('/reset-password?email=person@example.test&token=reset-token')
    await input('邮箱验证码').setValue('123456')
    await input('密码').setValue('密'.repeat(25))
    await input('确认密码').setValue('密'.repeat(25))
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.resetPassword).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('密码长度为 12–72 字节')
    expect(document.activeElement).toBe(input('密码').element)
  })

  it('keeps a new reset session when an earlier recovery request finishes', async() => {
    const router = await render('/forgot-password')
    const pending = deferred<unknown>()
    api.forgotPassword.mockReturnValueOnce(pending.promise)
    await input('邮箱').setValue('person@example.test')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await router.push('/reset-password?email=person@example.test&token=current-token')
    await flushPromises()
    await input('邮箱验证码').setValue('654321')
    pending.resolve({ code: 200, data: null, msg: 'ok' })
    await flushPromises()
    expect(wrapper.find('[role="status"] h2').exists()).toBe(false)
    expect((input('邮箱验证码').element as HTMLInputElement).value).toBe('654321')
    api.resetPassword.mockResolvedValueOnce({ code: 200, data: null, msg: 'ok' })
    await input('密码').setValue('Chosen-password-123')
    await input('确认密码').setValue('Chosen-password-123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.resetPassword).toHaveBeenCalledWith(expect.objectContaining({ token: 'current-token', code: '654321' }))
  })
})
