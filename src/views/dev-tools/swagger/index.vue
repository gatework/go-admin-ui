<template>
  <PageContainer card class="swagger-page">
    <a-spin :loading="loading" class="swagger-page__spin">
      <iframe class="swagger-page__frame" :src="src" :title="$t('route.swagger')" @load="loading = false" />
    </a-spin>
  </PageContainer>
</template>

<script setup lang="ts">
/** The backend's own API reference, embedded. It is served by the backend, so it needs no CDN. */
import { ref } from 'vue'
import PageContainer from '@/components/PageContainer/index.vue'

defineOptions({ name: 'Swagger' })

const src = `${process.env.VUE_APP_BASE_API}/swagger/admin/index.html`
const loading = ref(true)
</script>

<style lang="scss" scoped>
// Fills what the shell leaves: viewport minus header, tabs, and the page gutter and card padding.
.swagger-page__spin { display: block; width: 100%; }

.swagger-page__frame {
  display: block;
  width: 100%;
  height: calc(100vh - var(--motor-header-height) - var(--motor-tabs-height) - 80px);
  border: 0;
}
</style>
