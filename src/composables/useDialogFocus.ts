import { watch, useId, onScopeDispose } from 'vue'
import { containDialogFocus } from '@/utils/dialog-focus'

/** Remember the actual trigger before the dialog takes focus. */
export function useDialogFocus(visible: () => boolean, modal: () => boolean = () => true) {
  let opener: HTMLElement | null = null
  const id = useId()
  let release: (() => void) | undefined
  watch(visible, open => {
    if (open) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }, { flush: 'sync' })
  const restore = () => {
    if (visible()) return
    release?.()
    release = undefined
    if (opener?.isConnected) opener.focus()
  }
  const open = () => {
    if (!visible()) return
    release?.()
    const element = document.querySelector<HTMLElement>(`[data-dialog-focus="${id}"]`)
    if (element && modal()) release = containDialogFocus(element)
  }
  watch(modal, () => { release?.(); release = undefined; if (visible() && modal()) open() })
  onScopeDispose(() => release?.())
  return Object.assign(restore, { open, id })
}
