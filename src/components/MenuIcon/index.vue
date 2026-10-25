<template><span class="menu-icon" aria-hidden="true"><component :is="menuIcons[name || ''] || IconApps" /></span></template>
<script setup lang="ts">
import { IconApps } from '@arco-design/web-vue/es/icon'
import { menuIcons } from '@/utils/menu-icons'
defineProps<{ name?: string }>()
</script>
<style scoped>
.menu-icon { display: inline-flex; flex: 0 0 18px; width: 18px; height: 18px; align-items: center; justify-content: center; color: inherit; vertical-align: middle; line-height: 1; }
.menu-icon :deep(svg) { display: block; width: 18px; height: 18px; font-size: 18px; }
</style>
