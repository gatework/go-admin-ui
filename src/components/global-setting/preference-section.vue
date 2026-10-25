<template>
  <section class="preference-section">
    <header class="preference-section__header">
      <h3>{{ title }}</h3>
      <p v-if="description">{{ description }}</p>
    </header>
    <slot />
  </section>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    title: string;
    description?: string;
  }>(),
  { description: '' }
)
</script>
