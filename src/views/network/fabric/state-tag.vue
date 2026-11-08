<template><StatusTag :value="value" namespace="networkFabric.states" :tone="stateColor" /></template>
<script setup lang="ts">
import StatusTag from '@/components/StatusTag/index.vue'
import { stateColor } from './presentation'
defineProps<{ value: string }>()
</script>
