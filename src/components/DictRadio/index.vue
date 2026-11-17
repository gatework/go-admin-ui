<template>
  <a-radio-group v-model="model">
    <a-radio v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</a-radio>
  </a-radio-group>
</template>

<script setup lang="ts">
/** A radio group whose options are a backend dictionary. */
import { useDict } from '@/composables/useDict'

defineOptions({ name: 'DictRadio' })
const props = defineProps<{ type: string }>()
const model = defineModel<string | number>()
const options = useDict(props.type)[props.type]
</script>
