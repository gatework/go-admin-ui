<template>
  <AppDrawer class="network-drawer circuit-drawer" :visible="visible" :title="t('networkCircuit.trafficTitle')" :width="narrow ? '100%' : 1040" @update:visible="close">
    <div v-if="record" class="circuit-identity"><h2>{{ record.name }}</h2><p>{{ record.circuitNo }} · {{ t('networkCircuit.bandwidth') }}: {{ record.bandwidthMbps === null ? '—' : `${record.bandwidthMbps.toLocaleString()} Mbps` }}</p></div>
    <div class="circuit-traffic__toolbar">
      <a-radio-group v-model="period" type="button" :aria-label="t('networkCircuit.traffic')">
        <a-radio v-for="value in circuitPeriods" :key="value" :value="value">{{ t(`networkCircuit.periodValues.${value}`) }}</a-radio>
      </a-radio-group>
      <a-button :loading="loading" @click="refresh">{{ t('common.refresh') }}</a-button>
    </div>
    <p class="circuit-help">{{ t('networkCircuit.directionHelp') }}</p>
    <a-spin :loading="loading" class="circuit-editor" aria-live="polite">
      <a-result v-if="failed" status="error" :title="t('networkCircuit.trafficFailed')" :subtitle="t('networkCircuit.trafficFailedHelp')"><template #extra><a-button @click="refresh">{{ t('networkCircuit.retry') }}</a-button></template></a-result>
      <a-result v-else-if="data && !data.configured" status="info" :title="t('networkCircuit.notConfigured')" :subtitle="t('networkCircuit.notConfiguredHelp')" />
      <template v-else-if="data">
        <p class="circuit-help">{{ t(period === '7d' ? 'networkCircuit.trendHelp' : 'networkCircuit.historyHelp') }}</p>
        <section v-for="side in sides" :key="side" class="circuit-section circuit-traffic__endpoint">
          <h2>{{ t(`networkCircuit.${side}`) }}<span v-if="record"> · {{ record[side === 'a' ? 'aEndpoint' : 'zEndpoint'].name || '—' }}</span></h2>
          <template v-if="seriesFor(side).length">
            <div class="circuit-traffic__summaries">
              <div v-for="item in seriesFor(side)" :key="`${side}-${item.direction}`" class="circuit-traffic__summary">
                <div class="circuit-traffic__direction"><strong>{{ t(`networkCircuit.${item.direction}`) }}</strong><a-tag :color="item.state === 'ok' ? 'green' : item.state === 'error' || item.state === 'unavailable' ? 'red' : 'orange'">{{ t(`networkCircuit.stateValues.${item.state}`) }}</a-tag></div>
                <p class="circuit-traffic__source">{{ item.hostName }} · {{ item.interface || item.name }}</p>
                <p v-if="item.interface" class="circuit-traffic__source">{{ item.name }}</p>
                <dl><div><dt>{{ t('networkCircuit.current') }}</dt><dd>{{ formatRate(item.state === 'stale' ? null : item.currentBps) }}</dd></div><div><dt>{{ t(item.partial ? 'networkCircuit.samplePeak' : 'networkCircuit.peak') }}</dt><dd>{{ formatRate(item.peakBps) }}</dd></div></dl>
                <p class="circuit-help">{{ t('networkCircuit.lastSample') }}: {{ item.lastSampleAt === null ? t('networkCircuit.noSample') : sampleTime(item.lastSampleAt) }}</p>
                <p v-if="item.partial" class="circuit-help">{{ t('networkCircuit.partial') }}</p>
              </div>
            </div>
            <CircuitTrafficChart v-if="hasPoints(side)" :side="side" :series="seriesFor(side)" :from="data.timeFrom" :till="data.timeTill" />
            <a-empty v-else :description="t('networkCircuit.noPoints')"><p class="circuit-help">{{ t('networkCircuit.noPointsHelp') }}</p></a-empty>
          </template>
          <template v-else><p>{{ t('networkCircuit.unbound') }}</p><p class="circuit-help">{{ t('networkCircuit.unboundHelp') }}</p></template>
        </section>
      </template>
    </a-spin>
    <template #footer><a-button @click="close">{{ t('common.close') }}</a-button></template>
  </AppDrawer>
</template>

<script setup lang="ts">
import { computed, onDeactivated, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { usePreferencesStore } from '@/stores/preferences'
import { useUserStore } from '@/stores/user'
import { preferenceTime } from '@/utils/preference-time'
import { circuitPeriods } from '@/types/network-circuit'
import type { Circuit, CircuitPeriod, CircuitSide } from '@/types/network-circuit'
import '../shared/drawer.scss'
import { useCircuitTraffic } from './use-traffic'
import { formatRate } from './traffic-chart'
import CircuitTrafficChart from './traffic-chart.vue'

defineOptions({ name: 'CircuitTraffic' })

const props = defineProps<{ visible: boolean, record?: Circuit }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()
const { t } = useI18n()
const preferences = usePreferencesStore()
const user = useUserStore()
const narrow = useNarrowScreen()
const period = ref<CircuitPeriod>('1h')
const id = computed(() => props.record?.id)
const { data, loading, failed, refresh, cancel } = useCircuitTraffic(id, toRef(props, 'visible'), period)
const sides = ['a', 'z'] as const
const seriesFor = (side: CircuitSide) => data.value?.series.filter(item => item.side === side) || []
const hasPoints = (side: CircuitSide) => seriesFor(side).some(item => item.points.some(point => point[1] !== null && Number.isFinite(point[1])))
const sampleTime = (value: number) => preferenceTime(new Date(value).toISOString(), preferences.timeZone) || '—'
function close() { cancel(); emit('update:visible', false) }
watch(() => user.token, close)
onDeactivated(close)
</script>

<style scoped>
.circuit-traffic__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.circuit-traffic__endpoint h2 span { font-size: var(--motor-base-font-size); font-weight: 400; }
.circuit-traffic__summaries { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-bottom: 24px; }
.circuit-traffic__summary { min-width: 0; }
.circuit-traffic__direction { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.circuit-traffic__source { color: var(--color-text-2); margin: 8px 0; overflow-wrap: anywhere; }
.circuit-traffic__summary dl { display: flex; flex-wrap: wrap; gap: 16px 32px; margin: 12px 0; }
.circuit-traffic__summary dt { color: var(--color-text-2); font-size: var(--motor-font-size-12); }
.circuit-traffic__summary dd { margin: 4px 0 0; font-size: var(--motor-font-size-18); font-weight: 600; font-variant-numeric: tabular-nums; }
@media (max-width: 767px) { .circuit-traffic__summaries { grid-template-columns: minmax(0, 1fr); gap: 20px; } .circuit-traffic__toolbar :deep(.arco-radio-button) { min-height: 44px; display: inline-flex; align-items: center; } }
</style>
