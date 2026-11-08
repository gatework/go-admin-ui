<template><a-tag :color="colors[value] || 'gray'">{{ te(`networkWireless.states.${value}`) ? t(`networkWireless.states.${value}`) : value || t('networkWireless.states.unknown') }}</a-tag></template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { colors } from './presentation'
defineProps<{ value: string }>()
const { t, te } = useI18n()
</script>
