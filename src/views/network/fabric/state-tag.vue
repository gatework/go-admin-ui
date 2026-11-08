<template><a-tag :color="stateColor(value)">{{ te(`networkFabric.states.${value}`) ? t(`networkFabric.states.${value}`) : value || t('networkFabric.states.unknown') }}</a-tag></template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { stateColor } from './presentation'
defineProps<{ value: string }>()
const { t, te } = useI18n()
</script>
