<template>
  <a-card class="fabric-detail" :bordered="false">
    <a-alert v-if="failed" type="warning">{{ t('networkFabric.refreshFailed') }}<template #action><a-button @click="load">{{ t('common.refresh') }}</a-button></template></a-alert>
    <a-alert v-if="tasks.failed.value" type="warning">{{ t('networkFabric.trackingFailed') }}<template #action><a-button @click="tasks.refresh">{{ t('common.refresh') }}</a-button></template></a-alert>
    <a-spin :loading="loading" style="width:100%">
      <template v-if="record">
        <div class="fabric-section-heading"><div><a-button type="text" @click="emit('close')">← {{ t('networkFabric.title') }}</a-button><h2>{{ record.code }}<template v-if="record.name && record.name !== record.code"> · {{ record.name }}</template></h2></div><a-space wrap><StateTag :value="record.state" /><a-button @click="load">{{ t('common.refresh') }}</a-button><a-button v-if="record.completeScope && (allowed('collect') || allowed('edit'))" @click="collectionVisible = true">{{ t('networkFabric.collect') }}</a-button></a-space></div>
        <a-alert v-if="!record.completeScope" type="warning">{{ t('networkFabric.partialScope') }}</a-alert>
        <AppTabs :active-key="tab" :scroll-position="narrow ? 'center' : 'auto'" @change="emit('tab', $event as FabricTab)">
          <a-tab-pane key="overview" :title="t(narrow ? 'networkFabric.shortTabs.overview' : 'networkFabric.overview')">
            <template v-if="!issueLocation.issue">
              <div class="fabric-facts">
                <div class="fabric-fact"><span>{{ t('networkFabric.members') }}</span><strong>{{ record.memberCount }}</strong></div>
                <div class="fabric-fact"><span>{{ t('networkFabric.leafCount') }}</span><strong>{{ record.leafCount }}</strong></div>
                <div class="fabric-fact"><span>{{ t('networkFabric.segments') }}</span><strong>{{ record.segments.length }}</strong></div>
                <div class="fabric-fact"><span>{{ t('networkFabric.problem.title') }}</span><strong>{{ record.issueCount }}</strong></div>
              </div>
              <div class="fabric-overview-meta">
                <span>{{ t('networkFabric.coverage') }} <strong>{{ record.evidenceCoverage }}%</strong></span>
                <span>{{ t('networkFabric.unknownCount') }} <strong>{{ record.unknownCount }}</strong></span>
                <span>{{ t('networkFabric.observedAt') }} <DateCell :value="record.observedAt" /></span>
              </div>
            </template>
            <Issues
              :detail="record"
              :issue="issueLocation.issue"
              :status="issueLocation.status"
              :scope="issueLocation.scope"
              :can-remediate="allowed('preview')"
              @select="selectIssue"
              @status="setIssueFilter('issueStatus', $event)"
              @scope="setIssueFilter('issueScope', $event)"
              @device="openDevice"
              @segment="goFinding"
              @remediate="goRemediation"
              @evidence="inspect"
            />
            <a-collapse class="fabric-section">
              <a-collapse-item key="assessment" :header="t('networkFabric.problem.assessment')">
                <span>{{ t('networkFabric.ruleVersion') }}: {{ record.rulesVersion }}</span>
                <code class="fabric-secondary">{{ t('networkFabric.evidenceKey') }}: {{ record.evidenceKey }}</code>
              </a-collapse-item>
            </a-collapse>
          </a-tab-pane>
          <a-tab-pane key="nodes" :title="t(narrow ? 'networkFabric.shortTabs.nodes' : 'networkFabric.nodes')">
            <div class="fabric-action-bar">
              <label for="fabric-node-filter">{{ t('networkFabric.problem.filterDevice') }}</label>
              <a-select id="fabric-node-filter" :model-value="nodeFilter" :aria-label="t('networkFabric.problem.filterDevice')" @change="setIssueFilter('nodeStatus', $event as string)">
                <a-option value="">{{ t('networkFabric.problem.allDevices') }}</a-option>
                <a-option value="affected">{{ t('networkFabric.problem.statuses.affected') }}</a-option>
                <a-option value="unknown">{{ t('networkFabric.problem.statuses.unknown') }}</a-option>
              </a-select>
            </div>
            <a-table v-if="!narrow" :data="filteredNodes" row-key="deviceId" :pagination="{ pageSize: 15, hideOnSinglePage: true }" :scroll="{ x: 1000 }">
              <template #columns>
                <a-table-column :title="t('networkFabric.device')" :width="210">
                  <template #cell="{ record: node }">
                    <a-button type="text" @click="inspectNode(node)">{{ node.name }}</a-button>
                    <span class="fabric-secondary">{{ node.ip }}</span>
                  </template>
                </a-table-column>
                <a-table-column :title="t('networkFabric.problem.title')" :width="140">
                  <template #cell="{ record: node }">
                    <a-button type="text" @click="inspectNode(node)">{{ t('networkFabric.problem.title') }} {{ deviceIssues(record.issueGroups || [], node.deviceId).length }}</a-button>
                  </template>
                </a-table-column>
                <a-table-column :title="t('networkFabric.state')" :width="100">
                  <template #cell="{ record: node }"><StateTag :value="node.state" /></template>
                </a-table-column>
                <a-table-column :title="t('networkFabric.role')" data-index="role" :width="130">
                  <template #cell="{ record: node }">{{ roleName(node.role) }}</template>
                </a-table-column>
                <a-table-column :title="t('networkFabric.vtep')" data-index="vtep" :width="150" />
                <a-table-column :title="t('networkFabric.domain')" data-index="vpcDomain" :width="110" />
                <a-table-column :title="t('networkFabric.peer')" data-index="vpcPeer" :width="150" />
                <a-table-column :title="t('networkFabric.dimensions')" :width="110">
                  <template #cell="{ record: node }"><a-button @click="inspectNode(node)">{{ t('networkFabric.evidence') }}</a-button></template>
                </a-table-column>
              </template>
            </a-table>
            <template v-else>
              <div v-for="node in filteredNodes" :key="node.deviceId" class="fabric-mobile-cell">
                <div><strong>{{ node.name }}</strong><span class="fabric-secondary">{{ node.ip }} · {{ roleName(node.role) }}</span><StateTag :value="node.state" /></div>
                <a-button @click="inspectNode(node)">{{ t('networkFabric.problem.title') }} {{ deviceIssues(record.issueGroups || [], node.deviceId).length }}</a-button>
              </div>
            </template>
            <section class="fabric-section"><h2>vPC</h2><a-empty v-if="!record.vpcGroups.length" :description="t('common.empty')" /><div v-for="group in record.vpcGroups" :key="group.key" class="fabric-mobile-cell"><div><strong>{{ group.domain || group.key }}</strong><span class="fabric-secondary">{{ group.deviceIds.map(nodeName).join(' / ') }}</span></div><StateTag :value="group.state" /></div></section>
          </a-tab-pane>
          <a-tab-pane key="segments" :title="t(narrow ? 'networkFabric.shortTabs.segments' : 'networkFabric.segments')">
            <p class="fabric-hint">{{ t('networkFabric.matrixHelp') }}</p>
            <div v-if="!narrow" class="fabric-matrix"><table><thead><tr><th>{{ t('networkFabric.segment') }}</th><th v-for="node in leaves" :key="node.deviceId">{{ node.name }}<span class="fabric-secondary">{{ node.ip }}</span></th></tr></thead><tbody><tr v-for="segment in record.segments" :key="`${segment.vrf}:${segment.vni}`" :class="{ 'fabric-selected-segment': segment.vni === Number(route.query.vni) && segment.vrf === route.query.vrf }"><th>{{ segment.vrf || '—' }}<span class="fabric-secondary">VNI {{ segment.vni }}</span><StateTag :value="segment.state" /></th><td v-for="node in leaves" :key="node.deviceId"><template v-if="cell(segment, node.deviceId)"><a-button type="text" @click="inspect(cell(segment, node.deviceId))"><StateTag :value="cell(segment, node.deviceId)!.state" /></a-button><SegmentInfo :configuration="cell(segment, node.deviceId)?.configuration" /><span class="fabric-secondary">{{ t('networkFabric.aclIn') }}: {{ aclName(cell(segment, node.deviceId)!.aclIn) }}</span><span class="fabric-secondary">{{ t('networkFabric.aclOut') }}: {{ aclName(cell(segment, node.deviceId)!.aclOut) }}</span></template><StateTag v-else value="unknown" /></td></tr></tbody></table></div>
            <template v-else><article v-for="segment in record.segments" :key="`${segment.vrf}:${segment.vni}`" class="fabric-mobile-segment"><h2>{{ segment.vrf || '—' }} · VNI {{ segment.vni }}</h2><StateTag :value="segment.state" /><div v-for="node in leaves" :key="node.deviceId" class="fabric-mobile-cell"><div><strong>{{ node.name }}</strong><SegmentInfo :configuration="cell(segment, node.deviceId)?.configuration" /><span class="fabric-secondary">{{ t('networkFabric.aclIn') }}: {{ aclName(cell(segment, node.deviceId)?.aclIn) }}</span><span class="fabric-secondary">{{ t('networkFabric.aclOut') }}: {{ aclName(cell(segment, node.deviceId)?.aclOut) }}</span></div><a-button @click="inspect(cell(segment, node.deviceId) || { state: 'unknown', deviceId: node.deviceId })"><StateTag :value="cell(segment, node.deviceId)?.state || 'unknown'" /></a-button></div></article></template>
            <a-empty v-if="!record.segments.length" :description="t('networkFabric.empty')" />
          </a-tab-pane>
          <a-tab-pane key="endpoints" :title="t(narrow ? 'networkFabric.shortTabs.endpoints' : 'networkFabric.endpoints')"><Endpoints v-if="tab === 'endpoints'" :fabric-id="id" :can-open="true" /></a-tab-pane>
          <a-tab-pane key="changes" :title="t(narrow ? 'networkFabric.shortTabs.changes' : 'networkFabric.changes')">
            <div v-if="selectedIssue" class="fabric-action-bar">
              <a-button @click="selectIssue(selectedIssue.key)">{{ t(selectedIssue.completeScope ? 'networkFabric.problem.returnDomain' : 'networkFabric.problem.returnVisible') }}</a-button>
            </div>
            <Changes
              v-if="tab === 'changes' && record.completeScope"
              :fabric="record"
              :initial-vni="Number(route.query.vni) || undefined"
              :initial-targets="changeLocation.targets"
              :initial-kind="changeLocation.kind"
              :initial-direction="changeLocation.direction"
              @changed="load"
            />
          </a-tab-pane>
        </AppTabs>
      </template>
      <a-empty v-else-if="!loading && !failed" :description="t('common.empty')" />
    </a-spin>
    <CollectionPanel v-if="record?.completeScope && collectionVisible" v-model:visible="collectionVisible" :fabric="record" @changed="load" />
    <AppDrawer :visible="evidenceVisible" :title="t('networkFabric.evidence')" :width="narrow ? '100%' : 760" :footer="false" @update:visible="setEvidenceVisible">
      <template v-if="selectedNode">
        <div class="fabric-section-heading">
          <div><span class="fabric-secondary">{{ record?.code }} / {{ t('networkFabric.problem.investigate') }}</span><h2>{{ selectedNode.name }}</h2></div>
          <a-button v-if="selectedIssue" @click="selectIssue(selectedIssue.key)">{{ t(selectedIssue.completeScope ? 'networkFabric.problem.returnDomain' : 'networkFabric.problem.returnVisible') }}</a-button>
        </div>
        <section class="fabric-node-issues">
          <h3>{{ t('networkFabric.problem.deviceIssues') }}</h3>
          <p class="fabric-hint">{{ t('networkFabric.problem.deviceHelp') }}</p>
          <a-empty v-if="!ownIssues.length" :description="t('networkFabric.problem.noDeviceIssues')" />
          <article v-for="group in ownIssues" :key="group.key" class="fabric-mobile-cell">
            <div>
              <strong>{{ groupTitle(group) }}</strong>
              <span class="fabric-secondary">{{ scopeLabel(group) }}</span>
              <a-tag :color="nodeOutcome(group)?.status === 'affected' ? 'red' : 'orange'">{{ statusLabel(nodeOutcome(group)?.status) }}</a-tag>
            </div>
            <a-button @click="selectIssue(group.key)">{{ t('networkFabric.problem.sameProblem') }}</a-button>
          </article>
        </section>
        <NodeEvidence :node="selectedNode" />
      </template>
      <pre v-else class="fabric-code">{{ pretty(evidenceValue) }}</pre>
    </AppDrawer>
  </a-card>
</template>
<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppTabs from '@/components/AppTabs/index.vue'
import AppDrawer from '@/components/AppDrawer/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { useUserStore } from '@/stores/user'
import type { Node, Segment, Remediation, IssueGroup } from '@/types/network-fabric'
import type { FabricTab } from './presentation'
import { pretty, parseChangeLocation, parseIssueLocation, deviceIssues } from './presentation'
import StateTag from './state-tag.vue'
import Endpoints from './endpoints.vue'
import Changes from './changes.vue'
import SegmentInfo from './segment-info.vue'
import NodeEvidence from './node-evidence.vue'
import CollectionPanel from './collection.vue'
import Issues from './issues.vue'
import { useFabricTasks } from './use-tasks'
import { useFabricDetail } from './use-detail'
import { useIssueLabels } from './use-issue-labels'
defineOptions({ name: 'FabricDetail' })
const props = defineProps<{ id: number, tab: FabricTab }>()
const emit = defineEmits<{ tab: [tab: FabricTab], close: [] }>()
const { t, te } = useI18n()
const { groupTitle, scopeLabel, statusLabel } = useIssueLabels()
const roleName = (role: string) => te(`network.device.roleValues.${role}`) ? t(`network.device.roleValues.${role}`) : role
const user = useUserStore()
const route = useRoute()
const changeLocation = computed(() => parseChangeLocation(route.query))
const issueLocation = computed(() => parseIssueLocation(route.query))
const router = useRouter()
const narrow = useNarrowScreen()
const { record, loading, failed, load } = useFabricDetail(() => props.id)
const tasks = useFabricTasks(() => props.id, load, () => Boolean(record.value?.id === props.id && record.value.completeScope && user.permisaction.some(value => value === '*:*:*' || ['query', 'edit', 'collect', 'preview', 'execute'].some(action => value === `network:fabric:${action}`))))
provide('fabricTasks', tasks)
provide('refreshFabric', load)
const collectionVisible = ref(false)
const evidenceVisible = ref(false)
const evidenceValue = ref<unknown>()
const selectedNode = computed(() => record.value?.nodes.find(node => node.deviceId === issueLocation.value.device))
const selectedIssue = computed(() => record.value?.issueGroups?.find(group => group.key === issueLocation.value.issue))
const ownIssues = computed(() => selectedNode.value ? deviceIssues(record.value?.issueGroups || [], selectedNode.value.deviceId) : [])
const nodeOutcome = (group: IssueGroup) => group.devices.find(item => item.deviceId === selectedNode.value?.deviceId)
const nodeFilter = computed(() => ['affected', 'unknown'].includes(route.query.nodeStatus as string) ? route.query.nodeStatus as string : '')
const filteredNodes = computed(() => record.value?.nodes.filter(node => !nodeFilter.value || record.value?.issueGroups?.some(group => group.devices.some(device => device.deviceId === node.deviceId && device.status === nodeFilter.value))) || [])
const allowed = (action: string) => user.permisaction.some(value => value === '*:*:*' || value === `network:fabric:${action}`)
const leaves = computed(() => record.value?.nodes.filter(node => ['leaf', 'leaf_switch', 'LEF'].includes(node.role)) || [])
const nodeName = (id?: number) => record.value?.nodes.find(node => node.deviceId === id)?.name || (id ? `#${id}` : '')
const aclName = (name?: string) => !name || name === 'unbound' ? t('networkFabric.unbound') : name
const cell = (segment: Segment, id: number) => segment.cells.find(item => item.deviceId === id)
function goRemediation(remediation: Remediation) {
  void router.push({ query: { ...route.query, device: undefined, tab: 'changes', vni: remediation.vni, kind: remediation.kind, direction: remediation.direction, vrf: selectedIssue.value?.vrf, targets: remediation.targetDeviceIds.join(',') }})
}
function goFinding(group: IssueGroup) { void router.push({ query: { ...route.query, device: undefined, vni: group.vni, vrf: group.vrf, direction: group.direction, tab: 'segments' }}) }
function selectIssue(key?: string) { void router.push({ query: { ...route.query, tab: 'overview', issue: key, device: undefined, issueStatus: key === issueLocation.value.issue ? route.query.issueStatus : undefined }}) }
function setIssueFilter(key: string, value: string) { void router.push({ query: { ...route.query, [key]: value || undefined }}) }
function openDevice(id: number) { void router.push({ query: { ...route.query, device: id }}) }
function inspect(value: unknown) { evidenceValue.value = value; evidenceVisible.value = true }
function inspectNode(node: Node) { openDevice(node.deviceId) }
function setEvidenceVisible(visible: boolean) {
  evidenceVisible.value = visible
  if (!visible && route.query.device) void router.replace({ query: { ...route.query, device: undefined }})
}
watch(selectedNode, node => { evidenceVisible.value = Boolean(node) })
watch(() => user.token, () => { evidenceVisible.value = false; evidenceValue.value = undefined; collectionVisible.value = false }, { flush: 'sync' })
</script>
