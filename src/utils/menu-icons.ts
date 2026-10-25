import * as ArcoIcons from '@arco-design/web-vue/es/icon'
import type { Component } from 'vue'

/** Canonical Arco names are stored directly in the menu icon field. */
export const menuIcons: Record<string, Component> = Object.fromEntries(
  Object.entries(ArcoIcons)
    .filter(([name]) => /^Icon[A-Z]/.test(name))
    .map(([name, component]) => [name.slice(4).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(), component as Component])
)
export const menuIconNames = Object.keys(menuIcons).sort()
