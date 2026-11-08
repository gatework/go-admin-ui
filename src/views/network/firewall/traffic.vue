<template><a-table
  v-if="items?.length"
  :data="items"
  :pagination="false"
  size="small"
  :scroll="{ x: 740 }"
><template #columns><a-table-column
  v-for="field in fields"
  :key="field"
  :title="t(`networkFirewall.${field}`)"
  :data-index="field"
/></template></a-table><a-empty
  v-else
  :description="t('networkFirewall.empty')"
/></template>
<script setup lang="ts">
defineOptions({ name: 'FirewallTraffic' })
import { useI18n } from 'vue-i18n'
import type { TrafficPart } from '@/types/firewall'
defineProps<{ items?: TrafficPart[] }>(); const { t } = useI18n()
const fields = ['source', 'destination', 'protocol', 'sourcePort', 'destinationPort', 'icmpType', 'icmpCode'] as const
</script>
