<template>
  <h3>{{ t('networkFabric.evidence') }}</h3>
  <a-descriptions :column="1" bordered class="fabric-section"><a-descriptions-item :label="t('networkFabric.ip')">{{ node.ip }}</a-descriptions-item><a-descriptions-item :label="t('networkFabric.model')">{{ node.model || '—' }} / {{ node.platform || '—' }}</a-descriptions-item><a-descriptions-item :label="t('networkFabric.role')">{{ roleName }}</a-descriptions-item><a-descriptions-item :label="t('networkFabric.configuration')"><StateTag :value="node.configState" /></a-descriptions-item><a-descriptions-item :label="t('networkFabric.vtep')">{{ node.vtep || '—' }}</a-descriptions-item><a-descriptions-item :label="t('networkFabric.features')">{{ node.features.join(' · ') || '—' }}</a-descriptions-item><a-descriptions-item :label="t('networkFabric.domain')">{{ node.vpcDomain || '—' }}</a-descriptions-item><a-descriptions-item :label="t('networkFabric.peer')">{{ node.vpcSource || '—' }} → {{ node.vpcPeer || '—' }}</a-descriptions-item><a-descriptions-item :label="t('networkFabric.ports')"><div v-for="port in ports" :key="port.name">{{ port.name }} · {{ port.vpc || t('networkFabric.peerLink') }}</div><span v-if="!ports.length">{{ t('networkFabric.states.unknown') }}</span></a-descriptions-item></a-descriptions>
  <section v-for="(evidence, dimension) in node.dimensions" :key="dimension" class="fabric-section">
    <div class="fabric-section-heading"><h3>{{ te(`networkFabric.dimensionsLabels.${dimension}`) ? t(`networkFabric.dimensionsLabels.${dimension}`) : dimension }}</h3><StateTag :value="evidence.stale ? 'stale' : evidence.state" /></div>
    <a-descriptions :column="1" bordered><a-descriptions-item :label="t('networkFabric.latest')"><StateTag :value="evidence.latest?.status || 'unknown'" /> <DateCell :value="evidence.latest?.observedAt" /></a-descriptions-item><a-descriptions-item :label="t('networkFabric.lastComplete')"><DateCell :value="evidence.lastComplete?.observedAt" /></a-descriptions-item></a-descriptions>
    <a-collapse class="fabric-section"><a-collapse-item key="raw" :header="t('networkFabric.evidence')"><h4>{{ t('networkFabric.latest') }}</h4><pre class="fabric-code">{{ pretty(evidence.latest) }}</pre><h4>{{ t('networkFabric.lastComplete') }}</h4><pre class="fabric-code">{{ pretty(evidence.lastComplete) }}</pre></a-collapse-item></a-collapse>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DateCell from '@/components/DateCell/index.vue'
import type { Node } from '@/types/network-fabric'
import { asRecord, pretty } from './presentation'
import StateTag from './state-tag.vue'
const props = defineProps<{ node: Node }>()
const { t, te } = useI18n()
const roleName = computed(() => te(`network.device.roleValues.${props.node.role}`) ? t(`network.device.roleValues.${props.node.role}`) : props.node.role)
const ports = computed(() => {
  const dimension = props.node.dimensions.configuration
  const data = asRecord((dimension?.lastComplete || dimension?.latest)?.data)
  const records = Array.isArray(data.records) ? data.records : []
  const configuration = asRecord(records[0])
  return Object.entries(asRecord(configuration.interfaces)).flatMap(([name, value]) => {
    const port = asRecord(value)
    return port.vpc_id !== undefined || port.peer_link === true || port.vpc_peer_link === true ? [{ name, vpc: port.vpc_id ? `vPC ${port.vpc_id}` : '' }] : []
  })
})
</script>
