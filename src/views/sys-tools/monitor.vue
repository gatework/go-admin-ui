<template>
  <PageContainer class="server-monitor">
    <header class="monitor-header">
      <div><h1>{{ t('sysTools.monitor.title') }}</h1><p>{{ info?.os?.hostName || t('sysTools.monitor.serverInfo') }}<span v-if="info?.os?.goOs"> · {{ info.os.goOs }} / {{ info.os.arch }}</span></p></div>
      <div class="monitor-controls">
        <a-checkbox v-model="automatic">{{ t('sysTools.monitor.autoRefresh') }}</a-checkbox>
        <a-button :loading="loading" @click="refresh"><template #icon><IconRefresh /></template>{{ t('sysTools.monitor.refresh') }}</a-button>
      </div>
    </header>
    <a-alert v-if="failed" type="warning" class="monitor-alert">{{ t('sysTools.monitor.failed') }}</a-alert>
    <a-spin v-if="!info && loading" class="monitor-loading" :tip="t('sysTools.monitor.loading')" />
    <template v-if="info">
      <div class="monitor-overview">
        <section class="monitor-panel resource-panel" :aria-label="t('sysTools.monitor.resources')">
          <div class="panel-heading"><h2>{{ t('sysTools.monitor.resources') }}</h2><span>{{ t('sysTools.monitor.snapshot') }}</span></div>
          <div ref="chartElement" class="resource-chart" aria-hidden="true" />
          <dl class="resource-values">
            <div v-for="resource in resources" :key="resource.key"><dt>{{ resource.name }}</dt><dd><strong>{{ percent(resource.value) }}</strong><span>{{ resource.detail }}</span></dd></div>
          </dl>
        </section>
        <section class="monitor-panel network-panel" :aria-label="t('sysTools.monitor.network')">
          <h2>{{ t('sysTools.monitor.network') }}</h2>
          <dl class="network-values">
            <div><dt><IconArrowDown />{{ t('sysTools.monitor.download') }}</dt><dd>{{ number(info.net?.in) }} <span>KB/s</span></dd></div>
            <div><dt><IconArrowUp />{{ t('sysTools.monitor.upload') }}</dt><dd>{{ number(info.net?.out) }} <span>KB/s</span></dd></div>
          </dl>
          <dl class="monitor-details network-details"><div><dt>{{ t('sysTools.monitor.uptime') }}</dt><dd>{{ info.bootTime == null ? '—' : t('sysTools.monitor.hours', { n: info.bootTime }) }}</dd></div><div><dt>{{ t('sysTools.monitor.swap') }}</dt><dd>{{ capacity(info.swap, 1048576, 'MB') }}</dd></div></dl>
        </section>
      </div>
      <div class="monitor-system">
        <section v-for="group in detailGroups" :key="group.title" class="monitor-panel">
          <h2>{{ group.title }}</h2><dl class="monitor-details"><div v-for="row in group.rows" :key="row.label"><dt>{{ row.label }}</dt><dd>{{ row.value ?? t('sysTools.monitor.unknown') }}</dd></div></dl>
        </section>
      </div>
    </template>
    <footer class="monitor-status"><span>{{ automatic ? t('sysTools.monitor.refreshHint') : t('sysTools.monitor.paused') }}</span><span v-if="updatedAt">{{ t('sysTools.monitor.updated') }} · {{ updatedAt }}</span></footer>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconArrowDown, IconArrowUp, IconRefresh } from '@arco-design/web-vue/es/icon'
import PageContainer from '@/components/PageContainer/index.vue'
import { getServer, type ServerMetrics } from '@/api/monitor/server'
import echarts, { type ECharts } from '@/utils/echarts'
import { usePreferencesStore } from '@/stores/preferences'

defineOptions({ name: 'ServerMonitor' })
const { t, locale } = useI18n()
const preferences = usePreferencesStore()
const info = shallowRef<ServerMetrics>()
const loading = ref(false)
const failed = ref(false)
const automatic = ref(true)
const updatedAt = ref('')
const chartElement = ref<HTMLElement>()
let chart: ECharts | undefined
let observer: ResizeObserver | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let active = false
let disposed = false
const valid = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const number = (value?: number) => valid(value) ? value.toLocaleString(locale.value, { maximumFractionDigits: 2 }) : '—'
const percent = (value?: number) => valid(value) ? `${number(value)}%` : '—'
const capacity = (value: { used?: number; total?: number } | undefined, divisor: number, unit: string) => `${number(valid(value?.used) ? value.used / divisor : undefined)} / ${number(valid(value?.total) ? value.total / divisor : undefined)} ${unit}`
const resources = computed(() => [
  { key: 'cpu', name: t('sysTools.monitor.cpu'), value: info.value?.cpu?.percent, detail: `${t('sysTools.monitor.cores')} · ${number(info.value?.cpu?.cpuNum)}` },
  { key: 'memory', name: t('sysTools.monitor.memory'), value: info.value?.mem?.percent, detail: capacity(info.value?.mem, 1, 'MB') },
  { key: 'disk', name: t('sysTools.monitor.disk'), value: info.value?.disk?.percent, detail: capacity(info.value?.disk, 1, 'GB') }
])
const detailGroups = computed(() => {
  const os = info.value?.os
  const row = (key: string, value: unknown) => ({ label: t(`sysTools.monitor.${key}`), value })
  return [
    { title: t('sysTools.monitor.serverInfo'), rows: [row('hostName', os?.hostName), row('os', os?.goOs), row('arch', os?.arch), row('ip', os?.ip), row('cpu', info.value?.cpu?.cpuInfo?.[0]?.modelName)] },
    { title: t('sysTools.monitor.goRuntime'), rows: [row('goVersion', os?.version), { label: 'Goroutine', value: os?.numGoroutine }, row('projectDir', os?.projectDir), row('currentTime', os?.time)] }
  ]
})
function draw() {
  if (!chartElement.value || !active) return
  chart ??= echarts.init(chartElement.value)
  const style = getComputedStyle(document.body)
  const token = (key: string) => style.getPropertyValue(key).trim()
  chart.setOption({
    animation: false,
    grid: { top: 12, right: 42, bottom: 26, left: 64 },
    xAxis: { type: 'value', min: 0, max: 100, interval: 25, axisLabel: { formatter: '{value}%', color: token('--color-text-2') }, splitLine: { lineStyle: { color: token('--color-border-1') }}},
    yAxis: { type: 'category', inverse: true, data: resources.value.map(item => item.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: token('--color-text-2') }},
    series: [{ type: 'bar', barWidth: 16, showBackground: true, backgroundStyle: { color: token('--color-fill-2') }, itemStyle: { color: `rgb(${token('--primary-6')})` }, data: resources.value.map(item => valid(item.value) ? Math.max(0, Math.min(100, item.value)) : null) }]
  })
  chart.resize()
}
function schedule() {
  clearTimeout(timer)
  if (active && automatic.value && !document.hidden && !loading.value) timer = setTimeout(refresh, 5000)
}
async function refresh() {
  if (loading.value || !active || disposed) return
  clearTimeout(timer)
  loading.value = true
  try {
    const result = await getServer()
    if (disposed) return
    info.value = result
    updatedAt.value = new Date().toLocaleTimeString(locale.value)
    failed.value = false
    await nextTick()
    draw()
    if (chartElement.value) observer?.observe(chartElement.value)
  } catch {
    if (!disposed) failed.value = true
  } finally {
    loading.value = false
    // A failed request waits for an explicit retry instead of repeating error toasts.
    if (!failed.value) schedule()
  }
}
function activate() { if (active) return; active = true; if (!info.value || automatic.value) void refresh(); void nextTick(draw) }
function deactivate() { active = false; clearTimeout(timer) }
function visibilityChanged() { if (document.hidden) clearTimeout(timer); else if (active && automatic.value) void refresh() }
watch(automatic, () => { if (automatic.value) void refresh(); else clearTimeout(timer) })
watch(() => [preferences.darkMode, preferences.themePreset, preferences.customThemeColor, locale.value], () => nextTick(draw), { flush: 'post' })
onMounted(() => { observer = new ResizeObserver(() => chart?.resize()); document.addEventListener('visibilitychange', visibilityChanged); activate() })
onActivated(activate)
onDeactivated(deactivate)
onBeforeUnmount(() => { disposed = true; deactivate(); observer?.disconnect(); chart?.dispose(); document.removeEventListener('visibilitychange', visibilityChanged) })
</script>

<style scoped lang="scss">
.server-monitor { color: var(--color-text-1); }
.monitor-header, .monitor-controls, .panel-heading, .monitor-status { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.monitor-header { padding: 8px 0 20px; }
h1, h2, p, dl, dd { margin: 0; }
h1 { font-size: 22px; font-weight: 600; line-height: 1.5; }
h2 { font-size: 16px; font-weight: 600; }
.monitor-header p, .panel-heading span, .monitor-status { color: var(--color-text-2); font-size: 13px; }
.monitor-header p { margin-top: 4px; }
.monitor-overview { display: grid; grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr); gap: 16px; }
.monitor-system { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
.monitor-panel { min-width: 0; padding: 20px 24px; border: 1px solid var(--color-border-2); border-radius: var(--border-radius-medium); background: var(--color-bg-2); }
.resource-chart { height: 220px; width: 100%; margin-top: 12px; }
.resource-values { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; border-top: 1px solid var(--color-border-1); padding-top: 16px; }
dt { color: var(--color-text-2); font-size: 13px; }
.resource-values dd { display: grid; gap: 4px; margin-top: 6px; }
.resource-values strong { font-size: 20px; font-weight: 600; }
.resource-values dd span { color: var(--color-text-2); font-size: 12px; overflow-wrap: anywhere; }
.network-values { margin-top: 24px; }
.network-values > div { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 0; }
.network-values dt { display: flex; align-items: center; gap: 8px; }
.network-values dd { font-size: 24px; font-weight: 600; }
.network-values dd span { font-size: 12px; font-weight: 400; color: var(--color-text-2); }
.monitor-details { margin-top: 16px; }
.monitor-details > div { display: grid; grid-template-columns: 100px minmax(0, 1fr); gap: 16px; padding: 10px 0; border-bottom: 1px solid var(--color-border-1); line-height: 1.6; }
.monitor-details > div:last-child { border-bottom: 0; }
.monitor-details dd { overflow-wrap: anywhere; }
.network-details { border-top: 1px solid var(--color-border-1); }
.monitor-status { padding: 16px 0 4px; flex-wrap: wrap; gap: 8px; }
.monitor-alert { margin-bottom: 16px; }
.monitor-loading { display: flex; justify-content: center; padding: 100px 0; }
dd, .monitor-status { font-variant-numeric: tabular-nums; }
@media (max-width: 1100px) { .monitor-overview { grid-template-columns: minmax(0, 1.5fr) minmax(240px, 1fr); } .panel-heading { align-items: flex-start; flex-direction: column; gap: 4px; } }
@media (max-width: 767px) {
  .server-monitor { padding: 12px; }
  .monitor-header { align-items: flex-start; flex-direction: column; gap: 12px; }
  .monitor-controls { width: 100%; }
  .monitor-overview, .monitor-system { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .monitor-panel { padding: 16px; }
  .resource-values { gap: 10px; }
  .resource-values strong { font-size: 18px; }
  .monitor-system { margin-top: 12px; }
  .network-values { margin-top: 8px; }
}
</style>
