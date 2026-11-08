<template>
  <nav class="fw-section-nav" :aria-label="t('networkFirewall.title')">
    <a-button
      v-for="item in items"
      :key="item.path"
      :type="route.path === item.path ? 'primary' : 'secondary'"
      :aria-current="route.path === item.path ? 'page' : undefined"
      @click="router.push(item.path)"
    >{{ t(`networkFirewall.${item.key}`) }}</a-button>
  </nav>
</template>
<script setup lang="ts">
/** Switches between the three firewall workspaces the user's permissions allow. */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspace } from './workspace'
defineOptions({ name: 'FirewallSectionNav' })
const { t } = useI18n(); const route = useRoute(); const router = useRouter(); const { allowed } = useWorkspace()
const items = computed(() => [{ path: '/network/firewall', key: 'objects', permission: 'list' }, { path: '/network/firewall/query', key: 'query', permission: 'query' }, { path: '/network/firewall/design', key: 'design', permission: 'design' }].filter(item => allowed(item.permission)))
</script>
<style scoped>
.fw-section-nav { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
