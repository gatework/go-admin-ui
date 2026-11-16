<template>
  <div class="delivery-workbench delivery-group-workbench">
    <nav class="delivery-group-nav" :aria-label="t('networkDelivery.scriptGroups')">
      <div v-if="narrow" v-input-label="t('networkDelivery.scriptGroups')"><a-select v-model="activeKey"><a-option v-for="group in groups" :key="group.key" :value="group.key">{{ roleName(group, t) }} · {{ platformName(group.profile, t) }} · {{ group.targets.length }}</a-option></a-select></div>
      <template v-else><h3>{{ t('networkDelivery.scriptGroups') }}</h3><button v-for="group in groups" :key="group.key" type="button" class="delivery-target" :aria-pressed="activeKey === group.key" @click="activeKey = group.key"><strong>{{ roleName(group, t) }}</strong><span>{{ platformName(group.profile, t) }}</span><small :class="{ 'delivery-missing': missing(group) }">{{ t('networkDelivery.groupProgress', { done: group.targets.length - missing(group), count: group.targets.length }) }}</small></button></template>
    </nav>
    <section v-if="current" class="delivery-script">
      <div class="delivery-group-heading"><div><h3>{{ roleName(current, t) }}</h3><p>{{ platformName(current.profile, t) }} · {{ t('networkDelivery.deviceCount', { count: current.targets.length }) }}</p></div><a-tag v-if="individualCount" color="orange">{{ t('networkDelivery.individualCount', { count: individualCount }) }}</a-tag></div>
      <template v-if="review">
        <div v-input-label="t('networkDelivery.previewDevice')" class="delivery-preview-field"><span>{{ t('networkDelivery.previewDevice') }}</span><a-select v-model="targetId"><a-option v-for="target in current.targets" :key="target.deviceId" :value="target.deviceId">{{ deviceName(target.device) }} · {{ target.device.ip }} · {{ t(target.individual ? 'networkDelivery.individualScript' : 'networkDelivery.inheritedScript') }}</a-option></a-select></div>
        <template v-if="selectedTarget"><div class="delivery-script-heading"><strong>{{ deviceName(selectedTarget.device) }}</strong><span>{{ t('networkDelivery.lines', { count: scriptLines(selectedTarget.script) }) }}</span></div><pre class="delivery-code delivery-review-code" tabindex="0" :aria-label="t('networkDelivery.scriptFor', { name: deviceName(selectedTarget.device) })">{{ selectedTarget.script }}</pre></template>
      </template>
      <template v-else>
        <div v-if="selectedTarget" class="delivery-individual-heading"><a-button type="text" @click="targetId = undefined"><template #icon><icon-arrow-left /></template>{{ t('networkDelivery.backToGroup') }}</a-button><strong>{{ deviceName(selectedTarget.device) }} · {{ selectedTarget.device.ip }}</strong><a-button :disabled="disabled" @click="restore(selectedTarget)">{{ t('networkDelivery.restoreGroup') }}</a-button></div>
        <a-alert v-if="selectedTarget?.needsReview" type="warning" class="delivery-notice">{{ t('networkDelivery.groupChanged') }}<template #action><a-button :disabled="disabled" @click="selectedTarget.needsReview = false">{{ t('networkDelivery.confirmCompatibility') }}</a-button></template></a-alert>
        <p class="delivery-help">{{ t(selectedTarget ? 'networkDelivery.individualHelp' : 'networkDelivery.groupScriptHelp', { count: current.targets.length - individualCount }) }}</p>
        <a-textarea :model-value="selectedTarget ? selectedTarget.script : scripts[current.key] || ''" class="delivery-code-input" :textarea-attrs="{ 'aria-label': selectedTarget ? t('networkDelivery.scriptFor', { name: deviceName(selectedTarget.device) }) : t('networkDelivery.groupScriptFor', { name: roleName(current, t), platform: platformName(current.profile, t) }), spellcheck: false }" :auto-size="{ minRows: 12, maxRows: 22 }" :disabled="disabled" @update:model-value="writeScript" />
        <p class="delivery-help">{{ t('networkDelivery.scriptHelp') }}</p>
        <a-collapse class="delivery-members" :bordered="false" :default-active-key="['members']"><a-collapse-item key="members" :header="t('networkDelivery.groupMembers', { count: current.targets.length })"><div class="delivery-member-list"><div v-for="target in current.targets" :key="target.deviceId" class="delivery-member"><div class="delivery-identity"><strong>{{ deviceName(target.device) }}</strong><span>{{ target.device.ip }}</span></div><span class="delivery-member-mode" :class="{ 'delivery-missing': target.needsReview }">{{ t(target.needsReview ? 'networkDelivery.reviewNeeded' : target.individual ? 'networkDelivery.individualScript' : 'networkDelivery.inheritedScript') }}</span><a-button type="text" :disabled="disabled" @click="adjust(target)">{{ t(target.individual ? 'common.edit' : 'networkDelivery.adjustDevice') }}</a-button></div></div></a-collapse-item></a-collapse>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNarrowScreen } from '@/composables/useNarrowScreen'
import type { DraftTarget } from '@/types/network-delivery'
import { vInputLabel } from '../shared/input-label'
import { deviceName, scriptLines } from './form'
import { buildGroups, type ScriptGroup } from './groups'
import { platformName, roleName } from './inventory'

defineOptions({ name: 'DeliveryScripts' })
const props = defineProps<{ targets: DraftTarget[], scripts: Record<string, string>, disabled: boolean, review?: boolean }>()
const emit = defineEmits<{ groupScript: [key: string, script: string], individual: [target: DraftTarget, value: boolean], targetScript: [target: DraftTarget, script: string] }>()
const { t } = useI18n()
const narrow = useNarrowScreen()
const groups = computed(() => buildGroups(props.targets))
const activeKey = ref('')
const targetId = ref<number>()
const current = computed(() => groups.value.find(group => group.key === activeKey.value))
const selectedTarget = computed(() => current.value?.targets.find(target => target.deviceId === targetId.value))
const individualCount = computed(() => current.value?.targets.filter(target => target.individual).length || 0)
const missing = (group: ScriptGroup) => group.targets.filter(target => target.needsReview || !scriptLines(target.script)).length
watch(groups, () => { if (!current.value) activeKey.value = groups.value[0]?.key || '' }, { immediate: true })
watch([activeKey, () => props.review], () => { targetId.value = props.review ? current.value?.targets[0]?.deviceId : undefined }, { immediate: true })
function writeScript(value: string) { if (selectedTarget.value) emit('targetScript', selectedTarget.value, value); else if (current.value) emit('groupScript', current.value.key, value) }
function adjust(target: DraftTarget) { emit('individual', target, true); targetId.value = target.deviceId }
function restore(target: DraftTarget) { emit('individual', target, false); targetId.value = undefined }
</script>
