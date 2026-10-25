<template>
  <a-tag :color="color">{{ method }}</a-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * An HTTP method as a coloured tag.
 *
 * The colour is part of how the method reads at a glance -- red for DELETE is
 * the point -- so it belongs with the tag rather than in each page.
 *
 * The menu page's permission popover and the operation log's method column both
 * use it. sys-api has the same mapping written as four stacked `v-if` tags; it
 * is still Options API and gets this when it migrates.
 */

defineOptions({ name: 'MethodTag' })

const props = defineProps<{ method?: string }>()

type TagType = 'arcoblue' | 'green' | 'orange' | 'red'

const COLOURS: Record<string, TagType> = {
  GET: 'arcoblue',
  POST: 'green',
  PUT: 'orange',
  DELETE: 'red'
}

// PATCH, HEAD and anything else fall back rather than passing el-tag an empty
// string, which is not a legal `type` and warns on every render
const color = computed<TagType>(() => COLOURS[props.method?.toUpperCase() ?? ''] ?? 'arcoblue')
</script>
