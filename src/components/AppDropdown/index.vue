<template>
  <a-dropdown v-bind="$attrs" v-model:popup-visible="visible" @popup-visible-change="onVisibility">
    <slot />
    <template #content><div ref="menu" role="menu" @keydown="navigate"><slot name="content" /></div></template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Dropdown as ADropdown } from '@arco-design/web-vue'
defineOptions({ name: 'AppDropdown', inheritAttrs: false })
const visible = ref(false)
const menu = ref<HTMLElement>()
let opener: HTMLElement | undefined
const options = () => Array.from(menu.value?.querySelectorAll<HTMLElement>('.arco-dropdown-option:not(.arco-dropdown-option-disabled)') ?? [])
const onVisibility = async(open: boolean) => {
  if (open) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    await nextTick()
    menu.value?.querySelectorAll<HTMLElement>('.arco-dropdown-option').forEach(option => {
      const disabled = option.classList.contains('arco-dropdown-option-disabled')
      option.setAttribute('role', 'menuitem')
      option.setAttribute('aria-disabled', String(disabled))
      option.tabIndex = disabled ? -1 : 0
    })
    options()[0]?.focus()
  } else if (opener?.isConnected) opener.focus()
}
const navigate = (event: KeyboardEvent) => {
  const items = options()
  const target = (event.target as HTMLElement).closest<HTMLElement>('[role="menuitem"]')
  const index = target ? items.indexOf(target) : -1
  if (event.key === 'Escape' || event.key === 'Tab') {
    visible.value = false
    if (event.key === 'Escape') event.preventDefault()
    if (opener?.isConnected) opener.focus()
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    target?.click()
  } else {
    let next: HTMLElement | undefined
    if (event.key === 'ArrowDown') next = items[(index + 1) % items.length]
    else if (event.key === 'ArrowUp') next = items[(index - 1 + items.length) % items.length]
    else if (event.key === 'Home') next = items[0]
    else if (event.key === 'End') next = items.at(-1)
    if (next) { event.preventDefault(); next.focus() }
  }
}
</script>
