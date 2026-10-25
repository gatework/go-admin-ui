import { generate, getRgbStr } from '@arco-design/color'

/** Keep native Arco primary and link palettes aligned with the saved theme. */
let current: string | null = null

const paint = (): void => {
  if (!current) return
  const dark = document.documentElement.classList.contains('dark')

  // Arco declares primary shades on body; writing only to html is shadowed.
  generate(current, { list: true, dark }).forEach((color, index) => {
    const rgb = getRgbStr(color)
    document.body.style.setProperty(`--primary-${index + 1}`, rgb)
    document.body.style.setProperty(`--link-${index + 1}`, rgb)
  })
}

/** Applies a colour and remembers it, so a theme change can recompute the tints. */
export const applyThemeColor = (hex: string): void => {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return
  current = hex
  paint()
}

/**
 * Recomputes when light/dark changes.
 *
 * Registered once at import rather than per component: the picker is long gone
 * by the time most people touch the appearance toggle, and the tints would
 * otherwise stay mixed toward the wrong ground until the colour is picked
 * again.
 */
if (typeof MutationObserver === 'function') {
  new MutationObserver(paint).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
}
