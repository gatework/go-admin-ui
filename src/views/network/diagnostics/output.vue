<template>
  <section class="diagnostic-output" role="region" :aria-label="t('networkDiagnostics.output')">
    <div class="diagnostic-output__terminal" :class="{ 'diagnostic-output__terminal--empty': !job }">
      <header class="diagnostic-output__header">
        <h2>{{ t('networkDiagnostics.output') }}</h2>
        <div class="diagnostic-output__actions">
          <a-tooltip :content="t('networkDiagnostics.copy')"><a-button type="text" :aria-label="t('networkDiagnostics.copy')" :disabled="!text" @click="copy"><template #icon><icon-copy /></template></a-button></a-tooltip>
          <a-tooltip :content="t('networkDiagnostics.retention')"><a-button type="text" :aria-label="t('networkDiagnostics.save')" :disabled="!text" @click="download"><template #icon><icon-download /></template></a-button></a-tooltip>
        </div>
      </header>
      <details v-if="job" class="diagnostic-output__command-details">
        <summary :title="t('networkDiagnostics.commandDetails')" :aria-label="t('networkDiagnostics.commandDetails')"><span class="diagnostic-output__prompt" aria-hidden="true">$</span><code><span v-for="(part, index) in summaryParts" :key="index" :class="part.tone && `diagnostic-output__${part.tone}`">{{ part.text }}</span></code><icon-down aria-hidden="true" /></summary>
        <code class="diagnostic-output__full-command"><span v-for="(part, index) in commandParts" :key="index" :class="part.tone && `diagnostic-output__${part.tone}`">{{ part.text }}</span></code>
      </details>
      <div ref="viewport" class="diagnostic-output__viewport" tabindex="0" :aria-label="t('networkDiagnostics.output')">
        <template v-if="job">
          <pre class="diagnostic-output__text"><template v-if="text"><span v-for="(part, index) in outputParts" :key="index" :class="part.tone && `diagnostic-output__${part.tone}`">{{ part.text }}</span></template><template v-else>{{ t('networkDiagnostics.waitingOutput') }}</template></pre>
        </template>
        <div v-else class="diagnostic-output__empty">
          <h3>{{ t('networkDiagnostics.emptyTitle') }}</h3>
          <p>{{ t('networkDiagnostics.emptyHelp') }}</p>
        </div>
      </div>
      <footer class="diagnostic-output__footer">
        <div class="diagnostic-output__status-copy">
          <div class="diagnostic-output__result" :class="issue ? 'diagnostic-output__result--notice' : job && `diagnostic-output__result--${job.status}`"><span class="diagnostic-output__status-indicator" aria-hidden="true" /><span aria-live="polite">{{ statusLabel }}</span><span v-if="job && !issue" class="diagnostic-output__elapsed">{{ t('networkDiagnostics.elapsed', { seconds: elapsed }) }}</span></div>
          <p v-if="statusHelp" class="diagnostic-output__status-help">{{ statusHelp }}</p>
          <p v-if="job?.truncated" class="diagnostic-output__status-help diagnostic-output__truncated">{{ t('networkDiagnostics.truncated') }}</p>
        </div>
        <div class="diagnostic-output__footer-actions">
          <a-button v-if="issue === 'interrupted'" type="text" :loading="refreshing" @click="emit('resume')">{{ t('networkDiagnostics.resume') }}</a-button>
          <a-checkbox v-if="job && !issue" v-model="follow">{{ t('networkDiagnostics.follow') }}</a-checkbox>
        </div>
      </footer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import type { DiagnosticJob } from '@/types/diagnostics'
import { formatDiagnosticCommand, formatDiagnosticOutput, plainDiagnosticOutput } from './format-output'

defineOptions({ name: 'DiagnosticOutput' })

const props = defineProps<{ job: DiagnosticJob | null; now: number; issue?: 'missing' | 'interrupted'; refreshing?: boolean }>()
const emit = defineEmits<{ resume: [] }>()
const { t } = useI18n()
const viewport = ref<HTMLElement>()
const follow = ref(true)
const text = computed(() => plainDiagnosticOutput(props.job?.output || ''))
const commandParts = computed(() => formatDiagnosticCommand(props.job?.command || '', props.job?.target || ''))
const summaryParts = computed(() => {
  const job = props.job
  if (!job) return []
  const summary = job.target && job.command.split(/\s+/).length > 2 ? `${job.tool} … ${job.target}` : job.command
  return formatDiagnosticCommand(summary, job.target)
})
const outputParts = computed(() => formatDiagnosticOutput(text.value, props.job?.tool || 'ping'))
const elapsed = computed(() => props.job ? Math.max(0, Math.floor(((props.job.finishedAt ? Date.parse(props.job.finishedAt) : props.now) - Date.parse(props.job.startedAt)) / 1000)) : 0)
const statusLabel = computed(() => t(props.issue === 'missing' ? 'networkDiagnostics.missing' : props.issue === 'interrupted' ? 'networkDiagnostics.pollFailed' : props.job ? `networkDiagnostics.status.${props.job.status}` : 'networkDiagnostics.ready'))
const statusHelp = computed(() => {
  if (props.issue) return t(props.issue === 'missing' ? 'networkDiagnostics.missingHelp' : 'networkDiagnostics.pollFailedHelp')
  return props.job && ['failed', 'timed_out', 'expired'].includes(props.job.status) ? t(`networkDiagnostics.statusHelp.${props.job.status}`) : ''
})
watch([text, () => props.job?.status, follow], async() => { await nextTick(); if (follow.value && viewport.value) viewport.value.scrollTop = viewport.value.scrollHeight })
async function copy() {
  try { await navigator.clipboard.writeText(text.value); Message.success(t('networkDiagnostics.copied')) } catch { Message.error(t('networkDiagnostics.copyFailed')) }
}
function download() {
  if (!props.job) return
  const body = `${props.job.command}\n${props.job.startedAt}\n${props.job.status}\n\n${text.value}`
  const url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.job.tool}-${props.job.id}.txt`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<style scoped lang="scss">
.diagnostic-output {
  // This local output surface follows the supplied DMIT reference in both app themes.
  --terminal-bg: #282a36;
  --terminal-text: #d8d9e4;
  --terminal-muted: #aaaebe;
  --terminal-green: #a3dc8c;
  --terminal-yellow: #e5d378;
  --terminal-cyan: #6fdae6;
  --terminal-purple: #c0a5e8;
  --terminal-red: #ff8b94;
  --terminal-line: #3e4152;
  --terminal-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--motor-radius-md);
  background: var(--terminal-bg);
  color: var(--terminal-text);
  color-scheme: dark;
}
.diagnostic-output__terminal { display: flex; flex-direction: column; min-height: 360px; max-height: max(360px, min(700px, calc(100dvh - 240px))); background: var(--terminal-bg); }
.diagnostic-output__terminal--empty { min-height: 280px; }
.diagnostic-output__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0; min-height: 48px; padding: 4px 16px 0 24px; }
.diagnostic-output h2 { margin: 0; color: var(--terminal-muted); font-size: var(--motor-font-size-12); font-weight: 500; line-height: 1.5; }
.diagnostic-output__actions { display: flex; align-items: center; gap: 4px; }
.diagnostic-output__actions :deep(.arco-btn + .arco-btn) { margin-left: 0; }
.diagnostic-output :deep(.arco-btn-text) { color: var(--terminal-muted); border-radius: var(--motor-radius-xs); }
.diagnostic-output :deep(.arco-btn-text:not(.arco-btn-disabled):hover) { color: var(--terminal-text); background: #3b3e4e; }
.diagnostic-output :deep(.arco-btn-disabled) { color: var(--terminal-muted); opacity: .45; }
.diagnostic-output :deep(.arco-btn:focus-visible), .diagnostic-output__command-details summary:focus-visible { outline: 2px solid var(--terminal-cyan); outline-offset: -2px; }
.diagnostic-output__viewport { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 12px 24px 24px; font-size: var(--motor-font-size-13); line-height: 1.65; font-variant-numeric: tabular-nums; tab-size: 4; scrollbar-color: #666b80 var(--terminal-bg); }
.diagnostic-output__viewport:focus-visible { outline: 2px solid var(--terminal-cyan); outline-offset: -2px; }
.diagnostic-output :deep(::selection) { color: #ffffff; background: #495678; }
.diagnostic-output__command-details { flex-shrink: 0; padding: 4px 24px 0; font: var(--motor-font-size-13)/1.65 var(--terminal-mono); }
.diagnostic-output__command-details summary { display: flex; align-items: baseline; gap: 8px; padding: 4px 0; cursor: pointer; list-style: none; }
.diagnostic-output__command-details summary::-webkit-details-marker { display: none; }
.diagnostic-output__command-details summary > svg { flex-shrink: 0; color: var(--terminal-muted); }
.diagnostic-output__command-details[open] summary > svg { transform: rotate(180deg); }
.diagnostic-output__command-details code { min-width: 0; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }
.diagnostic-output__full-command { display: block; max-height: 100px; overflow: auto; margin: 4px 0 8px; padding-left: 16px; scrollbar-color: var(--terminal-muted) var(--terminal-bg); }
.diagnostic-output__prompt { flex-shrink: 0; color: var(--terminal-cyan); }
.diagnostic-output__text { margin: 0; min-width: max-content; font: var(--motor-font-size-13)/1.65 var(--terminal-mono); }
.diagnostic-output__command, .diagnostic-output__asn { color: var(--terminal-green); }
.diagnostic-output__hop { color: var(--terminal-yellow); }
.diagnostic-output__metric { color: var(--terminal-cyan); }
.diagnostic-output__annotation { color: var(--terminal-purple); }
.diagnostic-output__muted { color: var(--terminal-muted); }
.diagnostic-output__result { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; color: var(--terminal-muted); font-size: var(--motor-font-size-12); line-height: 1.5; }
.diagnostic-output__status-indicator { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.diagnostic-output__result--running { color: var(--terminal-cyan); }
.diagnostic-output__result--succeeded { color: var(--terminal-green); }
.diagnostic-output__result--failed { color: var(--terminal-red); }
.diagnostic-output__result--timed_out, .diagnostic-output__result--notice, .diagnostic-output__truncated { color: var(--terminal-yellow); }
.diagnostic-output__status-copy { display: flex; align-items: baseline; flex: 1; flex-wrap: wrap; gap: 4px 12px; min-width: 0; }
.diagnostic-output__status-help { margin: 0; overflow-wrap: anywhere; }
.diagnostic-output__footer-actions { display: flex; flex-shrink: 0; align-items: center; }
.diagnostic-output__elapsed { color: var(--terminal-muted); }
.diagnostic-output__elapsed::before { content: '·'; margin-right: 8px; }
.diagnostic-output__empty { padding: 12px 0; font-size: var(--motor-font-size-14); }
.diagnostic-output__empty h3 { margin: 0 0 8px; color: var(--terminal-text); font: inherit; }
.diagnostic-output__empty p { margin: 0; color: var(--terminal-muted); font-size: var(--motor-font-size-13); }
.diagnostic-output__footer { display: flex; align-items: center; justify-content: space-between; gap: 8px 16px; flex-wrap: wrap; flex-shrink: 0; min-height: 48px; padding: 8px 24px; box-sizing: border-box; border-top: 1px solid var(--terminal-line); color: var(--terminal-muted); font-size: var(--motor-font-size-12); line-height: 1.5; }
.diagnostic-output__footer :deep(.arco-checkbox) { color: var(--terminal-muted); font-size: var(--motor-font-size-12); }
.diagnostic-output__footer :deep(.arco-checkbox-label) { color: var(--terminal-muted); }
.diagnostic-output__footer :deep(.arco-checkbox-icon-check) { color: var(--terminal-bg); }
.diagnostic-output__footer :deep(.arco-checkbox-icon) { background: transparent; border: 1px solid var(--terminal-muted); }
.diagnostic-output__footer :deep(.arco-checkbox-checked .arco-checkbox-icon) { color: var(--terminal-bg); background: var(--terminal-cyan); border-color: var(--terminal-cyan); }
.diagnostic-output__footer :deep(.arco-checkbox:focus-within .arco-checkbox-icon) { outline: 2px solid var(--terminal-cyan); outline-offset: 3px; }
@media (max-width: 767px) {
  .diagnostic-output { border-radius: 0; }
  .diagnostic-output__terminal { max-height: max(360px, 65dvh); }
  .diagnostic-output__header { padding: 4px 12px 0 16px; }
  .diagnostic-output__viewport { padding: 8px 16px 16px; }
  .diagnostic-output__command-details { padding: 0 16px; }
  .diagnostic-output__actions :deep(.arco-btn) { min-width: 44px; min-height: 44px; }
  .diagnostic-output__command-details summary { box-sizing: border-box; min-height: 44px; align-items: center; }
  .diagnostic-output__footer { padding: 8px 16px; }
  .diagnostic-output__footer :deep(.arco-checkbox), .diagnostic-output__footer-actions :deep(.arco-btn) { min-height: 44px; }
}
</style>
