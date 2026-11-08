<template>
  <PageContainer class="fw-page fw-design-page">
    <Heading /><a-alert
      v-if="!workspace.allowed('design')"
      type="warning"
    >{{ t('networkFirewall.readRequired') }}</a-alert><template v-else><a-alert
                                                                         v-if="workspace.failed.value"
                                                                         type="warning"
                                                                       >{{ t('networkFirewall.loadFailed') }}<template #action><a-button
                                                                         @click="load"
                                                                       >{{ t('networkFirewall.retry') }}</a-button></template></a-alert>
      <div class="fw-layout">
        <aside class="fw-sidebar"><a-card :title="t('networkFirewall.drafts')"><a-button
          @click="drafts.getList"
        >{{ t('networkFirewall.refresh') }}</a-button><a-button
          v-for="item in drafts.rows"
          :key="item.id"
          class="fw-list-button"
          :type="draftId === item.id ? 'primary' : 'text'"
          @click="select(item.id)"
        >{{ item.title || `#${item.id}` }}<br>
          <StateTag :value="item.status" />
        </a-button><a-pagination
          simple
          :total="drafts.total"
          :current="drafts.query.pageIndex"
          :page-size="drafts.query.pageSize"
          @change="pageIndex => drafts.handlePagination({ page: pageIndex, limit: drafts.query.pageSize })"
        /></a-card></aside>
        <main class="fw-main"><a-card
          v-if="draft"
          :title="`${t('networkFirewall.draftDetail')} #${draft.id}`"
        >
          <div class="fw-toolbar">
            <StateTag :value="draft.status" /><span>v{{ draft.version }}</span><a-button
              @click="load"
            >{{ t('networkFirewall.reload') }}</a-button><a-button
              type="primary"
              :disabled="workspace.pending.value || running(draft.status) || dirty"
              :loading="workspace.pending.value"
              @click="reanalyze"
            >{{ t('networkFirewall.reanalyze') }}</a-button><a-button
              v-if="workspace.allowed('query')"
              type="text"
              @click="router.push({ path: '/network/firewall/query', query: { request: draft.requestId, analysis: draft.analysisId }})"
            >{{ t('networkFirewall.queryOrigin') }}</a-button>
          </div><a-alert
            v-if="draft.stale"
            type="warning"
          >{{ t('networkFirewall.stale') }}</a-alert>
          <p class="fw-muted">{{ t('networkFirewall.readOnlyDraft') }}</p><a-form
            :model="metadata"
            layout="vertical"
          ><a-form-item :label="t('networkFirewall.titleField')"><a-input
            v-model="metadata.title"
            :disabled="workspace.pending.value"
            :input-attrs="{ 'aria-label': t('networkFirewall.titleField') }"
          /></a-form-item><a-form-item :label="t('networkFirewall.notes')"><a-textarea
            v-model="metadata.notes"
            :disabled="workspace.pending.value"
            :textarea-attrs="{ 'aria-label': t('networkFirewall.notes') }"
          /></a-form-item><a-button
            :loading="workspace.pending.value"
            :disabled="!dirty || !metadata.title.trim()"
            @click="save"
          >{{ t('networkFirewall.save') }}</a-button></a-form><a-descriptions
            :column="narrow ? 1 : 2"
            class="fw-section"
            bordered
          ><a-descriptions-item :label="t('networkFirewall.requestId')">{{ draft.requestId }}</a-descriptions-item><a-descriptions-item
            :label="t('networkFirewall.analysisId')"
          >{{ draft.analysisId }}</a-descriptions-item><a-descriptions-item
            :label="t('networkFirewall.createdAt')"
          >{{ draft.result?.at }}</a-descriptions-item><a-descriptions-item
            :label="t('networkFirewall.completeResult')"
          >{{ yes(draft.result?.complete) }}</a-descriptions-item></a-descriptions><a-card
            v-for="(item, index) in draft.result?.items || []"
            :key="`${item.instanceId}-${index}`"
            class="fw-section"
          >
            <div class="fw-section-title">
              <h3>{{ t('networkFirewall.instance') }} #{{ item.instanceId }}</h3>
              <StateTag :value="item.status" />
            </div><a-descriptions
              bordered
              :column="1"
            ><a-descriptions-item :label="t('networkFirewall.revision')">{{ item.revision }}</a-descriptions-item><a-descriptions-item
              :label="t('networkFirewall.bindingVersion')"
            >{{ item.settingsVersion }}</a-descriptions-item><a-descriptions-item
              :label="t('networkFirewall.line')"
            >{{ item.rowKeys?.join(', ') }}</a-descriptions-item><a-descriptions-item
              :label="t('networkFirewall.baseDigest')"
            >{{ item.baseDigest || '—' }}</a-descriptions-item><a-descriptions-item
              :label="t('networkFirewall.resultDigest')"
            >{{ item.resultDigest || '—' }}</a-descriptions-item></a-descriptions>
            <section class="fw-section">
              <h3>{{ t('networkFirewall.proof') }}</h3><a-space wrap><a-tag
                v-for="field in ['targetSatisfied', 'outsidePreserved', 'natUnchanged'] as const"
                :key="field"
                :color="item[field] ? 'green' : 'orange'"
              >{{ t(`networkFirewall.${field}`) }}: {{ yes(item[field]) }}</a-tag></a-space>
            </section>
            <Notices :items="item.issues" />
            <section class="fw-section">
              <h3>{{ t('networkFirewall.changes') }}</h3>
              <p
                v-if="!item.changes?.length"
                class="fw-muted"
              >{{ t('networkFirewall.noChanges') }}</p>
              <div
                v-for="(change, changeIndex) in item.changes"
                :key="changeIndex"
                class="fw-row"
              >
                <p><strong>{{ change.kind }}</strong> · {{ t('networkFirewall.ruleId') }}: {{ change.ruleId || '—' }}</p>
                <p>{{ change.description }}</p>
                <dl
                  v-if="change.data"
                  class="fw-definition"
                ><template
                  v-for="field in visibleFields(change.data)"
                  :key="field.name"
                >
                  <dt>{{ field.name }}</dt>
                  <dd>{{ field.value }}</dd>
                </template></dl>
              </div>
            </section>
          </a-card>
        </a-card><a-card
          v-else
          :loading="workspace.loading.value"
        ><a-empty :description="t('networkFirewall.selectDraft')" /></a-card></main>
      </div>
    </template>
  </PageContainer>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PageContainer from '@/components/PageContainer/index.vue'
import { useTable } from '@/composables/useTable'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import * as api from '@/api/network/firewall'
import type { Draft } from '@/types/firewall'
import Heading from './heading.vue'
import Notices from './notices.vue'
import StateTag from './state-tag.vue'
import { createIntentKey, positiveId, running, visibleFields } from './presentation'
import { usePolling, useWorkspace } from './workspace'
import './style.scss'
defineOptions({ name: 'NetworkFirewallDesign' })
const { t } = useI18n(); const route = useRoute(); const router = useRouter(); const workspace = useWorkspace(); const narrow = useNarrowScreen(); const draftId = computed(() => positiveId(route.query.draft)); const draft = ref<Draft>(); const metadata = reactive({ title: '', notes: '' }); const yes = (value?: boolean) => t(value ? 'networkFirewall.yes' : 'networkFirewall.no')
const reanalysisKey = createIntentKey()
const dirty = computed(() => !!draft.value && (metadata.title !== draft.value.title || metadata.notes !== (draft.value.notes || '')))
const drafts = useTable<Draft>({ api: query => workspace.allowed('design') ? workspace.guard(signal => api.listDrafts(query, signal)) : Promise.reject(), immediate: false, idKey: 'id', pageSize: 10, onError: () => { if (workspace.current()) workspace.failed.value = true } })
function apply(value: Draft) { draft.value = value; metadata.title = value.title; metadata.notes = value.notes || '' }
async function load() { if (!workspace.allowed('design')) return; const id = draftId.value; if (id) await workspace.read(signal => api.getDraft(id, signal), result => { apply(result.data) }); if (workspace.current()) await drafts.getList() }
function select(id: number) { void router.push({ query: { ...route.query, draft: id }}) }
function save() { const item = draft.value; if (!item || !metadata.title.trim()) return; const payload = { version: item.version, title: metadata.title, notes: metadata.notes }; void workspace.write(() => api.updateDraft(item.id, payload), result => { apply(result.data); void drafts.getList() }) }
function reanalyze() { const item = draft.value; if (!item || dirty.value) return; void workspace.write(() => api.reanalyzeDraft(item.id, { version: item.version, requestKey: reanalysisKey.for(`${item.id}:${item.version}`) }), result => { reanalysisKey.accepted(); apply(result.data); select(result.data.id); void drafts.getList() }) }
async function refresh() { const id = draftId.value; if (id) await workspace.read(signal => api.getDraft(id, signal), result => { const preserve = dirty.value; const previous = { ...metadata }; apply(result.data); if (preserve) Object.assign(metadata, previous) }) }
watch(draftId, () => { workspace.invalidate(); draft.value = undefined; void load() }); usePolling(refresh, () => running(draft.value?.status)); onMounted(load)
</script>
