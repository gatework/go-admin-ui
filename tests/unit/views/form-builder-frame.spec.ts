import { mount, flushPromises } from '@vue/test-utils'
import ArcoVue from '@arco-design/web-vue'
import Build from '@/views/dev-tools/build/index.vue'
import { setLocale } from '@/lang'

it('serves the maintained fork locally and updates appearance without reloading the form', async() => {
  const wrapper = mount(Build, { global: { plugins: [ArcoVue] }})
  try {
    const frame = wrapper.get('iframe')
    const source = frame.attributes('src')
    expect(source).toMatch(/^\/form-generator\/index.html\?/)
    // jsdom creates the frame's Window when attached to the document.
    document.body.appendChild(wrapper.element)
    const send = vi.spyOn((frame.element as HTMLIFrameElement).contentWindow!, 'postMessage')
    await frame.trigger('load')
    await setLocale('en-US')
    document.body.setAttribute('arco-theme', 'dark')
    document.body.style.setProperty('--primary-6', '22, 93, 255')
    await flushPromises()
    expect(frame.attributes('src')).toBe(source)
    expect(frame.attributes('title')).toBe('Form Builder')
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'form-generator:appearance', locale: 'en-US', dark: true,
      primary: expect.objectContaining({ '6': '22, 93, 255' })
    }), location.origin)
    wrapper.unmount()
    send.mockClear()
    document.body.removeAttribute('arco-theme')
    await flushPromises()
    expect(send).not.toHaveBeenCalled()
  } finally {
    wrapper.unmount()
    document.body.innerHTML = ''
    document.body.removeAttribute('arco-theme')
    document.body.style.removeProperty('--primary-6')
    await setLocale('zh-CN')
  }
})

it('fits the measured frame top, card spacing and changing shell footer', async() => {
  const shell = document.createElement('div')
  shell.className = 'main-container'
  shell.innerHTML = '<header class="shell-header"></header><main class="app-main"></main><footer class="app-footer"></footer>'
  document.body.appendChild(shell)
  let frameTop = 123
  let footerHeight = 44
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
    const top = this.classList.contains('form-builder-frame') ? frameTop : 0
    const height = this.classList.contains('app-footer') ? footerHeight : 0
    return { x: 0, y: top, top, left: 0, right: 100, bottom: top + height, width: 100, height, toJSON() {} }
  })
  const resizeCallbacks: Array<() => void> = []
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resizeCallbacks.push(callback) }
    observe() {} unobserve() {} disconnect() {}
  })
  vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) => window.setTimeout(() => callback(0), 0))
  vi.stubGlobal('cancelAnimationFrame', window.clearTimeout.bind(window))
  vi.stubGlobal('innerHeight', 800)
  const wrapper = mount(Build, { attachTo: shell.querySelector('.app-main')!, global: { plugins: [ArcoVue] }})
  try {
    const container = wrapper.get('.form-builder-frame')
    ;(wrapper.get('.page-container').element as HTMLElement).style.paddingBottom = '12px'
    ;(wrapper.get('.arco-card').element as HTMLElement).style.borderBottomWidth = '1px'
    ;(wrapper.get('.arco-card-body').element as HTMLElement).style.paddingBottom = '16px'
    window.dispatchEvent(new Event('resize'))
    await vi.waitFor(() => expect(container.attributes('style')).toContain('height: 604px'))

    footerHeight = 72
    resizeCallbacks.forEach(callback => callback())
    await vi.waitFor(() => expect(container.attributes('style')).toContain('height: 576px'))

    // Layout preferences can remove the header/footer without a window resize.
    frameTop = 29
    shell.querySelector('.shell-header')!.remove()
    shell.querySelector('.app-footer')!.remove()
    await vi.waitFor(() => expect(container.attributes('style')).toContain('height: 742px'))

    vi.stubGlobal('innerHeight', 180)
    window.dispatchEvent(new Event('resize'))
    await vi.waitFor(() => expect(container.attributes('style')).toContain('height: 122px'))
  } finally {
    wrapper.unmount()
    rect.mockRestore()
    vi.unstubAllGlobals()
    shell.remove()
  }
})
