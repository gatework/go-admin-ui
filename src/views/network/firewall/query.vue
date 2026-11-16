<template>
  <PageContainer class="fw-page fw-query-page" :title="t('networkFirewall.title')" :description="t('networkFirewall.description')">
    <template #actions><SectionNav /></template>
    <a-alert
      v-if="!workspace.allowed('query')"
      type="warning"
    >{{ t('networkFirewall.readRequired') }}</a-alert><template v-else><a-alert
                                                                         v-if="workspace.failed.value"
                                                                         type="warning"
                                                                       >{{ t('networkFirewall.loadFailed') }}<template #action><a-button
                                                                         @click="load"
                                                                       >{{ t('networkFirewall.retry') }}</a-button></template></a-alert>
      <AsideLayout :title="t('networkFirewall.savedRequests')" collapse="stack">
        <template #aside>
          <div class="fw-aside-lists">
            <NavList
              :title="t('networkFirewall.savedRequests')"
              :items="requests.rows.map(item => ({ key: item.id, title: item.title || `#${item.id}`, description: `v${item.version}` }))"
              :selected="requestId"
              :total="requests.total"
              :page="requests.query.pageIndex"
              :page-size="requests.query.pageSize"
              :loading="requests.loading"
              :empty-text="t('networkFirewall.noRequests')"
              @page="pageIndex => requests.handlePagination({ page: pageIndex, limit: requests.query.pageSize })"
              @select="key => selectRequest(Number(key))"
            >
              <template #actions><a-button type="text" size="small" :aria-label="t('common.add')" :title="t('common.add')" @click="newRequest"><template #icon><icon-plus /></template></a-button></template>
            </NavList>
            <NavList
              v-if="saved"
              :title="t('networkFirewall.analyses')"
              :items="analyses.rows.map(item => ({ key: item.id, title: `#${item.id}`, description: `v${item.requestVersion}`, status: item.status }))"
              :selected="analysisId"
              :total="analyses.total"
              :page="analyses.query.pageIndex"
              :page-size="analyses.query.pageSize"
              :loading="analyses.loading"
              :empty-text="t('networkFirewall.noAnalyses')"
              @page="pageIndex => analyses.handlePagination({ page: pageIndex, limit: analyses.query.pageSize })"
              @select="key => navigate({ analysis: Number(key) })"
            >
              <template #actions><a-button type="text" size="small" :aria-label="t('networkFirewall.refresh')" :title="t('networkFirewall.refresh')" @click="analyses.getList"><template #icon><icon-refresh /></template></a-button></template>
              <template #meta="{ item }"><StateTag :value="item.status" /></template>
            </NavList>
          </div>
        </template>
        <div class="fw-main"><a-card><a-form
                                       :model="metadata"
                                       layout="vertical"
                                     >
                                       <div class="fw-grid"><a-form-item :label="t('networkFirewall.titleField')"><a-input
                                         v-model="metadata.title"
                                         :disabled="workspace.pending.value"
                                         :input-attrs="{ 'aria-label': t('networkFirewall.titleField') }"
                                       /></a-form-item><a-form-item :label="t('networkFirewall.domain')"><a-select
                                         v-model="metadata.domainId"
                                         :disabled="workspace.pending.value"
                                       ><a-option
                                         v-for="domain in options.domains"
                                         :key="domain.id"
                                         :value="domain.id"
                                       >{{ domain.name }}</a-option></a-select></a-form-item></div>
                                     </a-form>
          <p class="fw-muted">{{ t('networkFirewall.domainHelp') }}</p><a-alert
            type="info"
          >{{ t('networkFirewall.defaultProtocol') }}</a-alert>
          <AppTabs v-model:active-key="inputMode"><a-tab-pane
            key="individual"
            :title="t('networkFirewall.individual')"
          /><a-tab-pane
            key="paste"
            :title="t('networkFirewall.paste')"
          /></AppTabs><template v-if="inputMode === 'paste'">
            <p class="fw-muted">{{ t('networkFirewall.pasteHelp') }}</p><a-textarea
              v-model="input.text"
              :auto-size="{ minRows: 6, maxRows: 16 }"
              :disabled="workspace.pending.value"
              :placeholder="t('networkFirewall.pasteHelp')"
              :textarea-attrs="{ 'aria-label': t('networkFirewall.paste') }"
            />
            <p class="fw-muted">{{ t('networkFirewall.columnHelp') }}</p>
            <div class="fw-grid fw-section"><label
              v-for="field in ['source', 'destination', 'service', 'notes'] as const"
              :key="field"
            >{{ t(`networkFirewall.${field}`) }}<a-input-number
              v-if="input.columns"
              v-model="input.columns[field]"
              :min="0"
              :max="50"
              :precision="0"
              :disabled="workspace.pending.value"
            /></label></div>
          </template><template v-else>
            <section
              v-for="(row, index) in input.rows"
              :key="row.key"
              class="fw-row"
            >
              <div class="fw-grid"><label
                v-for="field in ['source', 'destination', 'service'] as const"
                :key="field"
              >{{ t(`networkFirewall.${field}`) }}<a-input
                v-model="row[field]"
                :disabled="workspace.pending.value"
                :input-attrs="{ 'aria-label': `${t(`networkFirewall.${field}`)} ${index + 1}` }"
              /></label></div>
              <div class="fw-inline"><a-input
                v-model="row.notes"
                :disabled="workspace.pending.value"
                :placeholder="t('networkFirewall.notes')"
                :input-attrs="{ 'aria-label': `${t('networkFirewall.notes')} ${index + 1}` }"
              /><a-button
                v-if="input.rows.length > 1"
                type="text"
                :disabled="workspace.pending.value"
                @click="input.rows.splice(index, 1)"
              >{{ t('networkFirewall.remove') }}</a-button></div>
            </section><a-button
              :disabled="input.rows.length >= options.limits.maxRows || workspace.pending.value"
              @click="addRow"
            >{{ t('networkFirewall.addRow') }}</a-button>
          </template>
          <p class="fw-muted">{{ t('networkFirewall.maxRows', { count: options.limits.maxRows }) }}</p><a-space wrap><a-button
            :loading="workspace.pending.value"
            @click="parse"
          >{{ t('networkFirewall.normalize') }}</a-button><a-button
            type="primary"
            :loading="workspace.pending.value"
            :disabled="!metadata.domainId || !metadata.title.trim()"
            @click="save"
          >{{ t('networkFirewall.saveRequest') }}</a-button><a-button
            v-if="saved"
            :disabled="dirty || workspace.pending.value || running(analysis?.status)"
            :loading="workspace.pending.value"
            @click="analyze"
          >{{ t('networkFirewall.analyze') }}</a-button><a-button
            v-if="saved"
            @click="load"
          >{{ t('networkFirewall.reload') }}</a-button></a-space>
          <p
            v-if="saved"
            class="fw-muted"
          >{{ t('networkFirewall.requestId') }}: {{ saved.id }} · {{ t('networkFirewall.requestVersion') }}: {{ saved.version }} <span
            v-if="dirty"
          >· {{ t('networkFirewall.requestChanged') }}</span></p>
        </a-card><a-card
          v-if="normalized"
          :title="t('networkFirewall.normalized')"
        ><a-alert
           v-if="normalizationStale"
           type="warning"
         >{{ t('networkFirewall.normalizationStale') }}</a-alert>
          <Notices :items="normalized.issues" />
          <section
            v-for="row in normalized.rows"
            :key="row.key"
            class="fw-row"
          >
            <p><strong>{{ row.key }}</strong> · {{ t('networkFirewall.line') }} {{ row.line }} ·
              <StateTag :value="row.status" />
            </p>
            <div class="fw-grid"><label
              v-for="field in ['source', 'destination', 'service'] as const"
              :key="field"
            >{{ t(`networkFirewall.${field}`) }}<a-input
              v-model="row[field]"
              :disabled="workspace.pending.value"
              :input-attrs="{ 'aria-label': `${t(`networkFirewall.${field}`)} ${row.key}` }"
              @update:model-value="correctRows"
            /></label></div>
            <p class="fw-muted">{{ t('networkFirewall.normalizedTerms') }}: {{ row.sources.map(term => term.value).join(', ') }} →
              {{ row.destinations.map(term => term.value).join(', ') }} · {{ row.services.map(term => term.value).join(', ') }}</p>
            <Notices
              :items="row.corrections"
              correction
            />
            <Notices :items="row.issues" />
          </section>
        </a-card><a-card
          v-if="analysis"
          :title="`${t('networkFirewall.result')} #${analysis.id}`"
        ><a-space wrap>
           <StateTag :value="analysis.status" /><span>v{{ analysis.requestVersion }} · {{ analysis.at }}</span><a-button
             :loading="workspace.loading.value"
             @click="refreshAnalysis"
           >{{ t('networkFirewall.refresh') }}</a-button><a-button
             v-if="running(analysis.status)"
             :loading="workspace.pending.value"
             @click="cancel"
           >{{ t('networkFirewall.cancel') }}</a-button><a-button
             v-if="workspace.allowed('design') && !running(analysis.status) && ['succeeded', 'partial'].includes(analysis.status)"
             type="primary"
             :disabled="analysis.stale || dirty"
             :loading="workspace.pending.value"
             @click="createDraft"
           >{{ t('networkFirewall.createDraft') }}</a-button>
         </a-space><a-alert
           v-if="analysis.stale"
           type="warning"
           class="fw-section"
         >{{ t('networkFirewall.stale') }}</a-alert><a-alert
           v-if="analysis.errorCode"
           type="warning"
         >{{ analysis.errorCode }}</a-alert>
          <Results
            v-if="analysis.result"
            :result="analysis.result"
          />
        </a-card></div>
      </AsideLayout>
    </template>
  </PageContainer>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PageContainer from '@/components/PageContainer/index.vue'
import AppTabs from '@/components/AppTabs/index.vue'
import { useTable } from '@/composables/useTable'
import * as api from '@/api/network/firewall'
import type { Analysis, Input, Normalized, Options, SavedRequest } from '@/types/firewall'
import AsideLayout from '@/components/AsideLayout/index.vue'
import NavList from '@/components/NavList/index.vue'
import SectionNav from './section-nav.vue'
import Results from './results.vue'
import Notices from './notices.vue'
import StateTag from './state-tag.vue'
import { correctedInput, createIntentKey, positiveId, requestKey, running } from './presentation'
import { usePolling, useWorkspace } from './workspace'
import './style.scss'
defineOptions({ name: 'NetworkFirewallQuery' })
const { t } = useI18n(); const route = useRoute(); const router = useRouter(); const workspace = useWorkspace(); const requestId = computed(() => positiveId(route.query.request)); const analysisId = computed(() => positiveId(route.query.analysis))
const metadata = reactive({ title: '', domainId: 0 }); const input = ref<Input>(emptyInput()); const inputMode = ref('individual'); const normalized = ref<Normalized>(); const saved = ref<SavedRequest>(); const analysis = ref<Analysis>(); const savedSignature = ref(''); const normalizedSignature = ref('')
const options = ref<Options>({ domains: [], vendors: [], limits: { maxRows: 200, maxDesignRows: 50, maxFileBytes: 10485760 }, defaultProtocol: 'tcp' })
function emptyInput(): Input { return { defaultProtocol: 'tcp', rows: [{ key: requestKey(), source: '', destination: '', service: '', notes: '' }], text: '', columns: { source: 0, destination: 1, service: 2, notes: 3 }} }
function payload() { return { title: metadata.title, domainId: metadata.domainId, input: inputMode.value === 'paste' ? { rows: [], text: input.value.text || '', columns: input.value.columns, defaultProtocol: 'tcp' } : { rows: input.value.rows.map(row => ({ ...row })), defaultProtocol: 'tcp' }} }
const analysisKey = createIntentKey(); const draftKey = createIntentKey()
const normalizationStale = computed(() => !!normalized.value && normalizedSignature.value !== JSON.stringify(payload().input))
const dirty = computed(() => !saved.value || JSON.stringify(payload()) !== savedSignature.value)
const requests = useTable<SavedRequest>({ api: query => workspace.allowed('query') ? workspace.guard(signal => api.listRequests(query, signal)) : Promise.reject(), immediate: false, idKey: 'id', pageSize: 10, onError: () => { if (workspace.current()) workspace.failed.value = true } })
const analyses = useTable<Analysis>({ api: query => requestId.value ? workspace.guard(signal => api.listAnalyses(requestId.value!, query, signal)) : Promise.resolve({ code: 200, msg: '', data: { list: [], count: 0 }}), immediate: false, idKey: 'id', pageSize: 10, onError: () => { if (workspace.current()) workspace.failed.value = true } })
function navigate(query: Record<string, number | undefined>) { void router.push({ query: { ...route.query, ...query }}) }
function apply(value: SavedRequest) { saved.value = value; metadata.title = value.title; metadata.domainId = value.domainId; input.value = { ...value.input, rows: value.input.rows || [], columns: value.input.columns || { source: 0, destination: 1, service: 2, notes: 3 }}; inputMode.value = value.input.text ? 'paste' : 'individual'; normalized.value = value.normalized; normalizedSignature.value = JSON.stringify(payload().input); savedSignature.value = JSON.stringify(payload()) }
async function load() { if (!workspace.allowed('query')) return; const id = requestId.value; await workspace.read(async signal => Promise.all([api.getOptions(signal), id ? api.getRequest(id, signal) : Promise.resolve(undefined), analysisId.value ? api.getAnalysis(analysisId.value, signal) : Promise.resolve(undefined)]), ([config, request, result]) => { options.value = config.data; if (!metadata.domainId) metadata.domainId = config.data.domains[0]?.id || 0; if (request) apply(request.data); if (result) applyAnalysis(result.data) }); if (workspace.current()) { await requests.getList(); if (id) await analyses.getList() } }
function applyAnalysis(value: Analysis) { if (requestId.value && value.requestId !== requestId.value) { analysis.value = undefined; workspace.failed.value = true; return }; analysis.value = value }
function addRow() { if (input.value.rows.length < options.value.limits.maxRows) input.value.rows.push({ key: requestKey(), source: '', destination: '', service: '', notes: '' }) }
function correctRows() { if (normalized.value) { input.value = correctedInput(normalized.value.rows); inputMode.value = 'individual' } }
function parse() { const submitted = payload().input; const signature = JSON.stringify(submitted); void workspace.write(() => api.normalize(submitted), value => { normalized.value = value.data; normalizedSignature.value = signature }) }
function save() { const value = payload(); const previous = saved.value; void workspace.write(() => previous ? api.updateRequest(previous.id, { ...value, version: previous.version }) : api.addRequest(value), result => { apply(result.data); navigate({ request: result.data.id, analysis: undefined }); analysis.value = undefined; void requests.getList() }) }
function analyze() { if (!saved.value || dirty.value || !workspace.allowed('query')) return; const id = saved.value.id; const version = saved.value.version; void workspace.write(() => api.addAnalysis(id, { version, requestKey: analysisKey.for(`${id}:${version}`) }), value => { analysisKey.accepted(); analysis.value = value.data; navigate({ analysis: value.data.id }); void analyses.getList() }) }
async function refreshAnalysis() { const id = analysisId.value; if (id) await workspace.read(signal => api.getAnalysis(id, signal), result => { applyAnalysis(result.data) }) }
function cancel() { if (analysis.value) void workspace.write(() => api.cancelAnalysis(analysis.value!.id), result => { analysis.value = result.data; void analyses.getList() }) }
function createDraft() { if (!analysis.value || analysis.value.stale || dirty.value || !workspace.allowed('design')) return; const id = analysis.value.id; void workspace.write(() => api.addDraft({ analysisId: id, title: metadata.title, requestKey: draftKey.for(`${id}:${metadata.title}`) }), result => { draftKey.accepted(); void router.push({ path: '/network/firewall/design', query: { draft: result.data.id }}) }) }
function newRequest() { workspace.invalidate(); saved.value = undefined; normalized.value = undefined; analysis.value = undefined; input.value = emptyInput(); inputMode.value = 'individual'; metadata.title = ''; navigate({ request: undefined, analysis: undefined }) }
function selectRequest(id: number) { workspace.invalidate(); void router.push({ query: { ...route.query, request: id, analysis: undefined }}).then(() => { if (workspace.current() && requestId.value === id) void load() }) }
watch(() => [requestId.value, analysisId.value] as const, ([request, selectedAnalysis], [previousRequest]) => { workspace.invalidate(); if (request !== previousRequest) { analysis.value = undefined; if (request) void load() } else if (selectedAnalysis) void refreshAnalysis(); else analysis.value = undefined })
usePolling(refreshAnalysis, () => running(analysis.value?.status)); onMounted(load)
</script>
