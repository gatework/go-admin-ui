<template><span class="menu-icon" aria-hidden="true"><component :is="menuIcons[name || ''] || IconApps" /></span></template>
<script setup lang="ts">
import { IconApps } from '@arco-design/web-vue/es/icon'
import { menuIcons } from '@/utils/menu-icons'
defineProps<{ name?: string }>()
</script>
<style scoped>
.menu-icon { display: inline-flex; flex: 0 0 var(--motor-navigation-icon-size); width: var(--motor-navigation-icon-size); height: var(--motor-navigation-icon-size); font-size: var(--motor-navigation-icon-size); align-items: center; justify-content: center; color: inherit; vertical-align: middle; line-height: 1; }
.menu-icon :deep(svg) { display: block; width: 1em; height: 1em; font-size: inherit; }
</style>
