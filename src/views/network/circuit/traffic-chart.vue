<template>
  <a-alert v-if="failed" type="warning">{{ t('networkCircuit.chartFailed') }}</a-alert>
  <div v-else ref="container" class="circuit-chart" role="img" :aria-label="t('networkCircuit.chartLabel', { side: t(`networkCircuit.${side}`) })" />
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ECharts } from '@/utils/echarts'
import type { CircuitSide, TrafficSeries } from '@/types/network-circuit'
import { usePreferencesStore } from '@/stores/preferences'
import { trafficChartOptions } from './traffic-chart'

const props = defineProps<{ side: CircuitSide, series: TrafficSeries[], from: number, till: number }>()
const { t, locale } = useI18n()
const preferences = usePreferencesStore()
const container = ref<HTMLElement>()
const failed = ref(false)
let chart: ECharts | undefined
let observer: ResizeObserver | undefined
let closed = false
function draw() {
  if (!container.value || !chart) return
  const style = getComputedStyle(container.value)
  const color = (key: string, fallback: string) => style.getPropertyValue(key).trim() || fallback
  const options = trafficChartOptions(props.series, { in: t('networkCircuit.in'), out: t('networkCircuit.out') }, { text: color('--color-text-2', '#4e5969'), grid: color('--color-border-2', '#e5e6eb'), in: `rgb(${color('--primary-6', '22, 93, 255')})`, out: `rgb(${color('--orange-7', '210, 95, 0')})` }, preferences.timeZone)
  chart.setOption({ ...options, xAxis: { ...options.xAxis, min: props.from, max: props.till }}, { notMerge: true })
}
onMounted(async() => {
  try {
    const { default: echarts } = await import('@/utils/echarts')
    await nextTick()
    if (closed || !container.value) return
    chart = echarts.init(container.value)
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(container.value)
    draw()
  } catch { if (!closed) failed.value = true }
})
watch(() => [props.series, props.from, props.till, preferences.darkMode, preferences.timeZone, preferences.themePreset, preferences.customThemeColor, locale.value], () => { void nextTick(draw) }, { deep: true })
onBeforeUnmount(() => { closed = true; observer?.disconnect(); chart?.dispose(); chart = undefined })
</script>

<style scoped>
.circuit-chart { height: 280px; width: 100%; min-width: 0; }
@media (max-width: 767px) { .circuit-chart { height: 240px; } }
</style>
