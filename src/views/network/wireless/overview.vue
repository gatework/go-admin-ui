<template>
  <section>
    <a-space v-if="issue" wrap class="wireless-breadcrumb"><a-button @click="$emit('issue', '')">{{ t('networkWireless.tabs.overview') }}</a-button><span>{{ t('networkWireless.issue') }}</span></a-space>
    <template v-if="selected">
      <div class="wireless-section-title"><div><h2>{{ label('checks', selected.check) }}</h2><p class="wireless-muted">{{ [selected.ssid, selected.band].filter(Boolean).join(' · ') || t('networkWireless.all') }}</p></div><a-button v-if="canCollect" @click="$emit('collect', selected.suggestion)">{{ t('networkWireless.collectIssue') }}</a-button></div>
      <div class="wireless-outcomes"><a-button v-for="status in statuses" :key="status" :type="filter === status ? 'primary' : 'secondary'" @click="filter = filter === status ? '' : status">{{ t(`networkWireless.states.${status}`) }} {{ selected[status] }}</a-button></div>
      <div v-for="outcome in selected.outcomes.filter(row => !filter || row.status === filter)" :key="outcome.resourceId" class="wireless-issue-row"><div><strong>{{ outcome.apName || outcome.resourceId }}</strong><p class="wireless-muted">{{ label('reasons', outcome.reason) }}</p></div><StateTag :value="outcome.status" /><a-button type="text" @click="$emit('inspect', outcome)">{{ t('networkWireless.inspect') }}</a-button></div>
    </template>
    <a-alert v-else-if="issue" type="info">{{ t('networkWireless.noOutcomes') }}</a-alert>
    <template v-else>
      <div class="wireless-stats"><div v-for="kind in ['access_points', 'radios', 'bsses', 'clients']" :key="kind"><span>{{ label('dimension', kind) }}</span><strong>{{ controller.counts[kind] ?? 0 }}</strong></div></div>
      <h2>{{ t('networkWireless.problems') }}</h2><a-empty v-if="!analysis.groups.length" :description="t('networkWireless.noProblems')" />
      <div v-for="group in analysis.groups" :key="group.key" class="wireless-issue-row"><div><strong>{{ label('checks', group.check) }}</strong><p class="wireless-muted">{{ [group.ssid, group.band].filter(Boolean).join(' · ') || t('networkWireless.all') }}</p></div><div class="wireless-counts"><span v-for="status in statuses" :key="status">{{ t(`networkWireless.states.${status}`) }} <b>{{ group[status] }}</b></span></div><a-button type="text" @click="$emit('issue', group.key)">{{ t('networkWireless.viewIssue') }}</a-button></div>
      <div class="wireless-grid">
        <section><h2>{{ t('networkWireless.evidence') }}</h2><div v-for="entry in controller.coverage" :key="entry.name" class="wireless-evidence-row"><div><strong>{{ label('dimension', entry.name) }}</strong><p class="wireless-muted">{{ label('reasons', entry.reason) }}</p><DateCell :value="entry.observedAt" /><p v-if="entry.lastCompleteAt" class="wireless-muted">{{ t('networkWireless.lastComplete') }} <DateCell :value="entry.lastCompleteAt" /></p></div><StateTag :value="entry.status" /></div></section>
        <section><h2>{{ t('networkWireless.distribution') }}</h2><p class="wireless-muted">{{ t('networkWireless.distributionHint') }}</p><div v-for="item in analysis.ssids" :key="item.ssid" class="wireless-evidence-row"><span>{{ item.ssid || '—' }}</span><strong>{{ item.count }}</strong></div><a-empty v-if="!analysis.ssids.length" /></section>
      </div>
      <a-collapse v-if="Object.keys(controller.candidates || {}).length"><a-collapse-item key="candidates" :header="t('networkWireless.partialCandidates')"><p>{{ t('networkWireless.candidateHint') }}</p><div v-for="(rows, kind) in controller.candidates" :key="kind"><h3>{{ label('dimension', String(kind)) }}</h3><div v-for="(row, i) in rows" :key="i" class="wireless-evidence-row"><span>{{ row.name || row.apName }} · {{ row.ip || row.mac }}</span><span>{{ row.status || '—' }}</span></div></div></a-collapse-item></a-collapse>
    </template>
  </section>
</template>
<script setup lang="ts">
defineOptions({ name: 'WirelessOverview' })
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DateCell from '@/components/DateCell/index.vue'
import type { Analysis, Controller, IssueOutcome, Outcome, Suggestion } from '@/types/network-wireless'
import StateTag from './state-tag.vue'
const props = defineProps<{ controller: Controller, analysis: Analysis, issue: string, canCollect: boolean }>()
defineEmits<{ issue: [key: string], inspect: [outcome: IssueOutcome], collect: [suggestion: Suggestion] }>()
const { t, te } = useI18n()
const label = (group: string, value: string) => value && te(`networkWireless.${group}.${value}`) ? t(`networkWireless.${group}.${value}`) : value || '—'
const statuses: Outcome[] = ['affected', 'healthy', 'unknown', 'notApplicable']
const filter = ref<Outcome | ''>('')
const selected = computed(() => props.analysis.groups.find(group => group.key === props.issue))
watch(() => props.issue, () => { filter.value = '' })
</script>
