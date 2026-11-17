<template>
  <a-tag :color="color">{{ label }}</a-tag>
</template>

<script setup lang="ts">
/**
 * A dictionary value shown as a coloured tag.
 *
 *   <DictTag type="sys_normal_disable" :value="row.status" :tones="STATUS_TONES" />
 *
 * `tones` maps a value to an Arco tag colour; a value it does not list is grey,
 * so a state added on the backend shows up neutral rather than borrowing
 * another state's colour.
 */
import { computed } from 'vue'
import { dictLabel, useDict } from '@/composables/useDict'
import { display } from '@/utils/format'

defineOptions({ name: 'DictTag' })
const props = withDefaults(defineProps<{
  type: string
  value?: string | number | null
  tones?: Record<string, string>
}>(), { value: undefined, tones: () => ({}) })

const options = useDict(props.type)[props.type]
const label = computed(() => display(dictLabel(options.value, props.value)))
const color = computed(() => props.tones[String(props.value)] ?? 'gray')
</script>
