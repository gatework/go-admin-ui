<template><a-tag
  :color="color"
>{{ te(`networkFirewall.states.${value}`) ? t(`networkFirewall.states.${value}`) : value }}</a-tag></template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
const props = defineProps<{ value: string }>(); const { t, te } = useI18n()
const color = computed(() => ['allowed', 'verified', 'succeeded', 'ready', 'complete'].includes(props.value) ? 'green' : ['failed', 'denied', 'invalid'].includes(props.value) ? 'red' : ['running', 'queued'].includes(props.value) ? 'blue' : 'orange')
</script>
