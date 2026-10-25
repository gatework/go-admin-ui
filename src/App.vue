<template>
  <a-config-provider :locale="arcoLocale" :size="preferences.componentSize">
    <div class="app-root" :inert="lock.locked && user.token ? true : undefined"><router-view /></div>
    <LockScreen v-if="user.token" />
  </a-config-provider>
</template>
<script setup lang="ts">
import { defineAsyncComponent, watch } from 'vue'
import { arcoLocale } from '@/lang'
import { usePreferencesStore } from '@/stores/preferences'
import { useLockScreenStore } from '@/stores/lock-screen'
import { useUserStore } from '@/stores/user'
const LockScreen = defineAsyncComponent(() => import('@/components/lock-screen/index.vue'))
const preferences = usePreferencesStore()
const lock = useLockScreenStore()
const user = useUserStore()
preferences.hydratePreferences()
lock.hydrate()
watch(() => user.token, token => { if (!token) lock.clear() })
</script>
<style scoped>
.app-root { height: 100%; }
</style>
