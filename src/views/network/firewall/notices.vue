<template>
  <div
    v-if="items?.length"
    class="fw-notices"
  ><a-alert
    v-for="(notice, index) in items"
    :key="index"
    :type="correction ? 'info' : 'warning'"
  ><strong>{{ codeLabel(notice.code) }}</strong><span v-if="notice.field"> · {{ t(`networkFirewall.${notice.field}`) }}</span><span
    v-if="notice.token"
  > · {{ notice.token }}</span><span v-if="notice.value"> → {{ notice.value }}</span></a-alert></div>
</template>
<script setup lang="ts">
defineOptions({ name: 'FirewallNotices' })
import { useI18n } from 'vue-i18n'
import type { Notice } from '@/types/firewall'
defineProps<{ items?: Notice[], correction?: boolean }>()
const { t, te } = useI18n()
function codeLabel(code: string) { return te(`networkFirewall.noticeCodes.${code}`) ? t(`networkFirewall.noticeCodes.${code}`) : `${t('networkFirewall.issues')} (${code})` }
</script>
