<template>
  <a-select v-model="model" :placeholder="placeholder ?? $t('common.selectPlaceholder')" allow-clear>
    <a-option v-for="option in options" :key="option.value" :value="option.value" :label="option.label" />
  </a-select>
</template>

<script setup lang="ts">
/** A select whose options are a backend dictionary: `<DictSelect v-model="query.status" type="sys_normal_disable" />`. */
import { useDict } from '@/composables/useDict'

defineOptions({ name: 'DictSelect' })
const props = defineProps<{
  /** `dict_type` of the dictionary to offer. */
  type: string
  placeholder?: string
}>()
const model = defineModel<string | number>()
// Fixed for the component's lifetime: a dictionary type is not something a field switches between.
const options = useDict(props.type)[props.type]
</script>
