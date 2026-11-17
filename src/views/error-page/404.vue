<template>
  <main class="not-found">
    <a-result status="404" :title="$t('errorPage.title')" :subtitle="$t('errorPage.recovery')">
      <template #extra>
        <a-button type="primary" @click="$router.replace('/')">{{ $t('errorPage.home') }}</a-button>
      </template>
    </a-result>
  </main>
</template>

<script setup lang="ts">
defineOptions({ name: 'Page404' })
</script>

<style scoped>
.not-found {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: var(--motor-space-5);
  background: var(--motor-app-bg);
}
</style>
