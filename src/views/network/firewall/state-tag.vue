<template><StatusTag :value="value" namespace="networkFirewall.states" :tone="stateTone" /></template>
<script setup lang="ts">
import StatusTag from '@/components/StatusTag/index.vue'
import { stateTone } from './presentation'
defineProps<{ value: string }>()
</script>
