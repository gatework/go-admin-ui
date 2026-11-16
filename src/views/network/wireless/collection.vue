<template>
  <a-form :model="draft" layout="vertical" @submit-success="submit">
    <a-alert>{{ t('networkWireless.collectHint') }}</a-alert>
    <a-form-item :label="t('networkWireless.dimensions')" class="wireless-form-gap"><a-checkbox-group v-model="draft.dimensions" :disabled="pending"><a-space direction="vertical"><a-checkbox v-for="dimension in controller.supportedDimensions" :key="dimension" :value="dimension">{{ t(`networkWireless.dimension.${dimension}`) }}</a-checkbox></a-space></a-checkbox-group></a-form-item>
    <template v-if="draft.dimensions.includes('lldp')"><p class="wireless-muted">{{ t('networkWireless.selectAPHelp') }}</p><a-form-item :label="t('networkWireless.selectedAPs')"><a-select v-model="draft.apNames" multiple allow-search :filter-option="false" :disabled="pending" :loading="searching" :options="options" :aria-label="t('networkWireless.selectedAPs')" @search="search" /></a-form-item></template>
    <p v-else class="wireless-muted">{{ t('networkWireless.controllerScope') }}</p>
    <a-button type="primary" html-type="submit" :loading="pending" :disabled="!valid || !active">{{ t('networkWireless.collect') }}</a-button>
  </a-form>
</template>
<script setup lang="ts">
defineOptions({ name: 'WirelessCollection' })
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { addCollection, listResource } from '@/api/network/wireless'
import type { Collection, Controller, Suggestion } from '@/types/network-wireless'
import { useSession } from './session'
const props = defineProps<{ controller: Controller, suggestion?: Suggestion }>()
const emit = defineEmits<{ created: [job: Collection] }>()
const { t } = useI18n()
const { run, pending, active } = useSession()
const draft = reactive<Suggestion>({ dimensions: [...(props.suggestion?.dimensions || props.controller.defaultDimensions)].filter(d => props.controller.supportedDimensions.includes(d)), apNames: [...(props.suggestion?.apNames || [])] })
const options = ref<{ value: string, label: string }[]>(draft.apNames.map(name => ({ value: name, label: name })))
const searching = ref(false)
let requestKey = crypto.randomUUID()
let abort: AbortController | undefined
let searchVersion = 0
const valid = computed(() => draft.dimensions.length > 0 && (!draft.dimensions.includes('lldp') || draft.apNames.length > 0))
watch(() => JSON.stringify(draft), () => { requestKey = crypto.randomUUID(); if (!draft.dimensions.includes('lldp')) draft.apNames = [] })
async function search(keyword = '') { abort?.abort(); abort = new AbortController(); const version = ++searchVersion; searching.value = true; try { const response = await listResource(props.controller.device.id, 'access-points', { pageIndex: 1, pageSize: 200, keyword }, abort.signal); if (version === searchVersion && active.value) { const names = new Set([...draft.apNames, ...response.data.list.filter(r => !r.missing).map(r => r.fields.name)]); options.value = [...names].filter(Boolean).map(name => ({ value: name, label: name })) } } catch { /* request interceptor */ } finally { if (version === searchVersion) searching.value = false } }
async function submit() { if (!valid.value) return; try { const response = await run(signal => addCollection(props.controller.device.id, { requestKey, dimensions: [...draft.dimensions], apNames: draft.dimensions.includes('lldp') ? [...draft.apNames] : [] }, signal)); if (response) emit('created', response.data) } catch { /* retain request key for safe retry */ } }
onMounted(() => { void search() }); onBeforeUnmount(() => { searchVersion++; abort?.abort() })
</script>
