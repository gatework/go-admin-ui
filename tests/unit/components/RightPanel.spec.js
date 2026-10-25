import { mount, flushPromises } from '@vue/test-utils'
import RightPanel from '@/components/RightPanel/index.vue'

const wrappers = []
afterEach(() => {
  wrappers.forEach(wrapper => wrapper.unmount())
  wrappers.length = 0
  document.body.innerHTML = ''
})

const render = (props = {}) => {
  const wrapper = mount(RightPanel, { props: { modelValue: false, ...props }, slots: { default: '<button>Setting</button>' }, global: { stubs: { transition: false }}, attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}

it('does not expose settings controls while closed', () => {
  render()
  expect(document.body.querySelector('[role=dialog]')).toBeNull()
  expect(document.body.textContent).not.toContain('Setting')
})

it('opens a named dialog and emits a close intent', async() => {
  const wrapper = render()
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  const dialog = document.body.querySelector('[role="dialog"]')
  expect(dialog).not.toBeNull()
  const label = document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent ?? dialog.getAttribute('aria-label')
  expect(label).toContain('系统布局配置')
  document.body.querySelector('.arco-drawer-close-btn').click()
  await flushPromises()
  await new Promise(resolve => setTimeout(resolve, 50))
  expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
})
