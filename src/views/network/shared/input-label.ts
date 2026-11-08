import type { DirectiveBinding, ObjectDirective } from 'vue'

// Arco 2.59 applies undeclared aria attributes to its wrapper rather than its
// keyboard input. Keep shared network controls labelled, including after a locale
// change, without changing shared components or their keyboard handling.
const labelInput = (element: HTMLElement, binding: DirectiveBinding<string>) => {
  element.querySelector('input, textarea')?.setAttribute('aria-label', binding.value)
}

export const vInputLabel: ObjectDirective<HTMLElement, string> = { mounted: labelInput, updated: labelInput }
