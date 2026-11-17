<template>
  <a-spin v-if="slice.loading && !slice.data" class="panel-state" />
  <a-empty v-else-if="slice.failed && !slice.data" class="panel-state" :description="$t('dashboard.unavailable')"><template #image><icon-exclamation-circle /></template></a-empty>
  <a-empty v-else-if="empty" class="panel-state" :description="emptyText" />
  <slot v-else />
</template>

<script setup lang="ts">
/** What an overview panel shows instead of its rows: loading, unreachable, or nothing yet. */
import type { Slice } from './use-overview'

defineProps<{ slice: Slice<unknown>, empty: boolean, emptyText: string }>()
</script>

<style scoped>
.panel-state { display: flex; min-height: 160px; align-items: center; justify-content: center; }
</style>
