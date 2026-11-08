<template>
  <section class="fabric-issues">
    <template v-if="selected">
      <nav class="fabric-issue-breadcrumb" :aria-label="t('networkFabric.problem.navigation')">
        <a-button type="text" @click="emit('select', undefined)">{{ t('networkFabric.overview') }}</a-button>
        <span>/</span><span>{{ groupTitle(selected) }}</span>
      </nav>
      <div class="fabric-section-heading">
        <div>
          <h2>{{ groupTitle(selected) }}</h2>
          <p class="fabric-hint">{{ scopeLabel(selected) }}</p>
        </div>
        <a-space wrap>
          <a-button v-if="selected.vni && selected.scope !== 'fabric'" @click="emit('segment', selected)">{{ t('networkFabric.segments') }}</a-button>
          <a-button v-for="(remediation, index) in permittedRemediations" :key="index" @click="emit('remediate', remediation)">
            {{ t(`networkFabric.kinds.${remediation.kind}`) }}
          </a-button>
        </a-space>
      </div>
      <p class="fabric-hint">{{ t(selected.completeScope ? 'networkFabric.problem.domainHelp' : 'networkFabric.partialScope') }}</p>
      <div class="fabric-issue-counts" :aria-label="t('networkFabric.problem.comparison')">
        <button v-for="item in issueStatuses" :key="item" type="button" :aria-pressed="status === item" @click="emit('status', status === item ? '' : item)">
          <span>{{ statusLabel(item) }}</span>
          <strong>{{ count(selected, item) }}</strong>
        </button>
      </div>
      <div class="fabric-action-bar">
        <label for="fabric-issue-status">{{ t('networkFabric.problem.filterStatus') }}</label>
        <a-select id="fabric-issue-status" :model-value="status" :aria-label="t('networkFabric.problem.filterStatus')" @change="emit('status', $event as string)">
          <a-option value="">{{ t('networkFabric.problem.allStatuses') }}</a-option>
          <a-option v-for="item in issueStatuses" :key="item" :value="item">{{ statusLabel(item) }} ({{ count(selected, item) }})</a-option>
        </a-select>
        <span class="fabric-secondary">{{ t('networkFabric.problem.deviceTotal', { shown: comparison.length, total: selected.devices.length }) }}</span>
      </div>
      <div class="fabric-comparison" role="region" :aria-label="t('networkFabric.problem.comparison')">
        <a-empty v-if="!comparison.length" :description="t('networkFabric.problem.noMatch')" />
        <article v-for="device in comparison" :key="device.deviceId" class="fabric-comparison-row">
          <div class="fabric-comparison-device">
            <a-button type="text" @click="emit('device', device.deviceId)">{{ node(device.deviceId)?.name || `#${device.deviceId}` }}</a-button>
            <span class="fabric-secondary">{{ node(device.deviceId)?.ip }}</span>
          </div>
          <a-tag :color="statusColor(device.status)">{{ statusLabel(device.status) }}</a-tag>
          <div class="fabric-comparison-result">
            <strong>{{ reasonLabel(device.reason) }}</strong>
            <span v-if="device.value" class="fabric-secondary fabric-mono">{{ device.value }}</span>
            <span v-if="device.observedAt" class="fabric-secondary"><DateCell :value="device.observedAt" /></span>
          </div>
          <a-button @click="emit('device', device.deviceId)">{{ t('networkFabric.problem.investigate') }}</a-button>
        </article>
      </div>
      <a-collapse class="fabric-section">
        <a-collapse-item key="findings" :header="t('networkFabric.problem.supportingFindings', { count: selected.findingIndices.length })">
          <article v-for="index in selected.findingIndices" :key="index" class="fabric-mobile-cell">
            <div><strong>{{ detail.findings[index]?.message || detail.findings[index]?.code }}</strong><span class="fabric-secondary">{{ node(detail.findings[index]?.deviceId)?.name }}</span></div>
            <a-button @click="emit('evidence', detail.findings[index])">{{ t('networkFabric.evidence') }}</a-button>
          </article>
        </a-collapse-item>
      </a-collapse>
    </template>
    <template v-else>
      <a-alert v-if="issue" type="warning">{{ t('networkFabric.problem.changed') }}</a-alert>
      <div class="fabric-section-heading">
        <div><h2>{{ t('networkFabric.problem.title') }}</h2><p class="fabric-hint">{{ t('networkFabric.problem.help') }}</p></div>
        <span class="fabric-secondary">{{ t('networkFabric.problem.total', { count: groups.length, findings: detail.findingCount }) }}</span>
      </div>
      <div class="fabric-action-bar">
        <label for="fabric-issue-scope">{{ t('networkFabric.problem.filterScope') }}</label>
        <a-select id="fabric-issue-scope" :model-value="scope" :aria-label="t('networkFabric.problem.filterScope')" @change="emit('scope', $event as string)">
          <a-option value="">{{ t('networkFabric.problem.allScopes') }}</a-option>
          <a-option v-for="option in scopes" :key="option.value" :value="option.value">{{ option.label }}</a-option>
        </a-select>
      </div>
      <a-empty v-if="!filtered.length" :description="t(groups.length ? 'networkFabric.problem.noMatch' : 'networkFabric.problem.none')" />
      <article v-for="group in filtered" :key="group.key" class="fabric-issue-row">
        <div class="fabric-issue-name">
          <a-button type="text" @click="emit('select', group.key)">{{ groupTitle(group) }}</a-button>
          <span class="fabric-secondary">{{ scopeLabel(group) }}</span>
        </div>
        <div class="fabric-issue-totals">
          <span v-if="group.counts.affected" class="fabric-affected">{{ t('networkFabric.problem.affectedCount', { count: group.counts.affected }) }}</span>
          <span v-if="group.counts.unknown">{{ t('networkFabric.problem.unknownCount', { count: group.counts.unknown }) }}</span>
          <span>{{ t('networkFabric.problem.healthyCount', { count: group.counts.healthy }) }}</span>
        </div>
        <a-button @click="emit('select', group.key)">{{ t(group.completeScope ? 'networkFabric.problem.compare' : 'networkFabric.problem.compareVisible') }}</a-button>
      </article>
    </template>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DateCell from '@/components/DateCell/index.vue'
import type { FabricDetail, IssueGroup, IssueStatus, Remediation } from '@/types/network-fabric'
import { issueScope, issueStatuses } from './presentation'
import { useIssueLabels } from './use-issue-labels'

defineOptions({ name: 'FabricIssues' })
const props = defineProps<{ detail: FabricDetail, issue: string, status: string, scope: string, canRemediate: boolean }>()
const emit = defineEmits<{ select: [key: string | undefined], status: [status: string], scope: [scope: string], device: [id: number], segment: [group: IssueGroup], remediate: [remediation: Remediation], evidence: [value: unknown] }>()
const { t } = useI18n()
const { groupTitle, reasonLabel, scopeLabel, statusLabel } = useIssueLabels()
const groups = computed(() => props.detail.issueGroups || [])
const selected = computed(() => groups.value.find(group => group.key === props.issue))
const node = (id?: number) => props.detail.nodes.find(item => item.deviceId === id)
const count = (group: IssueGroup, status: IssueStatus) => status === 'not_applicable' ? group.counts.notApplicable : group.counts[status]
const statusColor = (status: IssueStatus) => ({ affected: 'red', healthy: 'green', unknown: 'orange', not_applicable: 'gray' }[status])
const scopes = computed(() => [...new Map(groups.value.map(group => [issueScope(group), { value: issueScope(group), label: scopeLabel(group) }])).values()])
const filtered = computed(() => groups.value.filter(group => !props.scope || issueScope(group) === props.scope))
const comparison = computed(() => selected.value?.devices.filter(device => !props.status || device.status === props.status) || [])
const permittedRemediations = computed(() => props.canRemediate && props.detail.completeScope && selected.value?.completeScope ? selected.value.remediations.filter(item => item.targetDeviceIds.length > 0) : [])
</script>
