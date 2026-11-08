<template>
  <AppDrawer class="network-drawer circuit-drawer" :visible="visible" :title="t('networkCircuit.detailTitle')" :width="narrow ? '100%' : 760" @update:visible="close">
    <a-spin :loading="loading" class="circuit-editor">
      <a-result v-if="failed" status="error" :title="t('networkCircuit.detailFailed')"><template #extra><a-button @click="load">{{ t('networkCircuit.retry') }}</a-button></template></a-result>
      <template v-else-if="record">
        <div class="circuit-identity"><h2>{{ record.name }}</h2><p>{{ record.circuitNo }} · {{ record.provider }}</p></div>
        <a-descriptions :column="narrow ? 1 : 2" bordered>
          <a-descriptions-item :label="t('networkCircuit.status')">{{ t(`networkCircuit.statusValues.${record.status}`) }}</a-descriptions-item>
          <a-descriptions-item :label="t('networkCircuit.bandwidth')">{{ record.bandwidthMbps === null ? '—' : `${record.bandwidthMbps.toLocaleString()} Mbps` }}</a-descriptions-item>
          <a-descriptions-item :label="t('networkCircuit.category')">{{ t(`networkCircuit.categoryValues.${record.category}`) }}</a-descriptions-item>
          <a-descriptions-item :label="t('networkCircuit.purpose')">{{ t(`networkCircuit.purposeValues.${record.purpose}`) }}</a-descriptions-item>
          <a-descriptions-item v-for="field in ['region', 'organization'] as const" :key="field" :label="t(`networkCircuit.${field}`)">{{ record[field] || '—' }}</a-descriptions-item>
        </a-descriptions>
        <section v-for="side in sides" :key="side" class="circuit-section">
          <h2>{{ t(`networkCircuit.${side}`) }}</h2>
          <a-descriptions :column="narrow ? 1 : 2" bordered>
            <a-descriptions-item v-for="field in endpointFields" :key="field.key" :label="t(`networkCircuit.${field.label}`)">{{ endpoint(side)[field.key] || '—' }}</a-descriptions-item>
            <a-descriptions-item :label="t('networkCircuit.device')">{{ endpoint(side).deviceId ? t('networkCircuit.deviceFallback', { id: endpoint(side).deviceId }) : '—' }}</a-descriptions-item>
            <a-descriptions-item :label="t('networkCircuit.host')">{{ endpoint(side).monitoring.hostName || '—' }}</a-descriptions-item>
            <a-descriptions-item :label="t('networkCircuit.inItem')">{{ endpoint(side).monitoring.inItemName || '—' }}</a-descriptions-item>
            <a-descriptions-item :label="t('networkCircuit.outItem')">{{ endpoint(side).monitoring.outItemName || '—' }}</a-descriptions-item>
          </a-descriptions>
        </section>
        <section class="circuit-section">
          <h2>{{ t('networkCircuit.contract') }}</h2>
          <a-descriptions :column="narrow ? 1 : 2" bordered>
            <a-descriptions-item v-for="field in ['contractNo', 'installedOn', 'expiresOn'] as const" :key="field" :label="t(`networkCircuit.${field}`)">{{ record[field] || '—' }}</a-descriptions-item>
            <a-descriptions-item :label="t('networkCircuit.fee')">{{ record.fee ? `${record.fee} ${record.currency}` : '—' }}</a-descriptions-item>
            <a-descriptions-item :label="t('networkCircuit.billingCycle')">{{ record.billingCycle ? t(`networkCircuit.billingCycleValues.${record.billingCycle}`) : '—' }}</a-descriptions-item>
            <a-descriptions-item :label="t('networkCircuit.payer')">{{ t(`networkCircuit.payerValues.${record.payer}`) }}</a-descriptions-item>
          </a-descriptions>
        </section>
        <section v-for="field in ['routeNotes', 'notes'] as const" :key="field" class="circuit-section"><h2>{{ t(`networkCircuit.${field}`) }}</h2><p class="circuit-notes">{{ record[field] || '—' }}</p></section>
      </template>
    </a-spin>
    <template #footer>
      <a-button @click="close">{{ t('common.close') }}</a-button>
      <a-button v-if="canTraffic && record" @click="emit('traffic', record)">{{ t('networkCircuit.traffic') }}</a-button>
      <a-button v-if="canEdit && record" type="primary" @click="emit('edit', record.id)">{{ t('common.edit') }}</a-button>
    </template>
  </AppDrawer>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { useUserStore } from '@/stores/user'
import { getCircuit } from '@/api/network/circuit'
import type { Circuit, CircuitSide } from '@/types/network-circuit'
import { emptyEndpoint } from './form'
import '../shared/drawer.scss'

defineOptions({ name: 'CircuitDetail' })

const props = defineProps<{ visible: boolean, id?: number, canEdit: boolean, canTraffic: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean], edit: [id: number], traffic: [record: Circuit] }>()
const { t } = useI18n()
const user = useUserStore()
const narrow = useNarrowScreen()
const record = ref<Circuit>()
const loading = ref(false)
const failed = ref(false)
const sides = ['a', 'z'] as const
const endpointFields = [{ key: 'name', label: 'endpointName' }, ...['address', 'interface', 'ip', 'contactName', 'contactPhone'].map(key => ({ key, label: key }))] as { key: 'name' | 'address' | 'interface' | 'ip' | 'contactName' | 'contactPhone', label: string }[]
const endpoint = (side: CircuitSide) => record.value?.[side === 'a' ? 'aEndpoint' : 'zEndpoint'] || emptyEndpoint()
let generation = 0
let controller: AbortController | undefined
function cancel() { generation++; controller?.abort(); record.value = undefined; loading.value = false; failed.value = false }
async function load() {
  cancel()
  if (!props.visible || !props.id) return
  const current = generation
  controller = new AbortController()
  loading.value = true
  try { const response = await getCircuit(props.id, controller.signal); if (current === generation) record.value = response.data } catch { if (current === generation) failed.value = true } finally { if (current === generation) loading.value = false }
}
function close() { cancel(); emit('update:visible', false) }
watch(() => [props.visible, props.id], load, { immediate: true })
watch(() => user.token, close)
onDeactivated(cancel)
onBeforeUnmount(cancel)
</script>
