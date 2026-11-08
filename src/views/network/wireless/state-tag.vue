<template><StatusTag :value="value" namespace="networkWireless.states" :tone="state => colors[state] || 'gray'" /></template>
<script setup lang="ts">
import StatusTag from '@/components/StatusTag/index.vue'
import { colors } from './presentation'
defineProps<{ value: string }>()
</script>
