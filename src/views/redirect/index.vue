<template>
  <div />
</template>

<script setup lang="ts">
/**
 * A stop on the way back to the same page.
 *
 * Refreshing a tab drops its cached instance and routes here; replacing this
 * route with the original path makes vue-router build the page afresh, which a
 * push to the URL already on screen would not do.
 */
import { useRoute, useRouter } from 'vue-router'

defineOptions({ name: 'RedirectPage' })

const { params, query } = useRoute()
const path = Array.isArray(params.path) ? params.path.join('/') : params.path
void useRouter().replace({ path: '/' + path, query })
</script>
