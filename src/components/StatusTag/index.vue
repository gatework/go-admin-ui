<template><a-tag :color="tone" class="status-tag">{{ label }}</a-tag></template>

<script setup lang="ts">
/**
 * A state value shown as a translated, coloured tag.
 *
 * Each module keeps its own vocabulary under `<namespace>.<value>` and its own
 * tone mapping; this owns the parts that must not drift between them -- an
 * untranslated value still shows as itself, an empty one as the module's
 * `unknown`, and the tag always carries words, never colour alone.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'StatusTag' })
const props = withDefaults(defineProps<{
  value?: string
  /** i18n prefix holding one key per state, e.g. `networkFabric.states`. */
  namespace: string
  /** Arco tag colour for a value. */
  tone: (value: string) => string
}>(), { value: '' })
const { t, te } = useI18n()
const label = computed(() => {
  const key = `${props.namespace}.${props.value || 'unknown'}`
  return te(key) ? t(key) : props.value || '—'
})
const tone = computed(() => props.tone(props.value || 'unknown'))
</script>
