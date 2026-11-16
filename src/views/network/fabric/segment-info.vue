<template>
  <span v-if="configuration" class="fabric-secondary">VLAN {{ configuration.vlan ?? '—' }}</span>
  <template v-for="address in gateways(configuration)" :key="address"><span v-if="networkCIDR(address)" class="fabric-secondary">{{ t('networkFabric.subnet') }}: {{ networkCIDR(address) }}</span><span class="fabric-secondary">{{ t('networkFabric.gateway') }}: {{ address }}</span></template>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { gateways, networkCIDR } from './presentation'
defineProps<{ configuration?: Record<string, unknown> }>()
const { t } = useI18n()
</script>
