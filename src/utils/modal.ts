import { Modal } from '@arco-design/web-vue'
import { i18n } from '@/lang'
import { containDialogFocus } from '@/utils/dialog-focus'
let confirmationId = 0

export interface ConfirmationOptions {
  content: string
  title?: string
  okText?: string
  cancelText?: string
  popupContainer?: string | HTMLElement
}

/** Cancellation is a user decision, separate from a failed API operation. */
export class DialogCancelled extends Error {
  constructor() { super('Dialog cancelled'); this.name = 'DialogCancelled' }
}

/** A confirmation is awaitable; Arco itself returns an imperative modal handle. */
export function confirmAction(options: ConfirmationOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const opener = document.activeElement as HTMLElement | null
    const modalClass = `app-confirmation-${++confirmationId}`
    let release: (() => void) | undefined
    let settled = false
    const cancel = () => {
      if (settled) return
      settled = true
      reject(new DialogCancelled())
    }
    Modal.confirm({
      title: i18n.global.t('common.notice'),
      okText: i18n.global.t('common.confirm'),
      cancelText: i18n.global.t('common.cancel'),
      ...options,
      renderToBody: Boolean(options.popupContainer),
      maskClosable: false,
      escToClose: true,
      modalClass,
      onOpen: () => {
        const element = document.querySelector<HTMLElement>(`.${modalClass}`)
        if (!element) return
        element.setAttribute('role', 'dialog')
        element.setAttribute('aria-modal', 'true')
        element.setAttribute('aria-label', options.title ?? i18n.global.t('common.notice'))
        release = containDialogFocus(element)
      },
      onOk: () => { settled = true; resolve() },
      onCancel: cancel,
      onClose: () => {
        release?.()
        if (opener?.isConnected) opener.focus()
        cancel()
      }
    })
  })
}
