<template>
  <PageContainer class="wireless-page">
    <header class="wireless-heading"><div><h1>{{ t('networkWireless.title') }}</h1><p>{{ t('networkWireless.description') }}</p></div><a-space wrap><a-button v-if="narrow" @click="treeVisible = true">{{ t('networkWireless.groups') }}</a-button><a-button v-if="canRead" @click="locateVisible = true">{{ t('networkWireless.locate') }}</a-button><a-button @click="owner?.refresh()">{{ t('common.refresh') }}</a-button></a-space></header>
    <div class="wireless-workspace">
      <aside v-if="!narrow" class="wireless-navigation"><a-card><GroupPanel :labels="groupLabels" :data="groups" :selected="location.group" :loading="navigationLoading" :failed="navigationFailed" read-only @select="selectGroup" @refresh="owner?.refresh()" /><ControllerList /></a-card></aside>
      <main class="wireless-main">
        <a-alert v-if="failed" type="warning">{{ t('networkWireless.loadFailed') }}</a-alert>
        <a-card v-if="controller && analysis && canRead" class="wireless-detail">
          <div class="wireless-section-title"><div><h2>{{ controller.device.name }}</h2><p class="wireless-muted">{{ controller.device.ip }} · {{ controller.device.vendor }} · {{ controller.platform }}</p></div><a-space wrap><a-button v-if="allowed('export')" :loading="exporting" @click="template">{{ t('networkWireless.template') }}</a-button><a-button v-if="allowed('import')" @click="importVisible = true">{{ t('networkWireless.import') }}</a-button><a-button v-if="allowed('collect')" type="primary" :disabled="!controller.supportedDimensions.length || controller.device.status !== 'active'" @click="openCollection()">{{ t('networkWireless.collect') }}</a-button></a-space></div>
          <p class="wireless-muted">{{ t('networkWireless.scope') }} {{ t('networkWireless.refreshHint') }}</p>
          <AppTabs :active-key="location.tab" @change="setTab">
            <a-tab-pane v-for="tab in tabs" :key="tab" :title="t(`networkWireless.tabs.${tab}`)" />
          </AppTabs>
          <Overview v-if="location.tab === 'overview'" :controller="controller" :analysis="analysis" :issue="location.issue" :can-collect="allowed('collect')" @issue="setIssue" @inspect="inspectOutcome" @collect="openCollection" />
          <Jobs v-else-if="location.tab === 'jobs'" :key="location.controller" :controller="location.controller!" :refresh="revision" />
          <Resources v-else :key="`${location.controller}-${location.tab}`" :controller="location.controller" :kind="location.tab as Kind" :filters="{ keyword: location.keyword, ssid: location.ssid, band: location.band, ap: location.apFilter, vlan: location.vlan, status: location.status }" :refresh="revision" :can-export="allowed('export')" compact @inspect="inspect" @filters="setFilters" />
        </a-card>
        <a-card v-else :loading="loading"><a-empty :description="canRead ? t('networkWireless.selectController') : t('networkWireless.readRequired')" /></a-card>
      </main>
    </div>
    <AppDrawer v-model:visible="treeVisible" :title="t('networkWireless.groups')" :width="narrow ? '100%' : 380" :footer="false"><GroupPanel :labels="groupLabels" :data="groups" :selected="location.group" :loading="navigationLoading" :failed="navigationFailed" read-only @select="selectGroup" @refresh="owner?.refresh()" /><ControllerList /></AppDrawer>
    <AppDrawer :visible="!!location.ap && canRead" :title="t('networkWireless.detail')" :width="narrow ? '100%' : 800" :footer="false" @update:visible="value => { if (!value) closeAP() }"><APDetails
      v-if="apDetail && apDetail.resource.id === location.ap"
      :key="`${location.controller}-${location.ap}`"
      :data="apDetail"
      :can-edit="allowed('edit')"
      :can-collect="allowed('collect')"
      :issues="apIssues"
      :issue="location.issue"
      @saved="owner?.refresh()"
      @return-issue="closeAP"
      @issue="setIssue"
      @collect="openCollection"
    /><a-spin v-else :loading="loading"><a-empty /></a-spin></AppDrawer>
    <AppDrawer :visible="!!clientId && canRead" :title="t('networkWireless.clientDetail')" :width="narrow ? '100%' : 640" :footer="false" @update:visible="value => { if (!value) navigate({ client: undefined }) }"><template v-if="clientDetail"><h2>{{ clientDetail.fields.mac }}</h2><a-descriptions :column="1" bordered><a-descriptions-item v-for="field in ['ip', 'ipv6', 'apName', 'ssid', 'band', 'vlan', 'radioId', 'signal', 'snr'] as const" :key="field" :label="t(`networkWireless.${field === 'apName' ? 'ap' : field === 'radioId' ? 'radio' : field}`)">{{ clientDetail.fields[field] ?? '—' }}</a-descriptions-item></a-descriptions><p><StateTag :value="clientDetail.health" /> <DateCell :value="clientDetail.observedAt" /></p><a-button @click="inspectAPName(clientDetail!.fields.apName)">{{ t('networkWireless.detail') }}</a-button><a-button v-if="location.issue" @click="navigate({ client: undefined })">{{ t('networkWireless.returnIssue') }}</a-button></template></AppDrawer>
    <AppDrawer v-model:visible="collectVisible" :title="t('networkWireless.collect')" :width="narrow ? '100%' : 520" :footer="false"><CollectionForm v-if="collectVisible && controller && allowed('collect')" :controller="controller" :suggestion="suggestion" @created="created" /></AppDrawer>
    <AppDrawer v-model:visible="importVisible" :title="t('networkWireless.import')" :width="narrow ? '100%' : 620" :footer="false"><ImportForm v-if="importVisible && allowed('import')" @saved="imported" /></AppDrawer>
    <AppDrawer v-model:visible="locateVisible" :title="t('networkWireless.locate')" :width="narrow ? '100%' : 1050" :footer="false"><Resources v-if="locateVisible && canRead" kind="clients" compact @inspect="locate" /></AppDrawer>
  </PageContainer>
</template>
<script setup lang="ts">
import { computed, defineComponent, h, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { Button, Input, Pagination, Empty } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PageContainer from '@/components/PageContainer/index.vue'
import AppDrawer from '@/components/AppDrawer/index.vue'
import AppTabs from '@/components/AppTabs/index.vue'
import DateCell from '@/components/DateCell/index.vue'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import { useUserStore } from '@/stores/user'
import { msgSuccess } from '@/utils/message'
import { getGroups, listController, getController, getAnalysis, getAP, getClient, listResource, listCollection, getCollection, exportResource } from '@/api/network/wireless'
import type { Device, DeviceGroupTree } from '@/types/network'
import type { Controller, Analysis, APDetail, Kind, Resource, IssueOutcome, Suggestion, Collection, WirelessQuery } from '@/types/network-wireless'
import GroupPanel from '../device/groups/panel.vue'
import Resources from './resources.vue'
import Overview from './overview.vue'
import Jobs from './jobs.vue'
import APDetails from './ap-detail.vue'
import CollectionForm from './collection.vue'
import ImportForm from './import.vue'
import StateTag from './state-tag.vue'
import { createOwner } from './owner'
import { parseLocation, positive, tabs, downloadCSV } from './presentation'
import './style.scss'
defineOptions({ name: 'NetworkWirelessManage' })
const { t } = useI18n(); const route = useRoute(); const router = useRouter(); const user = useUserStore(); const narrow = useNarrowScreen()
const groupLabels = computed(() => ({ title: t('networkWireless.groups'), all: t('networkWireless.allControllers'), search: t('networkWireless.groupSearch'), countHelp: t('networkWireless.groupCountHelp') }))
const location = computed(() => parseLocation(route.query)); const clientId = computed(() => positive(route.query.client))
const allowed = (action: string) => user.permisaction.some(value => value === '*:*:*' || value === `network:wireless:${action}`)
const canRead = computed(() => ['query', 'collect', 'edit', 'import', 'export'].some(allowed))
const controller = ref<Controller>(); const analysis = ref<Analysis>(); const apDetail = ref<APDetail>(); const clientDetail = ref<Resource>()
const groups = ref<DeviceGroupTree>({ items: [], totalDeviceCount: 0, ungroupedDeviceCount: 0 }); const controllers = ref<Device[]>([]); const controllerCount = ref(0); const controllerPage = ref(1); const controllerSearch = ref('')
const loading = ref(false); const failed = ref(false); const navigationLoading = ref(false); const navigationFailed = ref(false); const revision = ref(0)
const treeVisible = ref(false); const collectVisible = ref(false); const importVisible = ref(false); const locateVisible = ref(false); const suggestion = ref<Suggestion>(); const exporting = ref(false)
const apIssues = computed(() => analysis.value?.groups.filter(group => group.outcomes.some(row => row.apName === apDetail.value?.resource.fields.name)) || [])
let owner: ReturnType<typeof createOwner> | undefined
let active = true; const account = user.token; let generation = 0
function navigate(query: Record<string, string | number | undefined>) { void router.push({ query: { ...route.query, ...query }}) }
function selectGroup(group?: number) { treeVisible.value = false; controllerPage.value = 1; navigate({ group, controller: undefined, ap: undefined, client: undefined, issue: undefined, tab: undefined, keyword: undefined, ssid: undefined, band: undefined, apFilter: undefined, vlan: undefined, status: undefined }) }
function selectController(id: number) { treeVisible.value = false; if (canRead.value) navigate({ controller: id, ap: undefined, client: undefined, issue: undefined, tab: 'overview', keyword: undefined, ssid: undefined, band: undefined, apFilter: undefined, vlan: undefined, status: undefined }) }
function setTab(tab: string | number) { navigate({ tab: String(tab), ap: undefined, client: undefined, keyword: undefined, ssid: undefined, band: undefined, apFilter: undefined, vlan: undefined, status: undefined }) }
function setIssue(issue: string) { navigate({ issue: issue || undefined, tab: 'overview', ap: undefined, client: undefined }) }
function setFilters(filters: WirelessQuery) {
  const next = { keyword: filters.keyword || undefined, ssid: filters.ssid || undefined, band: filters.band || undefined, apFilter: filters.ap || undefined, vlan: filters.vlan || undefined, status: filters.status || undefined }
  if (Object.entries(next).some(([key, value]) => route.query[key] !== value)) void router.replace({ query: { ...route.query, ...next }})
}
function closeAP() { navigate({ ap: undefined }) }
function inspect(row: Resource) { if (row.kind === 'access_points') navigate({ ap: row.id, client: undefined }); else if (row.kind === 'clients') navigate({ client: row.id, ap: undefined }); else void inspectAPName(row.fields.apName) }
function inspectOutcome(row: IssueOutcome) { if (row.kind === 'access_points') navigate({ ap: row.resourceId, client: undefined }); else if (row.kind === 'clients') navigate({ client: row.resourceId, ap: undefined }); else void inspectAPName(row.apName) }
async function inspectAPName(name: string) { const id = location.value.controller; const version = generation; if (!id || !name) return; try { const response = await listResource(id, 'access-points', { ap: name, exactAp: true, pageIndex: 1, pageSize: 2 }); if (active && generation === version && response.data.list.length === 1) navigate({ ap: response.data.list[0].id, client: undefined }) } catch { /* interceptor */ } }
function locate(row: Resource) { locateVisible.value = false; navigate({ controller: row.controllerId, client: row.id, ap: undefined, issue: undefined, tab: 'clients', keyword: row.fields.mac, ssid: undefined, band: undefined, apFilter: undefined, vlan: undefined, status: undefined }) }
function openCollection(value?: Suggestion) { suggestion.value = value; collectVisible.value = true }
function created(job: Collection) { collectVisible.value = false; owner?.accept(job); msgSuccess(t('networkWireless.requestQueued')); navigate({ tab: 'jobs', ap: undefined, client: undefined }); void owner?.refresh() }
function imported() { importVisible.value = false; msgSuccess(t('networkWireless.importSuccess')); void owner?.refresh() }
async function template() { if (!location.value.controller || exporting.value) return; const version = generation; exporting.value = true; try { const result = await exportResource(location.value.controller, 'management', {}); if (active && version === generation) downloadCSV(result.data, 'wireless-management.csv') } catch { /* interceptor */ } finally { if (version === generation) exporting.value = false } }
async function navigation(signal: AbortSignal) { navigationLoading.value = !controllers.value.length; try { const [g, c] = await Promise.all([getGroups(signal), listController({ groupId: location.value.group, keyword: controllerSearch.value, pageIndex: controllerPage.value, pageSize: 20 }, signal)]); if (signal.aborted) return; groups.value = g.data; controllers.value = c.data.list; controllerCount.value = c.data.count; navigationFailed.value = false } catch { if (!signal.aborted) navigationFailed.value = true } finally { if (!signal.aborted) navigationLoading.value = false } }
function setupOwner() {
  owner?.stop(); generation++; exporting.value = false
  if (!active || document.hidden || user.token !== account) return
  const id = location.value.controller
  owner = createOwner({
    read: async signal => {
      if (!id || !canRead.value) return
      loading.value = !controller.value
      const ap = location.value.ap; const client = clientId.value
      try { const [c, a, detail, clientResult] = await Promise.all([getController(id, signal), getAnalysis(id, signal), ap ? getAP(id, ap, signal) : undefined, client ? getClient(id, client, signal) : undefined]); if (signal.aborted) return; controller.value = c.data; analysis.value = a.data; if (ap === location.value.ap) apDetail.value = detail?.data; if (client === clientId.value) clientDetail.value = clientResult?.data; failed.value = false; revision.value++ } catch { if (!signal.aborted) failed.value = true } finally { if (!signal.aborted) loading.value = false }
    },
    discover: async signal => { await navigation(signal); if (!id || !canRead.value) return []; const result = await listCollection(id, { status: 'active', pageIndex: 1, pageSize: 200 }, signal); return result.data.list },
    track: async(job, signal) => (await getCollection(id!, job, signal)).data,
    changed: () => { revision.value++ }
  }); owner.start()
}
watch(() => [location.value.controller, location.value.group], () => { controller.value = undefined; analysis.value = undefined; apDetail.value = undefined; clientDetail.value = undefined; collectVisible.value = false; importVisible.value = false; setupOwner() })
watch(() => [location.value.ap, clientId.value], () => { apDetail.value = undefined; clientDetail.value = undefined; void owner?.refresh() })
function suspend() { active = false; owner?.stop(); generation++ }
function visibility() { if (document.hidden) { owner?.stop(); generation++ } else setupOwner() }
watch(() => user.token, () => { suspend(); controller.value = undefined; analysis.value = undefined; apDetail.value = undefined; clientDetail.value = undefined; controllers.value = []; collectVisible.value = false; importVisible.value = false; locateVisible.value = false }, { flush: 'sync' })
onMounted(() => { document.addEventListener('visibilitychange', visibility); setupOwner() })
onActivated(() => { if (!active && user.token === account) { active = true; setupOwner() } })
onDeactivated(suspend); onBeforeUnmount(() => { suspend(); document.removeEventListener('visibilitychange', visibility) })
const ControllerList = defineComponent({ setup: () => () => h('section', { class: 'wireless-controller-list' }, [h('h3', t('networkWireless.controllers')), h(Input, { modelValue: controllerSearch.value, allowClear: true, placeholder: t('networkWireless.keyword'), 'onUpdate:modelValue': (value: string) => { controllerSearch.value = value }, onPressEnter: () => { controllerPage.value = 1; setupOwner() } }), h(Button, { onClick: () => { controllerPage.value = 1; setupOwner() }, size: 'small' }, () => t('common.search')), ...controllers.value.map(d => h(Button, { long: true, type: d.id === location.value.controller ? 'primary' : 'text', onClick: () => selectController(d.id), class: 'wireless-controller' }, () => [h('strong', d.name), h('span', d.ip)])), !controllers.value.length && h(Empty, { description: t('networkWireless.emptyScope') }), h(Pagination, { total: controllerCount.value, current: controllerPage.value, pageSize: 20, simple: true, onChange: (page: number) => { controllerPage.value = page; setupOwner() } })]) })
</script>
