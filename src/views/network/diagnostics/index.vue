<template>
  <PageContainer class="diagnostics-page">
    <a-alert v-if="serverFailed" type="error" :title="t('networkDiagnostics.serverFailed')">
      {{ t('networkDiagnostics.serverFailedHelp') }}
      <template #action><a-button :loading="loading" @click="loadServer">{{ t('networkDiagnostics.reload') }}</a-button></template>
    </a-alert>
    <a-card class="diagnostics-page__controls">
      <a-form ref="formRef" :model="draft" layout="inline" label-align="left" class="diagnostics-page__form" @submit-success="start">
        <div class="diagnostics-page__form-row">
          <a-form-item class="diagnostics-page__node">
            <div class="diagnostics-page__node-controls">
              <div v-control-label="t('networkDiagnostics.node')" class="diagnostics-page__control" :data-expanded="selectExpanded.node" :title="server?.name"><a-select :model-value="server?.id" :loading="loading" :disabled="!server" :placeholder="t('networkDiagnostics.node')" @popup-visible-change="selectExpanded.node = $event"><template #prefix><icon-desktop aria-hidden="true" /></template><a-option v-if="server" role="option" :value="server.id">{{ server.name }}</a-option></a-select></div>
              <a-popover :popup-visible="nodeDetailsOpen" trigger="click" position="bl" @popup-visible-change="showNodeDetails">
                <a-button ref="nodeDetailsButton" type="text" :disabled="!server" :aria-label="t('networkDiagnostics.nodeDetails')" :aria-expanded="nodeDetailsOpen" aria-controls="diagnostic-node-details" @keydown.esc.stop.prevent="closeNodeDetails"><template #icon><icon-info-circle /></template></a-button>
                <template #content>
                  <div id="diagnostic-node-details" ref="nodeDetailsContent" class="diagnostics-page__node-popover" role="region" :aria-label="t('networkDiagnostics.nodeDetails')" tabindex="-1" @keydown.esc.stop.prevent="closeNodeDetails">
                    <header><strong>{{ t('networkDiagnostics.nodeDetails') }}</strong><a-button type="text" :aria-label="t('common.close')" @click="closeNodeDetails"><template #icon><icon-close /></template></a-button></header>
                    <dl v-if="server" class="diagnostics-page__details"><div><dt>{{ t('networkDiagnostics.hostname') }}</dt><dd>{{ server.hostname }}</dd></div><div><dt>{{ t('networkDiagnostics.addresses') }}</dt><dd><span v-for="address in server.addresses" :key="address" class="diagnostics-page__address">{{ address }}</span><span v-if="!server.addresses.length">{{ t('networkDiagnostics.unavailableAddress') }}</span></dd></div></dl>
                    <a-button type="text" :loading="loading" @click="loadServer"><template #icon><icon-refresh /></template>{{ t('networkDiagnostics.reload') }}</a-button>
                  </div>
                </template>
              </a-popover>
            </div>
          </a-form-item>
          <a-form-item field="tool" class="diagnostics-page__tool">
            <div v-control-label="t('networkDiagnostics.tool')" class="diagnostics-page__control" :data-expanded="selectExpanded.tool"><a-select v-model="draft.tool" @popup-visible-change="selectExpanded.tool = $event"><template #prefix><icon-code aria-hidden="true" /></template>
              <a-option v-for="tool in diagnosticTools" :key="tool" role="option" :value="tool">{{ tool }}</a-option>
            </a-select></div>
          </a-form-item>
          <a-form-item v-if="!serverMode" field="target" :rules="targetRules" class="diagnostics-page__target">
            <a-input v-model="draft.target" :input-attrs="{ 'aria-label': t('networkDiagnostics.target') }" :placeholder="t('networkDiagnostics.targetPlaceholder')" allow-clear />
          </a-form-item>
          <a-form-item field="family" class="diagnostics-page__family">
            <div v-control-label="t('networkDiagnostics.family')" class="diagnostics-page__control" :data-expanded="selectExpanded.family"><a-select v-model="draft.family" @popup-visible-change="selectExpanded.family = $event"><template #prefix><span aria-hidden="true" class="diagnostics-page__protocol-label">IP</span></template><a-option role="option" value="auto">{{ t('networkDiagnostics.auto') }}</a-option><a-option role="option" value="4">IPv4</a-option><a-option role="option" value="6">IPv6</a-option></a-select></div>
          </a-form-item>
          <div v-if="canRun" class="diagnostics-page__run-actions">
            <a-button v-if="!slot.id || !state.busy(slot) || slot.submitting" type="primary" html-type="submit" :loading="slot.submitting" :disabled="!server || !toolAvailable || state.busy(slot)"><template #icon><icon-play-arrow /></template>{{ t(serverMode ? 'networkDiagnostics.startServer' : 'networkDiagnostics.run') }}</a-button>
            <a-button v-if="slot.id && state.busy(slot) && !slot.submitting" :loading="slot.stopping" @click="state.stop(slot)"><template #icon><icon-record-stop /></template>{{ t('networkDiagnostics.stop') }}</a-button>
          </div>
        </div>
        <div v-if="draft.tool === 'iperf3'" class="diagnostics-page__options">
          <a-form-item field="mode" :label="t('networkDiagnostics.mode')" class="diagnostics-page__mode"><a-radio-group v-model="draft.mode" type="button"><a-radio value="client">{{ t('networkDiagnostics.clientMode') }}</a-radio><a-radio value="server">{{ t('networkDiagnostics.serverMode') }}</a-radio></a-radio-group></a-form-item>
          <div v-if="!serverMode" class="diagnostics-page__iperf-options">
            <a-form-item field="port" :label="t('networkDiagnostics.port')"><div v-control-label="t('networkDiagnostics.port')" class="diagnostics-page__control"><a-input-number v-model="draft.port" :min="1" :max="65535" :precision="0" /></div></a-form-item>
            <a-form-item field="duration" :label="t('networkDiagnostics.duration')"><div v-control-label="t('networkDiagnostics.duration')" class="diagnostics-page__control"><a-input-number v-model="draft.duration" :min="1" :max="30" :precision="0" /></div></a-form-item>
            <a-form-item field="reverse" :label="t('networkDiagnostics.direction')"><div v-control-label="t('networkDiagnostics.direction')" class="diagnostics-page__control" :data-expanded="selectExpanded.direction"><a-select v-model="draft.direction" @popup-visible-change="selectExpanded.direction = $event"><a-option role="option" value="send">{{ t('networkDiagnostics.upload') }}</a-option><a-option role="option" value="receive">{{ t('networkDiagnostics.download') }}</a-option></a-select></div></a-form-item>
          </div>
        </div>
        <p v-if="serverMode" class="diagnostics-page__tool-help">{{ t('networkDiagnostics.serverModeHelp', { seconds: server?.sessionSeconds || 120 }) }}</p>
        <a-alert v-if="server && !toolAvailable" type="warning">{{ t('networkDiagnostics.toolUnavailable', { tool: draft.tool }) }}<template #action><a-button :loading="loading" @click="loadServer">{{ t('networkDiagnostics.reload') }}</a-button></template></a-alert>
        <a-alert v-if="!canRun" type="info">{{ t('networkDiagnostics.noPermission') }}</a-alert>

      </a-form>
    </a-card>
    <div class="diagnostics-page__layout">
      <aside v-if="state.busy(state.session)" class="diagnostics-page__sidebar">
        <details class="diagnostics-page__panel diagnostics-page__session" open>
          <summary class="diagnostics-page__panel-heading"><h2>{{ t('networkDiagnostics.session') }}</h2><icon-down aria-hidden="true" /></summary>
          <div class="diagnostics-page__panel-body diagnostics-page__session-body">
            <template v-if="state.session.job && state.busy(state.session)">
              <div class="diagnostics-page__session-overview">
                <div class="diagnostics-page__session-state"><p class="diagnostics-page__session-status">{{ t(state.session.pollFailed ? 'networkDiagnostics.sessionUnconfirmed' : state.session.job.output.includes('Server listening') ? 'networkDiagnostics.sessionReady' : 'networkDiagnostics.sessionStarting') }}</p><span v-if="!state.session.pollFailed" class="diagnostics-page__countdown">{{ t('networkDiagnostics.remaining', { seconds: remaining }) }}</span></div>
                <dl class="diagnostics-page__details diagnostics-page__session-details"><div><dt>{{ t('networkDiagnostics.connectHost') }}</dt><dd>{{ server?.connectHost }}</dd></div><div><dt>{{ t('networkDiagnostics.sessionPort') }}</dt><dd>{{ state.session.job.port }}</dd></div></dl>
              </div>
              <div v-for="reverse in [false, true]" :key="String(reverse)" class="diagnostics-page__connection">
                <div class="diagnostics-page__command-label"><span>{{ t(reverse ? 'networkDiagnostics.receiveCommand' : 'networkDiagnostics.sendCommand') }}</span><a-button type="text" :aria-label="t('networkDiagnostics.copyCommand', { direction: t(reverse ? 'networkDiagnostics.receiveCommand' : 'networkDiagnostics.sendCommand') })" @click="copyCommand(reverse)"><icon-copy /></a-button></div>
                <code class="diagnostics-page__connect-command">{{ connectionCommand(reverse) }}</code>
              </div>
              <div class="diagnostics-page__session-footer">
                <p class="diagnostics-page__help">{{ t('networkDiagnostics.sessionHelp') }}</p>
                <div class="diagnostics-page__session-actions"><a-button v-if="canRun" :loading="state.session.stopping" @click="state.stop(state.session)">{{ t('networkDiagnostics.stopSession') }}</a-button><a-button v-if="state.session.pollFailed" @click="state.refresh()">{{ t('networkDiagnostics.resume') }}</a-button></div>
              </div>
            </template>
            <template v-else-if="state.busy(state.session)"><p class="diagnostics-page__session-status">{{ t('networkDiagnostics.sessionUnconfirmed') }}</p><div class="diagnostics-page__session-actions"><a-button :loading="state.session.refreshing" @click="state.refresh()">{{ t('networkDiagnostics.resume') }}</a-button><a-button v-if="canRun" :loading="state.session.stopping" @click="state.stop(state.session)">{{ t('networkDiagnostics.stopSession') }}</a-button></div></template>
          </div>
        </details>
      </aside>

      <main class="diagnostics-page__workspace">
        <a-alert v-if="slot.startFailed" type="error">{{ t('networkDiagnostics.startFailed') }}</a-alert>
        <DiagnosticOutput :job="slot.job" :now="now" :issue="slot.missing ? 'missing' : slot.pollFailed ? 'interrupted' : undefined" :refreshing="slot.refreshing" @resume="state.refresh()" />
      </main>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onDeactivated, onMounted, onBeforeUnmount, reactive, ref, type ObjectDirective } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, type FormInstance } from '@arco-design/web-vue'
import PageContainer from '@/components/PageContainer/index.vue'
import { useFormLocale } from '@/composables/useFormLocale'
import { getDiagnosticServer } from '@/api/network/diagnostics'
import { diagnosticTools, type DiagnosticFamily, type DiagnosticServer, type DiagnosticTool } from '@/types/diagnostics'
import { useUserStore } from '@/stores/user'
import DiagnosticOutput from './output.vue'
import { useDiagnostics } from './use-diagnostics'

defineOptions({ name: 'NetworkDiagnostics' })
const { t } = useI18n()
const user = useUserStore()
const state = useDiagnostics()
const server = ref<DiagnosticServer>()
const loading = ref(false)
const serverFailed = ref(false)
const formRef = ref<FormInstance>()
useFormLocale(formRef)
const selectExpanded = reactive({ node: false, tool: false, family: false, direction: false })
const draft = reactive({ tool: 'ping' as DiagnosticTool, target: '', family: 'auto' as DiagnosticFamily, mode: 'client' as 'client' | 'server', port: 5201, duration: 10, direction: 'send' })
const canRun = computed(() => user.permisaction.some(value => value === '*:*:*' || value === 'network:diagnostics:run'))
const serverMode = computed(() => draft.tool === 'iperf3' && draft.mode === 'server')
const slot = computed(() => serverMode.value ? state.session : state.run)
const toolAvailable = computed(() => server.value?.tools.some(tool => tool.id === draft.tool && tool.available))
const targetRules = computed(() => [{ required: true, message: t('networkDiagnostics.targetRequired') }, { match: /^[a-zA-Z0-9:.][a-zA-Z0-9:.-]*$/, message: t('networkDiagnostics.invalidTarget') }])
const nodeDetailsOpen = ref(false)
const nodeDetailsButton = ref<{ $el: HTMLButtonElement }>()
const nodeDetailsContent = ref<HTMLElement>()
async function showNodeDetails(visible: boolean) { nodeDetailsOpen.value = visible; if (visible) { await nextTick(); nodeDetailsContent.value?.focus() } }
async function closeNodeDetails() { nodeDetailsOpen.value = false; await nextTick(); nodeDetailsButton.value?.$el.focus() }
const now = ref(Date.now())
const remaining = computed(() => Math.min(server.value?.sessionSeconds || 120, Math.max(0, Math.ceil(((Date.parse(state.session.job?.expiresAt || '') || now.value) - now.value) / 1000))))
let clock: ReturnType<typeof setInterval> | undefined
let activated = false
const labelControl = (element: HTMLElement, label: string) => {
  element.querySelector('input')?.setAttribute('aria-label', label)
  const input = element.querySelector('input')
  input?.setAttribute('autocomplete', 'off')
  if (element.dataset.expanded !== undefined) {
    input?.setAttribute('role', 'combobox')
    input?.setAttribute('aria-haspopup', 'listbox')
    input?.setAttribute('aria-expanded', element.dataset.expanded)
  }
}
const vControlLabel: ObjectDirective<HTMLElement, string> = { mounted: (element, binding) => labelControl(element, binding.value), updated: (element, binding) => labelControl(element, binding.value) }
async function loadServer() {
  if (loading.value) return
  loading.value = true
  serverFailed.value = false
  try { server.value = (await getDiagnosticServer()).data } catch { serverFailed.value = true } finally { loading.value = false }
}
async function start() {
  if (!canRun.value || !toolAvailable.value) return
  await state.start({ tool: draft.tool, family: draft.family, target: serverMode.value ? undefined : draft.target.trim(), mode: serverMode.value ? 'server' : 'client', ...(draft.tool === 'iperf3' && !serverMode.value ? { port: draft.port, duration: draft.duration, reverse: draft.direction === 'receive' } : {}) })
  now.value = Date.now()
}
function connectionCommand(reverse: boolean) {
  const family = state.session.job?.family
  return `iperf3${family && family !== 'auto' ? ` -${family}` : ''} -c ${server.value?.connectHost || ''} -p ${state.session.job?.port || 5201} -t 10${reverse ? ' -R' : ''}`
}
async function copyCommand(reverse: boolean) {
  try { await navigator.clipboard.writeText(connectionCommand(reverse)); Message.success(t('networkDiagnostics.copied')) } catch { Message.error(t('networkDiagnostics.copyFailed')) }
}
function activate() {
  if (activated) return
  activated = true
  now.value = Date.now()
  clock = setInterval(() => { now.value = Date.now() }, 1000)
  void state.resume()
}
function deactivate() { activated = false; clearInterval(clock); state.pause(); nodeDetailsOpen.value = false }
onMounted(() => { void loadServer(); activate() })
onActivated(activate)
onDeactivated(deactivate)
onBeforeUnmount(deactivate)
</script>

<style scoped lang="scss">
.diagnostics-page { color: var(--color-text-1); }
.diagnostics-page > .arco-alert { margin-bottom: 12px; }
.diagnostics-page__layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; align-items: start; }
.diagnostics-page__sidebar, .diagnostics-page__workspace { display: flex; flex-direction: column; min-width: 0; gap: 16px; }
.diagnostics-page__panel { border: 1px solid var(--color-border-2); border-radius: var(--motor-radius-sm); background: var(--color-bg-2); }
.diagnostics-page h2 { margin: 0; font-size: var(--motor-font-size-14); font-weight: 600; line-height: 1.5; }
.diagnostics-page summary { list-style: none; cursor: pointer; }
.diagnostics-page summary::-webkit-details-marker { display: none; }
.diagnostics-page summary:focus-visible { outline: 2px solid rgb(var(--primary-6)); outline-offset: 2px; }
.diagnostics-page summary > svg:last-child { flex-shrink: 0; color: var(--color-text-2); transition: transform 160ms ease-out; }
.diagnostics-page details[open] > summary > svg:last-child { transform: rotate(180deg); }
.diagnostics-page__panel-heading { display: flex; box-sizing: border-box; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; padding: 8px 16px; border-bottom: 1px solid var(--color-border-2); }
.diagnostics-page__panel-heading .arco-btn { margin: -8px -8px -8px 0; }
.diagnostics-page details:not([open]) > summary { border-bottom: 0; }
.diagnostics-page__panel-body { padding: 12px 16px 16px; }
.diagnostics-page__help { color: var(--color-text-2); font-size: var(--motor-font-size-12); line-height: 1.6; margin: 12px 0 0; }
.diagnostics-page__details { display: grid; gap: 12px; margin: 0; }
.diagnostics-page__details > div { min-width: 0; }
.diagnostics-page__details dt { margin: 0 0 4px; font-size: var(--motor-font-size-12); color: var(--color-text-2); }
.diagnostics-page__details dd { margin: 0; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; line-height: 1.5; }
.diagnostics-page__address { display: block; }
.diagnostics-page__node-controls { display: flex; align-items: center; gap: 4px; width: 100%; }
.diagnostics-page__node-controls .diagnostics-page__control { flex: 1; min-width: 0; }
.diagnostics-page__node-popover { width: min(280px, calc(100vw - 64px)); outline: none; }
.diagnostics-page__node-popover header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.diagnostics-page__node-popover > .arco-btn { margin-top: 12px; }
.diagnostics-page__session-state { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 4px 12px; }
.diagnostics-page__session-status { margin: 0; font-size: var(--motor-font-size-13); font-weight: 500; line-height: 1.5; }
.diagnostics-page__countdown { color: var(--color-text-2); font-size: var(--motor-font-size-12); font-variant-numeric: tabular-nums; }
.diagnostics-page__session-details { grid-template-columns: minmax(0, 1fr) auto; margin-top: 12px; }
.diagnostics-page__command-label { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 8px; font-size: var(--motor-font-size-12); color: var(--color-text-2); }
.diagnostics-page__command-label .arco-btn { margin-right: -8px; }
.diagnostics-page__connect-command { display: block; padding: 8px 12px; background: var(--color-fill-1); border-radius: var(--motor-radius-xs); overflow-wrap: anywhere; line-height: 1.6; font-size: var(--motor-font-size-12); }
.diagnostics-page__session-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }

.diagnostics-page__session-body { display: grid; grid-template-columns: minmax(200px, .8fr) repeat(2, minmax(0, 1fr)); gap: 12px 24px; }
.diagnostics-page__session-overview, .diagnostics-page__connection { min-width: 0; }
.diagnostics-page__session-footer { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.diagnostics-page__session-footer .diagnostics-page__help, .diagnostics-page__session-footer .diagnostics-page__session-actions { margin-top: 0; }

.diagnostics-page__controls { margin-bottom: 16px; container-type: inline-size; }
.diagnostics-page__controls :deep(.arco-card-body) { padding: 16px; }
.diagnostics-page__form { display: flex; flex-direction: column; gap: 12px; }
.diagnostics-page__form-row { display: grid; grid-template-columns: minmax(180px, 220px) 148px minmax(160px, 1fr) 108px auto; align-items: start; gap: 12px; }
.diagnostics-page__controls :deep(.arco-form-item) { min-width: 0; width: 100%; margin: 0; }
.diagnostics-page__controls :deep(.arco-form-item-wrapper-col) { min-width: 0; width: 100%; }
.diagnostics-page__form-row :deep(.arco-form-item-label-col) { display: none; }
.diagnostics-page__form-row :deep(.arco-form-item-content) { min-height: 40px; }
.diagnostics-page__form-row :deep(.arco-input-wrapper), .diagnostics-page__form-row :deep(.arco-select-view) { min-height: 40px; }
.diagnostics-page__form-row :deep(.arco-input::placeholder) { color: var(--color-text-2); }
.diagnostics-page__protocol-label { font-size: var(--motor-font-size-12); color: var(--color-text-2); }
.diagnostics-page__options { display: flex; align-items: start; flex-wrap: wrap; gap: 12px 24px; padding-top: 12px; border-top: 1px solid var(--color-border-2); }
.diagnostics-page__options :deep(.arco-form-item) { width: auto; }
.diagnostics-page__iperf-options { display: flex; flex: 1; flex-wrap: wrap; gap: 12px 24px; }
.diagnostics-page__iperf-options :deep(.arco-form-item) { flex: 1; min-width: 180px; }
.diagnostics-page__tool-help { margin: 0; color: var(--color-text-2); font-size: var(--motor-font-size-12); line-height: 1.6; }
.diagnostics-page__run-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.diagnostics-page__run-actions > .arco-btn { min-width: 110px; min-height: 40px; }
.diagnostics-page__run-actions :deep(.arco-btn + .arco-btn) { margin-left: 0; }
.diagnostics-page__control { width: 100%; }
.diagnostics-page__controls :deep(.arco-input-wrapper),
.diagnostics-page__controls :deep(.arco-select-view),
.diagnostics-page__controls :deep(.arco-input-number) { width: 100%; }
.diagnostics-page__node-controls > :deep(.arco-btn) { width: 28px; height: 40px; padding: 0; flex-shrink: 0; color: var(--color-text-2); }
.diagnostics-page__form-row:not(:has(.diagnostics-page__target)) { grid-template-columns: minmax(180px, 220px) 148px 108px 1fr; }
@container (max-width: 920px) {
  .diagnostics-page__form-row { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .diagnostics-page__node, .diagnostics-page__tool { grid-column: span 3; }
  .diagnostics-page__target { grid-column: span 3; }
  .diagnostics-page__family { grid-column: span 1; }
  .diagnostics-page__run-actions { grid-column: span 2; }
  .diagnostics-page__form-row:not(:has(.diagnostics-page__target)) { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .diagnostics-page__form-row:not(:has(.diagnostics-page__target)) .diagnostics-page__family { grid-column: span 3; }
  .diagnostics-page__form-row:not(:has(.diagnostics-page__target)) .diagnostics-page__run-actions { grid-column: span 3; }
}
@container (max-width: 600px) {
  .diagnostics-page__form-row, .diagnostics-page__form-row:not(:has(.diagnostics-page__target)) { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 8px; }
  .diagnostics-page__node, .diagnostics-page__tool, .diagnostics-page__family, .diagnostics-page__run-actions,
  .diagnostics-page__form-row:not(:has(.diagnostics-page__target)) .diagnostics-page__family,
  .diagnostics-page__form-row:not(:has(.diagnostics-page__target)) .diagnostics-page__run-actions { grid-column: span 1; }
  .diagnostics-page__target { grid-column: 1 / -1; }
  .diagnostics-page__run-actions { flex-wrap: wrap; }
  .diagnostics-page__run-actions > .arco-btn { flex: 1; }
  .diagnostics-page__options { gap: 12px; }
  .diagnostics-page__mode { width: 100%; }
  .diagnostics-page__mode :deep(.arco-form-item-label-col) { display: none; }
  .diagnostics-page__options :deep(.arco-form-item) { flex-direction: column; align-items: stretch; }
  .diagnostics-page__options :deep(.arco-form-item-label-col) { text-align: left; padding: 0; margin-bottom: 4px; }
}
@container (max-width: 330px) {
  .diagnostics-page__node, .diagnostics-page__tool { grid-column: 1 / -1; }
}
@media (max-width: 1100px) {
  .diagnostics-page__session-body { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .diagnostics-page__session-overview { grid-column: 1 / -1; }
}
@media (max-width: 767px) {
  .diagnostics-page__controls { border-right: 0; border-left: 0; border-radius: 0; margin-bottom: 12px; }
  .diagnostics-page__controls :deep(.arco-card-body) { padding: 12px; }
  .diagnostics-page__panel-body { padding: 12px; }
  .diagnostics-page__panel-heading { padding: 8px 12px; min-height: 44px; }
  .diagnostics-page__session-body { grid-template-columns: minmax(0, 1fr); }
  .diagnostics-page__session-footer { flex-wrap: wrap; }
  .diagnostics-page__run-actions > .arco-btn { min-height: 44px; }
  .diagnostics-page__controls :deep(.arco-radio-group-button) { display: flex; flex-wrap: wrap; gap: 8px; height: auto; }
  .diagnostics-page__controls :deep(.arco-radio-button) { min-height: 44px; display: flex; align-items: center; white-space: normal; }
  .diagnostics-page__controls :deep(.arco-input-wrapper .arco-input),
  .diagnostics-page__controls :deep(.arco-select-view .arco-select-view-input) { min-height: 42px; font-size: max(16px, var(--motor-font-size-14)); }
  .diagnostics-page__controls :deep(.arco-select-view) { min-height: 44px; font-size: max(16px, var(--motor-font-size-14)); }
  .diagnostics-page__session-actions > .arco-btn { min-height: 44px; }
  .diagnostics-page__node-controls > :deep(.arco-btn), .diagnostics-page__node-popover :deep(.arco-btn) { min-width: 44px; min-height: 44px; }
}
@media (prefers-reduced-motion: reduce) {
  .diagnostics-page summary svg { transition: none; }
}
</style>
