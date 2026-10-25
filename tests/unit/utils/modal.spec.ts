import { confirmAction, DialogCancelled } from '@/utils/modal'
import { setLocale } from '@/lang'
import type { ModalConfig } from '@arco-design/web-vue'

const captured = vi.hoisted(() => ({ options: undefined as ModalConfig | undefined }))
vi.mock('@arco-design/web-vue', () => ({
  Modal: { confirm: (options: ModalConfig) => { captured.options = options } }
}))

afterEach(() => setLocale('zh-CN'))

it('waits for confirmation before resolving', async() => {
  let done = false
  const result = confirmAction({ content: 'Delete selected rows?' }).then(() => { done = true })
  await Promise.resolve()
  expect(done).toBe(false)
  captured.options?.onOk?.()
  await result
  expect(done).toBe(true)
})

it.each(['onCancel', 'onClose'] as const)('rejects dismissal through %s without executing the action', async(event) => {
  const result = confirmAction({ content: 'Delete selected rows?' })
  const rejection = expect(result).rejects.toBeInstanceOf(DialogCancelled)
  captured.options?.[event]?.()
  await rejection
})

it('does not turn an accepted action into cancellation when the modal closes', async() => {
  const result = confirmAction({ content: 'Delete selected rows?' })
  captured.options?.onOk?.()
  captured.options?.onClose?.()
  await expect(result).resolves.toBeUndefined()
})

it('resolves default button labels at invocation time', async() => {
  await setLocale('en-US')
  const result = confirmAction({ content: 'Delete selected rows?' })
  expect(captured.options?.okText).toBe('OK')
  expect(captured.options?.cancelText).toBe('Cancel')
  captured.options?.onOk?.()
  await result
})
