<template>
  <header class="fw-heading">
    <div>
      <h1>{{ t('networkFirewall.title') }}</h1>
      <p>{{ t('networkFirewall.description') }}</p>
    </div><a-space wrap><a-button
      v-for="item in items"
      :key="item.path"
      :type="route.path === item.path ? 'primary' : 'secondary'"
      @click="router.push(item.path)"
    >{{ t(`networkFirewall.${item.key}`) }}</a-button></a-space>
  </header>
</template>
<script setup lang="ts">
defineOptions({ name: 'FirewallHeading' })
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspace } from './workspace'
import { computed } from 'vue'
const { t } = useI18n(); const route = useRoute(); const router = useRouter(); const { allowed } = useWorkspace()
const items = computed(() => [{ path: '/network/firewall', key: 'objects', permission: 'list' }, { path: '/network/firewall/query', key: 'query', permission: 'query' }, { path: '/network/firewall/design', key: 'design', permission: 'design' }].filter(item => allowed(item.permission)))
</script>
