<template>
  <section class="app-main"><RouterViewKeepAlive :transition="preferences.pageTransition ? 'fade-transform' : undefined" /></section>
</template>
<script setup lang="ts">
import RouterViewKeepAlive from './RouterViewKeepAlive.vue'
import { usePreferencesStore } from '@/stores/preferences'
const preferences = usePreferencesStore()
</script>
<style scoped>
.app-main { width: 100%; position: relative; overflow: hidden; background: var(--ga-bg-body); }
</style>
