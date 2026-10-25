<template>
  <div :class="{ hidden }" class="pagination-container">
    <a-pagination :current="page" :page-size="limit" :page-size-options="pageSizes" :total="total" show-total show-page-size show-jumper v-bind="$attrs" @change="changePage" @page-size-change="changeSize" />
  </div>
</template>

<script setup lang="ts">
import { scrollTo } from '@/utils/scroll-to'
defineOptions({ name: 'PaginationComponent', inheritAttrs: false })
const props = withDefaults(defineProps<{ total: number, page?: number, limit?: number, pageSizes?: number[], autoScroll?: boolean, hidden?: boolean }>(), {
  page: 1, limit: 20, pageSizes: () => [10, 20, 30, 50], autoScroll: true, hidden: false
})
const emit = defineEmits<{ 'update:page': [value: number], 'update:limit': [value: number], pagination: [value: { page: number, limit: number }] }>()
const changePage = (page: number) => {
  emit('update:page', page)
  emit('pagination', { page, limit: props.limit })
  if (props.autoScroll) scrollTo(0, 800, () => {})
}
const changeSize = (limit: number) => {
  emit('update:limit', limit)
  emit('update:page', 1)
  emit('pagination', { page: 1, limit })
  if (props.autoScroll) scrollTo(0, 800, () => {})
}
</script>

<style scoped>
.pagination-container {
  /* No background of its own: it lives inside a card that already has one, and
     painting the same token again produced a visible band whenever the two
     resolved differently -- which they do the moment a page puts the table on
     any other surface. */
  padding: 14px 4px 4px;
}
.pagination-container.hidden {
  display: none;
}
</style>
