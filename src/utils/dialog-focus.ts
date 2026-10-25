/** Keyboard boundaries are shared by declarative dialogs and confirmations. */
const boundaries: HTMLElement[] = []
export function containDialogFocus(element: HTMLElement) {
  boundaries.push(element)
  const focusable = () => Array.from(element.querySelectorAll<HTMLElement>(
    'button, a[href], input, select, textarea, [tabindex]'
  )).filter(node => node.tabIndex >= 0 && !node.matches(':disabled') && !node.closest('[inert]') && node.getClientRects().length)
  const focusFirst = () => {
    const first = focusable()[0]
    if (first) first.focus()
    else { element.tabIndex = -1; element.focus() }
  }
  const navigate = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || boundaries.at(-1) !== element) return
    const items = focusable()
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (index < 0 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
      event.preventDefault()
      if (event.shiftKey && items.length) items.at(-1)!.focus()
      else focusFirst()
    }
  }
  document.addEventListener('keydown', navigate, true)
  focusFirst()
  return () => {
    document.removeEventListener('keydown', navigate, true)
    const index = boundaries.lastIndexOf(element)
    if (index >= 0) boundaries.splice(index, 1)
  }
}
